"""Tests de non-régression sur les défauts identifiés lors de la revue croisée.

Chaque test reproduit le scénario qui faisait échouer le moteur avant correction.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest

from engine.ir import impot_revenu
from engine.epargne_salariale import cout_et_valeur
from engine.modeles import (Allocation, Contexte, Dirigeant, Entreprise, Foyer, Hypotheses)
from engine.params import Referentiel
from engine.scenario import evaluer
from engine.social_assimile import brut_depuis_cout, cotisations_from_brut
from optimizer.marginal import optimiser, scenario_actuel

REF = Referentiel(2026)
PASS = REF.pass_


def _ctx(**kw):
    base = dict(hypotheses=Hypotheses(pas_optimisation=2000))
    base.update(kw)
    return Contexte(**base)


# --- 1. dividendes prélevés sur les réserves dans la situation actuelle -------

def test_situation_actuelle_reprend_les_dividendes_verses_sur_reserves():
    ctx = _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=400000, resultat_avant_remuneration=120000,
                              capital_social=30000, reserves_distribuables=500000,
                              nb_salaries=1, masse_salariale=30000),
        dirigeant=Dirigeant(remuneration_actuelle=60000, dividendes_actuels=200000),
        foyer=Foyer(situation="couple"),
    )
    r = scenario_actuel(ctx, REF)
    assert r.allocation.dividendes_bruts == pytest.approx(200000, abs=1.0)
    codes = {c["code"] for c in r.controles}
    assert "PRELEVEMENT_SUR_RESERVES" in codes


def test_optimiseur_peut_distribuer_les_reserves():
    ctx = _ctx(
        entreprise=Entreprise(forme="SARL", ca_ht=400000, resultat_avant_remuneration=100000,
                              capital_social=300000, reserves_distribuables=400000,
                              nb_salaries=1, masse_salariale=30000),
        dirigeant=Dirigeant(remuneration_actuelle=50000, dividendes_actuels=0),
        foyer=Foyer(situation="couple"),
    )
    r = optimiser(ctx, REF, "net_immediat")["resultat"]
    assert r.allocation.dividendes_bruts > 100000, "les réserves doivent être mobilisables"


# --- 2. revenus du capital extérieurs : imposés au PFU ------------------------

def test_capital_externe_impose_au_pfu():
    ctx = _ctx(
        entreprise=Entreprise(forme="SASU", ca_ht=100000, resultat_avant_remuneration=0, capital_social=1000),
        dirigeant=Dirigeant(fonction="president_sas", remuneration_actuelle=0),
        foyer=Foyer(situation="celibataire", revenus_capital_hors_scenario=200000),
    )
    r = evaluer(ctx, Allocation(), REF)
    attendu = 200000 * (1 - 0.128 - 0.186)
    assert r.net_immediat == pytest.approx(attendu, abs=1.0)


def test_capital_externe_impute_sur_la_cdhr():
    ctx = _ctx(
        entreprise=Entreprise(forme="SASU", ca_ht=100000, resultat_avant_remuneration=0, capital_social=1000),
        dirigeant=Dirigeant(fonction="president_sas", remuneration_actuelle=0),
        foyer=Foyer(situation="celibataire", revenus_capital_hors_scenario=300000),
    )
    r = evaluer(ctx, Allocation(), REF)
    # le PFU acquitté (38 400 €) doit être crédité : la CDHR résiduelle reste modeste
    assert r.cdhr < 5000, f"CDHR de {r.cdhr:,.0f} € : le PFU n'est pas imputé"


# --- 3. barème maladie : continuité, pas de falaise ---------------------------

def test_aucune_falaise_maladie_au_voisinage_de_3_pass():
    """Le voisinage de 3 PASS ne doit produire NI alerte de falaise NI dégradation.

    La « falaise » du référentiel 1.0.1 était un artefact : le taux de 6,5 % de
    l'art. D.621-1 CSS y était appliqué à la totalité de l'assiette au lieu de la
    seule fraction excédant 3 PASS. Le barème réel est continu : franchir le
    seuil ne peut pas faire gagner d'argent, et l'optimiseur n'a plus de raison
    de s'y coller.
    """
    ctx = _ctx(
        entreprise=Entreprise(forme="EURL", ca_ht=600000, resultat_avant_remuneration=260000,
                              capital_social=20000, nb_salaries=0),
        dirigeant=Dirigeant(remuneration_actuelle=195000),
        foyer=Foyer(situation="couple"),
    )
    r = evaluer(ctx, Allocation(cout_remuneration=195000), REF)
    ratio = r.detail["assiette_sociale_remuneration"] / PASS
    assert 2.7 <= ratio <= 3.4
    assert not any(a["code"] == "TNS_FALAISE_MALADIE" for a in r.alertes)
    assert r.robustesse == "A"


def test_net_du_dirigeant_croissant_au_franchissement_de_3_pass():
    """Un euro de coût en plus ne peut jamais produire plusieurs euros de net.

    C'est le test de non-régression le plus important du moteur : le barème
    erroné produisait exactement ce comportement aberrant.
    """
    ctx = _ctx(
        entreprise=Entreprise(forme="EURL", ca_ht=900000, resultat_avant_remuneration=400000,
                              capital_social=20000, nb_salaries=0),
        dirigeant=Dirigeant(remuneration_actuelle=200000),
        foyer=Foyer(situation="couple"),
    )
    precedent = None
    for cout in range(190000, 230001, 2000):
        r = evaluer(ctx, Allocation(cout_remuneration=float(cout)), REF)
        if precedent is not None:
            gain = r.remuneration_nette - precedent
            assert 0 <= gain <= 2000, f"net non monotone ou gain aberrant à {cout} € de coût"
        precedent = r.remuneration_nette


# --- 4. coût collectif de l'abondement PERECO ---------------------------------

def test_abondement_pereco_genere_un_cout_collectif():
    ctx = _ctx(entreprise=Entreprise(nb_salaries=10, masse_salariale=300000),
               hypotheses=Hypotheses(taux_adhesion_salaries=0.5))
    es = cout_et_valeur(ctx, REF, 0.0, 6000.0, 0.0, 0.0)
    assert es["cout_abondement_salaries"] == pytest.approx(10 * 0.5 * 6000)


def test_cout_collectif_continu_pas_de_marche_d_escalier():
    ctx = _ctx(entreprise=Entreprise(nb_salaries=20, masse_salariale=600000))
    petit = cout_et_valeur(ctx, REF, 100.0, 0.0, 0.0, 0.0)["cout_abondement_salaries"]
    grand = cout_et_valeur(ctx, REF, 2000.0, 0.0, 0.0, 0.0)["cout_abondement_salaries"]
    assert petit < grand
    assert petit == pytest.approx(20 * 0.30 * 100)


# --- 5. contrôle de conservation non tautologique -----------------------------

def test_decomposition_remuneration_est_verifiee():
    ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=400000, resultat_avant_remuneration=120000,
                                     capital_social=20000, nb_salaries=1, masse_salariale=30000),
               dirigeant=Dirigeant(remuneration_actuelle=80000), foyer=Foyer())
    r = evaluer(ctx, Allocation(cout_remuneration=80000), REF)
    c = next(x for x in r.controles if x["code"] == "DECOMPOSITION_REMUNERATION")
    assert c["niveau"] == "ok" and abs(c["ecart"]) < 0.51


def test_distribution_sans_resultat_ni_reserve_est_bloquee():
    ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=100000, resultat_avant_remuneration=0,
                                     capital_social=10000, reserves_distribuables=0, nb_salaries=1,
                                     masse_salariale=20000),
               dirigeant=Dirigeant(remuneration_actuelle=0), foyer=Foyer())
    r = evaluer(ctx, Allocation(dividendes_bruts=300000), REF)
    assert r.conformite == "impossible"


# --- 6. plafonnement du quotient familial du parent isolé ---------------------

def test_plafonnement_parent_isole():
    f_isole = Foyer(situation="celibataire", nb_enfants=1, parent_isole=True)
    r = impot_revenu(90000, f_isole, REF)
    plafond_isole = float(REF.get("impot_revenu.quotient_familial.plafond_part_entiere_parent_isole"))
    brut_seul = impot_revenu(90000, Foyer(situation="celibataire", nb_enfants=0), REF)["impot_brut"]
    avantage_effectif = brut_seul - r["impot_brut"]
    assert avantage_effectif == pytest.approx(plafond_isole, abs=1.0)


# --- 7. fiscalité différée assise sur la seule fraction déductible ------------

def test_fiscalite_differee_ignore_la_fraction_non_deductible():
    ctx = _ctx(entreprise=Entreprise(forme="SASU", ca_ht=300000, resultat_avant_remuneration=150000,
                                     capital_social=5000),
               dirigeant=Dirigeant(fonction="president_sas", remuneration_actuelle=100000),
               foyer=Foyer(situation="couple"))
    r = evaluer(ctx, Allocation(cout_remuneration=100000, versement_per_individuel=40000), REF)
    valo = r.detail["valorisation_per"]
    assert r.detail["per_non_deductible"] > 0
    # la base imposée au barème à la sortie est la seule fraction DÉDUITE
    assert valo["fraction_deductible"] == pytest.approx(r.detail["per_deductible"])
    assert valo["fraction_non_deductible"] == pytest.approx(r.detail["per_non_deductible"])
    # fiscalité de sortie = IR sur les versements déduits + PFU sur les plus-values
    taux_pfu = float(REF.get("capital.pfu.taux_global"))
    attendu = (r.detail["per_deductible"] * ctx.hypotheses.fiscalite_future_epargne_retraite
               + valo["plus_values"] * taux_pfu)
    assert r.detail["fiscalite_differee"] == pytest.approx(attendu)


def test_valorisation_epargne_symetrique_gains_credites():
    """Si la fiscalité de sortie est débitée, les gains qui la produisent doivent
    être crédités. Sans quoi l'optimiseur sous-alloue mécaniquement l'épargne."""
    ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=600000, resultat_avant_remuneration=200000,
                                     capital_social=30000, nb_salaries=3, masse_salariale=90000,
                                     pereco_existant=True),
               dirigeant=Dirigeant(remuneration_actuelle=80000), foyer=Foyer())
    r = evaluer(ctx, Allocation(cout_remuneration=80000, abondement_pereco=6000, versement_pereco=2000), REF)
    valo = r.detail["valorisation_epargne_salariale"]
    assert valo["prelevements_sociaux_sortie"] > 0
    assert valo["plus_values"] > 0
    # la valeur actuelle doit dépasser le nominal : le rendement (4 %) est très
    # supérieur au taux d'actualisation réel (1 %) sur l'horizon retenu.
    assert valo["valeur_actuelle"] > valo["capital"]


# --- 8. prélèvements sociaux de sortie de l'épargne salariale -----------------

def test_ps_sortie_epargne_salariale_appliques():
    ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=600000, resultat_avant_remuneration=200000,
                                     capital_social=30000, nb_salaries=3, masse_salariale=90000,
                                     pereco_existant=True),
               dirigeant=Dirigeant(remuneration_actuelle=80000), foyer=Foyer())
    r = evaluer(ctx, Allocation(cout_remuneration=80000, abondement_pereco=6000, versement_pereco=2000), REF)
    assert r.detail["ps_sortie_epargne_salariale"] > 0


# --- 9. discontinuité CET : l'écart est tracé, pas perdu ----------------------

def test_discontinuite_cet_tracee():
    brut = brut_depuis_cout(65740.35, REF, None, True, 2)
    reel = cotisations_from_brut(brut, REF, None, True, 2)[1]["cout_entreprise"]
    ctx = _ctx(entreprise=Entreprise(forme="SASU", ca_ht=300000, resultat_avant_remuneration=200000,
                                     capital_social=5000, nb_salaries=2, masse_salariale=60000),
               dirigeant=Dirigeant(fonction="president_sas", remuneration_actuelle=65740.35),
               foyer=Foyer())
    r = evaluer(ctx, Allocation(cout_remuneration=65740.35), REF)
    if abs(reel - 65740.35) > 0.51:
        assert any(c["code"] == "INVERSION_COUT_BRUT" for c in r.controles)
    # le coût retenu est le coût réellement engagé : conservation préservée
    assert r.cout_entreprise == pytest.approx(reel, abs=0.01)


# --- 10. paramètres réellement lus au référentiel ----------------------------

@pytest.mark.parametrize("chemin,nouvelle_valeur,effet", [
    ("epargne_salariale.forfait_social.seuil_effectif_abondement_participation", 1, "forfait"),
    ("impot_revenu.cdhr.coefficient_lissage", 0.5, "cdhr"),
    ("epargne_salariale.pee.taux_plafond_versement_volontaire", 0.5, "versement"),
])
def test_parametres_du_referentiel_ont_un_effet(chemin, nouvelle_valeur, effet):
    """Un paramètre déclaré au référentiel doit changer le résultat s'il change."""
    import copy
    ref2 = Referentiel(2026)
    noeud = ref2.data
    morceaux = chemin.split(".")
    for c in morceaux[:-1]:
        noeud = noeud[c]
    avant = noeud[morceaux[-1]]
    noeud[morceaux[-1]] = nouvelle_valeur
    # Chaque paramètre doit être testé sur un contexte où il MORD réellement :
    # un contexte générique laisse passer un paramètre devenu inerte.
    if effet == "cdhr":
        # RFR entre 250 000 € (déclenchement) et 330 000 € (plafond de décote) :
        # c'est la seule plage où le coefficient de lissage entre dans le calcul.
        ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=2000000, resultat_avant_remuneration=800000,
                                         capital_social=30000, nb_salaries=3, masse_salariale=90000,
                                         pee_existant=True),
                   dirigeant=Dirigeant(remuneration_actuelle=200000),
                   foyer=Foyer(situation="celibataire"))
        alloc = Allocation(cout_remuneration=200000, dividendes_bruts=200000)
    elif effet == "versement":
        # versement volontaire situé entre 25 % et 50 % du revenu N-1 : il crève
        # le plafond de droit commun mais pas le plafond doublé du test
        ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=600000, resultat_avant_remuneration=200000,
                                         capital_social=30000, nb_salaries=3, masse_salariale=90000,
                                         pee_existant=True),
                   dirigeant=Dirigeant(remuneration_actuelle=90000),
                   foyer=Foyer(situation="celibataire"))
        alloc = Allocation(cout_remuneration=90000, abondement_pee=3000, versement_pee=25000)
    else:
        ctx = _ctx(entreprise=Entreprise(forme="SARL", ca_ht=600000, resultat_avant_remuneration=200000,
                                         capital_social=30000, nb_salaries=3, masse_salariale=90000,
                                         pee_existant=True),
                   dirigeant=Dirigeant(remuneration_actuelle=90000),
                   foyer=Foyer(situation="celibataire"))
        alloc = Allocation(cout_remuneration=90000, abondement_pee=3000, versement_pee=1000,
                           dividendes_bruts=20000)
    try:
        a = evaluer(ctx, alloc, REF)
        b = evaluer(ctx, alloc, ref2)
        if effet == "forfait":
            # abaisser le seuil d'effectif rend le forfait social exigible
            assert b.cout_entreprise > a.cout_entreprise
        elif effet == "cdhr":
            # Le coefficient pilote la DÉCOTE. Dans cette plage la décote absorbe
            # entièrement la contribution, si bien que la CDHR due reste nulle :
            # c'est la décote qu'il faut observer, pas le montant final.
            da, db = a.detail["cdhr_detail"], b.detail["cdhr_detail"]
            assert da["applicable"] and da["decote"] > 0, "contexte mal calibré : décote non appliquée"
            # abaisser le lissage de 0,825 à 0,5 augmente mécaniquement la décote
            assert db["decote"] > da["decote"]
        elif effet == "versement":
            # le plafond de versement volontaire pilote un contrôle nominatif
            def _plafond_creve(res):
                return any(c.get("code") == "ES_PLAFOND_VERSEMENT" for c in res.controles)
            assert _plafond_creve(a), "contexte mal calibré : le plafond n'est pas crevé"
            assert not _plafond_creve(b), "doubler le plafond doit lever le contrôle"
        else:  # pragma: no cover - garde-fou : tout effet déclaré doit être testé
            raise AssertionError(f"effet non couvert par une assertion : {effet}")
    finally:
        noeud[morceaux[-1]] = avant
