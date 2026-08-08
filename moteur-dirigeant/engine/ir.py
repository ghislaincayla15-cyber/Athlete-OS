"""Impôt sur le revenu du foyer, contributions sur les hauts revenus.

Le moteur recalcule l'impôt du foyer entier : il n'applique jamais mécaniquement
un taux marginal (cahier des charges, § 11).
"""

from __future__ import annotations

from typing import Dict

from .modeles import Foyer
from .params import Referentiel


def abattement_10(revenu: float, ref: Referentiel) -> float:
    if revenu <= 0:
        return 0.0
    taux = float(ref.get("impot_revenu.abattement_salaires.taux"))
    plancher = float(ref.get("impot_revenu.abattement_salaires.plancher"))
    plafond = float(ref.get("impot_revenu.abattement_salaires.plafond"))
    return min(max(revenu * taux, min(plancher, revenu)), plafond)


def bareme(revenu_par_part: float, ref: Referentiel) -> float:
    impot, bas = 0.0, 0.0
    for tr in ref.get("impot_revenu.bareme.tranches"):
        haut = tr["plafond"]
        if haut is None:
            impot += max(0.0, revenu_par_part - bas) * float(tr["taux"])
            break
        assiette = max(0.0, min(revenu_par_part, float(haut)) - bas)
        impot += assiette * float(tr["taux"])
        bas = float(haut)
        if revenu_par_part <= bas:
            break
    return impot


def _impot_brut(revenu_imposable: float, parts: float, ref: Referentiel) -> float:
    return bareme(revenu_imposable / parts, ref) * parts


def impot_revenu(revenu_net_global: float, foyer: Foyer, ref: Referentiel,
                 revenus_capital_bareme: float = 0.0) -> Dict[str, float]:
    """Calcule l'IR du foyer avec quotient familial, plafonnement et décote."""
    base = max(0.0, revenu_net_global + revenus_capital_bareme)
    parts = foyer.nb_parts
    parts_base = 2.0 if foyer.situation == "couple" else 1.0

    brut_avec_parts = _impot_brut(base, parts, ref)
    brut_sans_enfants = _impot_brut(base, parts_base, ref)

    # plafonnement du quotient familial
    plafond_demi = float(ref.get("impot_revenu.quotient_familial.plafond_demi_part"))
    demi_parts_sup = (parts - parts_base) / 0.5
    avantage = brut_sans_enfants - brut_avec_parts
    if foyer.parent_isole and foyer.nb_enfants > 0:
        # Le premier enfant du parent isolé ouvre une part entière, plafonnée à
        # un montant spécifique ; les demi-parts suivantes au plafond de droit commun.
        couvertes = float(ref.get("impot_revenu.quotient_familial.demi_parts_couvertes_parent_isole"))
        plafond_isole = float(ref.get("impot_revenu.quotient_familial.plafond_part_entiere_parent_isole"))
        avantage_max = plafond_isole + plafond_demi * max(0.0, demi_parts_sup - couvertes)
    else:
        avantage_max = plafond_demi * demi_parts_sup
    plafonnement = max(0.0, avantage - avantage_max)
    impot_brut = brut_avec_parts + plafonnement

    # décote
    if foyer.situation == "couple":
        mont = float(ref.get("impot_revenu.decote.montant_couple"))
        seuil = float(ref.get("impot_revenu.decote.seuil_impot_brut_couple"))
    else:
        mont = float(ref.get("impot_revenu.decote.montant_celibataire"))
        seuil = float(ref.get("impot_revenu.decote.seuil_impot_brut_celibataire"))
    taux_decote = float(ref.get("impot_revenu.decote.taux"))
    decote = max(0.0, mont - taux_decote * impot_brut) if impot_brut < seuil else 0.0
    impot = max(0.0, impot_brut - decote)

    return {
        "revenu_imposable": base,
        "parts": parts,
        "impot_brut": impot_brut,
        "plafonnement_quotient": plafonnement,
        "decote": decote,
        "impot": impot,
        "taux_moyen": impot / base if base else 0.0,
    }


def taux_marginal(revenu_net_global: float, foyer: Foyer, ref: Referentiel) -> float:
    """TMI réel, mesuré sur 100 € supplémentaires (décote et plafonnement inclus)."""
    a = impot_revenu(revenu_net_global, foyer, ref)["impot"]
    b = impot_revenu(revenu_net_global + 100.0, foyer, ref)["impot"]
    return (b - a) / 100.0


def cehr(rfr: float, foyer: Foyer, ref: Referentiel) -> float:
    cle = "tranches_couple" if foyer.situation == "couple" else "tranches_celibataire"
    total = 0.0
    for tr in ref.get(f"impot_revenu.cehr.{cle}"):
        de = float(tr["de"])
        a = None if tr["a"] is None else float(tr["a"])
        assiette = max(0.0, (rfr if a is None else min(rfr, a)) - de)
        total += assiette * float(tr["taux"])
    return total


def cdhr(rfr_ajuste: float, ir: float, cehr_du: float, prelevements_liberatoires: float,
         foyer: Foyer, ref: Referentiel) -> Dict[str, float]:
    """Contribution différentielle sur les hauts revenus (art. 224 CGI)."""
    couple = foyer.situation == "couple"
    seuil = float(ref.get("impot_revenu.cdhr.seuil_couple" if couple else "impot_revenu.cdhr.seuil_celibataire"))
    if rfr_ajuste <= seuil:
        return {"cdhr": 0.0, "seuil": seuil, "applicable": False}

    taux = float(ref.get("impot_revenu.cdhr.taux_plancher"))
    abat_pac = float(ref.get("impot_revenu.cdhr.abattement_par_personne_a_charge")) * foyer.nb_enfants
    abat_couple = float(ref.get("impot_revenu.cdhr.abattement_imposition_commune")) if couple else 0.0
    impots_deja_payes = ir + cehr_du + prelevements_liberatoires + abat_pac + abat_couple
    contribution = max(0.0, taux * rfr_ajuste - impots_deja_payes)

    plafond_decote = float(ref.get(
        "impot_revenu.cdhr.plafond_decote_couple" if couple else "impot_revenu.cdhr.plafond_decote_celibataire"))
    reduction = 0.0
    if rfr_ajuste <= plafond_decote:
        lissage = float(ref.get("impot_revenu.cdhr.coefficient_lissage"))
        reduction = max(0.0, taux * rfr_ajuste - lissage * (rfr_ajuste - seuil))
    return {
        "cdhr": max(0.0, contribution - reduction),
        "avant_decote": contribution,
        "decote": reduction,
        "seuil": seuil,
        "applicable": True,
    }
