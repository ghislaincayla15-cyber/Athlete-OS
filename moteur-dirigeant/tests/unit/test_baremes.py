"""Tests unitaires des barèmes : valeurs calculées à la main à partir du référentiel."""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

import pytest

from engine.ir import abattement_10, bareme, cehr, impot_revenu
from engine.entreprise import impot_societes
from engine.modeles import Entreprise, Foyer
from engine.params import Referentiel, bareme_progressif_taux_unique
from engine.social_tns import assiette_unique, cotisation_maladie, cotisations

REF = Referentiel(2026)
PASS = 48060.0


# --- assiette sociale unique -------------------------------------------------

def test_abattement_26_pourcent():
    a = assiette_unique(100000, REF)
    assert a["abattement_retenu"] == pytest.approx(26000)
    assert a["assiette"] == pytest.approx(74000)


def test_abattement_plancher():
    # revenu très faible : l'abattement ne peut pas descendre sous 1,76 % du PASS
    a = assiette_unique(2000, REF)
    assert a["abattement_retenu"] == pytest.approx(0.0176 * PASS, rel=1e-9)


def test_abattement_plafond():
    # au-delà de 5 PASS de revenu brut, l'abattement est plafonné à 130 % du PASS
    a = assiette_unique(400000, REF)
    assert a["abattement_retenu"] == pytest.approx(1.30 * PASS, rel=1e-9)
    assert a["assiette"] == pytest.approx(400000 - 1.30 * PASS)


# --- barème progressif à taux unique -----------------------------------------

def test_maladie_taux_nul_sous_20_pct_pass():
    assert cotisation_maladie(0.10 * PASS, REF)["montant"] == 0.0


def test_maladie_interpolation_milieu_de_tranche():
    # milieu de la tranche 40 %-60 % : taux réduit attendu (1,5 % + 4 %) / 2,
    # appliqué à la TOTALITÉ de l'assiette (art. D.621-2 CSS).
    a = 0.50 * PASS
    d = cotisation_maladie(a, REF)
    assert d["taux_moyen"] == pytest.approx((0.015 + 0.040) / 2)
    assert d["montant"] == pytest.approx(a * (0.015 + 0.040) / 2)


def test_maladie_taux_marginal_reduit_au_dela_de_3_pass():
    """Art. D.621-1 : 8,50 % jusqu'à 3 PASS, 6,50 % sur la seule fraction au-delà.

    Attendu recalculé à la main, sans réutiliser la formule du moteur.
    """
    a = 3.5 * PASS
    attendu = 3 * PASS * 0.085 + 0.5 * PASS * 0.065
    assert cotisation_maladie(a, REF)["montant"] == pytest.approx(attendu)
    # le taux MOYEN reste très au-dessus de 6,5 % : le 6,5 % est marginal
    assert cotisation_maladie(a, REF)["taux_moyen"] > 0.08


def test_maladie_continue_en_3_pass():
    """Le barème se raccorde exactement à 3 PASS : continu en niveau.

    Le taux MARGINAL, lui, chute (de 10,9 % à 6,5 %) : sous 3 PASS, un euro de
    plus relève le taux réduit appliqué à toute l'assiette, ce qui rend le coût
    marginal supérieur au taux affiché. C'est un coude, pas une falaise : la
    cotisation ne baisse jamais.
    """
    gauche = cotisation_maladie(3 * PASS - 1.0, REF)["montant"]
    pivot = cotisation_maladie(3 * PASS, REF)["montant"]
    droite = cotisation_maladie(3 * PASS + 1.0, REF)["montant"]
    assert pivot == pytest.approx(0.085 * 3 * PASS)
    # marginal à gauche : taux de base 8,5 % + effet de pente 3 x 0,008
    assert pivot - gauche == pytest.approx(0.085 + 3 * 0.008, abs=1e-3)
    # marginal à droite : le taux de la fraction excédentaire, et lui seul
    assert droite - pivot == pytest.approx(0.065, abs=1e-3)
    # continuité en niveau : pas de saut au franchissement
    assert abs(droite - gauche) < 1.0


