"""Fiscalité de l'entreprise : impôt sur les sociétés et capacité distributive."""

from __future__ import annotations

from typing import Dict

from .modeles import Entreprise
from .params import Referentiel


def impot_societes(resultat_fiscal: float, e: Entreprise, ref: Referentiel) -> Dict[str, float]:
    if resultat_fiscal <= 0:
        return {"is": 0.0, "taux_reduit_applicable": False, "detail": [], "contribution_sociale": 0.0,
                "resultat_fiscal": resultat_fiscal, "taux_effectif": 0.0}

    taux_normal = float(ref.get("impot_societes.taux_normal"))
    taux_reduit = float(ref.get("impot_societes.taux_reduit"))
    plafond = float(ref.get("impot_societes.plafond_taux_reduit"))
    cond = ref.get("impot_societes.conditions_taux_reduit")

    eligible = (
        e.ca_ht <= float(cond["ca_ht_max"])
        and e.capital_libere
        and e.detention_personnes_physiques >= float(cond["detention_min_personnes_physiques"])
    )
    detail = []
    if eligible:
        base_reduite = min(resultat_fiscal, plafond)
        base_normale = max(0.0, resultat_fiscal - plafond)
        detail.append({"tranche": "taux réduit", "assiette": base_reduite, "taux": taux_reduit,
                       "montant": base_reduite * taux_reduit})
        if base_normale:
            detail.append({"tranche": "taux normal", "assiette": base_normale, "taux": taux_normal,
                           "montant": base_normale * taux_normal})
    else:
        detail.append({"tranche": "taux normal", "assiette": resultat_fiscal, "taux": taux_normal,
                       "montant": resultat_fiscal * taux_normal})

    is_du = sum(d["montant"] for d in detail)

    cs = ref.get("impot_societes.contribution_sociale")
    contribution = 0.0
    if e.ca_ht > float(cs["seuil_ca_ht"]) and is_du > float(cs["seuil_is_du"]):
        contribution = max(0.0, is_du - float(cs["abattement_sur_is"])) * float(cs["taux"])

    total = is_du + contribution
    return {
        "is": total,
        "is_hors_contribution": is_du,
        "contribution_sociale": contribution,
        "taux_reduit_applicable": eligible,
        "detail": detail,
        "resultat_fiscal": resultat_fiscal,
        "taux_effectif": total / resultat_fiscal,
    }


def capacite_distributive(resultat_net: float, e: Entreprise) -> float:
    """Bénéfice distribuable = résultat net de l'exercice + réserves distribuables."""
    return max(0.0, resultat_net) + max(0.0, e.reserves_distribuables)


def montant_reference_dividendes(e: Entreprise, detention: float) -> float:
    """Montant de référence du seuil de 10 % (art. L.136-3 II 2° et R.131-7 CSS).

    capital social libéré + primes d'émission, détenus par le dirigeant et ses
    proches, + solde MOYEN ANNUEL des comptes courants d'associés.
    """
    return (e.capital_social + e.primes_emission) * detention + e.compte_courant_associe_moyen
