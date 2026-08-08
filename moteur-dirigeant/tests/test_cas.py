"""Rejeu de la bibliothèque de cas : invariants structurels et conformité.

Ces tests ne figent pas des montants (ils dépendraient alors du référentiel et
casseraient à chaque mise à jour réglementaire légitime). Ils vérifient les
INVARIANTS que le moteur doit respecter quel que soit le millésime.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

from engine.params import Referentiel
from engine.statut import acces_epargne_salariale
from optimizer.marginal import optimiser, scenario_actuel
from tests.cases.bibliotheque import CAS

REF = Referentiel(2026)
IDS = sorted(CAS)


@pytest.mark.parametrize("cle", IDS)
def test_conservation_des_euros(cle):
    ctx = CAS[cle]
    for objectif in ("net_immediat", "patrimoine_net", "compromis"):
        r = optimiser(ctx, REF, objectif)["resultat"]
        for c in r.controles:
            if c["code"].startswith("CONSERVATION"):
                assert abs(c["ecart"]) < 0.51, f"{cle}/{objectif} : {c['message']}"


@pytest.mark.parametrize("cle", IDS)
def test_aucun_scenario_impossible_recommande(cle):
    r = optimiser(CAS[cle], REF, "compromis")["resultat"]
    assert r.conformite != "impossible"


@pytest.mark.parametrize("cle", IDS)
def test_plafonds_respectes(cle):
    ctx = CAS[cle]
    r = optimiser(ctx, REF, "patrimoine_net")["resultat"]
    a = r.allocation
    pass_ = REF.pass_
    assert a.abondement_pee <= 0.08 * pass_ + 1e-6
    assert a.abondement_pereco <= 0.16 * pass_ + 1e-6
    assert a.abondement_pee <= 3 * a.versement_pee + 1e-6
    assert a.abondement_pereco <= 3 * a.versement_pereco + 1e-6
    assert a.versement_per_individuel <= r.detail["plafond_per"]["disponible"] + 1e-6


@pytest.mark.parametrize("cle", IDS)
def test_epargne_salariale_exclue_si_pas_de_salarie(cle):
    ctx = CAS[cle]
    acces = acces_epargne_salariale(ctx, REF)
    r = optimiser(ctx, REF, "patrimoine_net")["resultat"]
    if not acces["eligible"]:
        a = r.allocation
        assert a.abondement_pee == 0 and a.abondement_pereco == 0 and a.interessement_enveloppe == 0


@pytest.mark.parametrize("cle", IDS)
def test_optimisation_au_moins_aussi_bonne_que_l_existant(cle):
    ctx = CAS[cle]
    actuel = scenario_actuel(ctx, REF)
    for objectif, mesure in (("net_immediat", lambda r: r.net_immediat),
                             ("patrimoine_net", lambda r: r.valeur_globale)):
        r = optimiser(ctx, REF, objectif)["resultat"]
        assert mesure(r) >= mesure(actuel) - 1e-6, f"{cle}/{objectif}"


@pytest.mark.parametrize("cle", IDS)
def test_net_immediat_finançable(cle):
    r = optimiser(CAS[cle], REF, "compromis")["resultat"]
    assert r.net_immediat >= -0.51


@pytest.mark.parametrize("cle", IDS)
def test_seuil_10_pourcent_applique_aux_tns(cle):
    ctx = CAS[cle]
    if ctx.entreprise.forme.upper() not in ("SARL", "EURL"):
        return
    if ctx.dirigeant.detention <= 0.5:
        return
    r = optimiser(ctx, REF, "net_immediat")["resultat"]
    if r.allocation.dividendes_bruts > 0:
        rep = r.detail["seuil_10_dividendes"]
        attendu = 0.10 * ((ctx.entreprise.capital_social + ctx.entreprise.primes_emission)
                          * ctx.dirigeant.detention + ctx.entreprise.compte_courant_associe_moyen)
        assert rep["seuil"] == pytest.approx(attendu)


@pytest.mark.parametrize("cle", IDS)
def test_journal_de_decision_complet(cle):
    from api import simuler
    sortie = simuler(CAS[cle], "compromis")
    j = sortie["niveau_3_expert"]["journal"]
    assert j["regles_appliquees"], "aucune règle tracée"
    assert j["version_referentiel"]
    assert "trace_optimisation" in j
    actions = sortie["niveau_1_client"]["actions"]
    assert isinstance(actions, list) and actions, "aucune action restituée au client"
    for action in actions:
        assert isinstance(action, str) and action.strip(), "action vide"