def test_maladie_strictement_croissante_sur_tout_le_domaine():
    """Garde-fou anti-régression : une « falaise » ferait échouer ce test.

    La version 1.0.1 du référentiel appliquait le taux de 6,5 % à la totalité de
    l'assiette au-delà de 3 PASS, ce qui faisait CHUTER la cotisation de plus de
    2 800 € au franchissement du seuil et poussait l'optimiseur à s'y coller.
    """
    precedent = -1.0
    for i in range(0, 801):
        montant = cotisation_maladie(i * PASS / 100, REF)["montant"]
        assert montant >= precedent - 1e-9, f"cotisation décroissante à {i / 100:.2f} PASS"
        precedent = montant


def test_allocations_familiales_nulles_sous_110_pct_pass():
    bar = REF.get("social_tns.allocations_familiales.bareme_pct_pass")
    assert bareme_progressif_taux_unique(1.0 * PASS, bar, PASS) == 0.0
    assert bareme_progressif_taux_unique(1.5 * PASS, bar, PASS) == pytest.approx(0.031)


# --- retraite complémentaire : la contributivité ne s'arrête pas à 1 PASS ------

def test_rci_cotise_au_dela_du_pass():
    _, r = cotisations(200000, REF)
    assert r["cotisation_rci"] > 0
    # abattement = 26 % x 200 000 = 52 000 (sous le plafond de 130 % du PASS)
    # assiette = 148 000 -> T1 1 PASS à 8,1 % puis 9,1 % jusqu'à 4 PASS
    assiette = 200000 - 0.26 * 200000
    attendu = PASS * 0.081 + (assiette - PASS) * 0.091
    assert r["cotisation_rci"] == pytest.approx(attendu, rel=1e-6)


def test_rci_plafonnee_a_4_pass():
    _, r = cotisations(1000000, REF)
    attendu = PASS * 0.081 + 3 * PASS * 0.091
    assert r["cotisation_rci"] == pytest.approx(attendu, rel=1e-6)


# --- impôt sur le revenu ------------------------------------------------------

def test_bareme_ir_premiere_tranche():
    assert bareme(11600, REF) == pytest.approx(0.0)
    assert bareme(20000, REF) == pytest.approx((20000 - 11600) * 0.11)


def test_bareme_ir_tranche_a_45():
    r = ((29579 - 11600) * 0.11 + (84577 - 29579) * 0.30
         + (181917 - 84577) * 0.41 + (200000 - 181917) * 0.45)
    assert bareme(200000, REF) == pytest.approx(r)


def test_abattement_10_plafonne():
    assert abattement_10(200000, REF) == pytest.approx(14555)
    assert abattement_10(3000, REF) == pytest.approx(509)
    assert abattement_10(300, REF) == pytest.approx(300)


def test_plafonnement_quotient_familial():
    f = Foyer(situation="couple", nb_enfants=2)
    r = impot_revenu(150000, f, REF)
    assert r["parts"] == 3.0
    assert r["plafonnement_quotient"] > 0  # l'avantage dépasse 2 x 1 807 €


def test_decote_couple():
    f = Foyer(situation="couple", nb_enfants=0)
    r = impot_revenu(32000, f, REF)
    assert r["decote"] > 0
    assert r["impot"] == pytest.approx(max(0.0, r["impot_brut"] - r["decote"]))


def test_cehr_couple():
    f = Foyer(situation="couple")
    assert cehr(400000, f, REF) == 0.0
    assert cehr(700000, f, REF) == pytest.approx((700000 - 500000) * 0.03)
    assert cehr(1200000, f, REF) == pytest.approx(500000 * 0.03 + 200000 * 0.04)


# --- impôt sur les sociétés ---------------------------------------------------

def test_is_taux_reduit_puis_normal():
    e = Entreprise(ca_ht=800000, capital_libere=True, detention_personnes_physiques=1.0)
    r = impot_societes(100000, e, REF)
    assert r["taux_reduit_applicable"] is True
    assert r["is"] == pytest.approx(42500 * 0.15 + 57500 * 0.25)


def test_is_taux_normal_si_ca_trop_eleve():
    e = Entreprise(ca_ht=12000000)
    r = impot_societes(100000, e, REF)
    assert r["taux_reduit_applicable"] is False
    assert r["is"] == pytest.approx(25000)


def test_is_nul_si_deficit():
    e = Entreprise(ca_ht=500000)
    assert impot_societes(-20000, e, REF)["is"] == 0.0
