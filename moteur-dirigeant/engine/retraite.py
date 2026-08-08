"""Droits retraite acquis et leur valorisation.

Deux sorties systématiquement distinctes :
  - les droits BRUTS (trimestres, points, rente annuelle) : données issues des
    règles des régimes ;
  - la VALEUR ACTUELLE monétisée : elle repose sur des hypothèses actuarielles
    qui ne sont pas réglementaires et qui sont affichées à chaque restitution.

Garde-fou du cahier des charges : ne jamais considérer qu'une cotisation
au-delà de 1 PASS est dépourvue de droits. La retraite complémentaire (RCI,
Agirc-Arrco) reste contributive au-delà du PASS.
"""

from __future__ import annotations

from typing import Dict

from .modeles import Contexte, Droits
from .params import Referentiel, tranche


def _facteur_rente(ctx: Contexte, ref: Referentiel) -> float:
    h = ref.get("retraite.hypotheses_valorisation")
    n = int(h["duree_service_rente_annees"])
    i = float(h["taux_actualisation_reel"])
    if i == 0:
        return float(n)
    return (1 - (1 + i) ** (-n)) / i


def droits_tns(assiette: float, cotisation_rci: float, ctx: Contexte, ref: Referentiel) -> Droits:
    pass_ = ref.pass_
    seuil_trim = float(ref.get("references.trimestre_retraite.valeur_2026"))
    trimestres = min(4.0, assiette // seuil_trim) if seuil_trim else 0.0

    taux_plein = float(ref.get("retraite.base_regime_general_et_independants.taux_plein"))
    n_annees = int(ref.get("retraite.base_regime_general_et_independants.nb_annees_salaire_annuel_moyen"))
    rente_base = min(assiette, pass_) * taux_plein / n_annees

    va = float(ref.get("retraite.rci.valeur_achat_point"))
    vs = float(ref.get("retraite.rci.valeur_service_point"))
    points = cotisation_rci / va if va else 0.0
    rente_comp = points * vs

    return _finaliser(trimestres, 0.0, points, rente_base, rente_comp, ctx, ref)


def droits_assimile(brut: float, ctx: Contexte, ref: Referentiel) -> Droits:
    pass_ = ref.pass_
    seuil_trim = float(ref.get("references.trimestre_retraite.valeur_2026"))
    trimestres = min(4.0, brut // seuil_trim) if seuil_trim else 0.0

    taux_plein = float(ref.get("retraite.base_regime_general_et_independants.taux_plein"))
    n_annees = int(ref.get("retraite.base_regime_general_et_independants.nb_annees_salaire_annuel_moyen"))
    rente_base = min(brut, pass_) * taux_plein / n_annees

    va = float(ref.get("retraite.agirc_arrco.valeur_achat_point"))
    vs = float(ref.get("retraite.agirc_arrco.valeur_service_point"))
    t1 = float(ref.get("retraite.agirc_arrco.taux_contractuel_t1"))
    t2 = float(ref.get("retraite.agirc_arrco.taux_contractuel_t2"))
    cotisation_generatrice = min(brut, pass_) * t1 + tranche(brut, pass_, 8 * pass_) * t2
    points = cotisation_generatrice / va if va else 0.0
    rente_comp = points * vs

    return _finaliser(trimestres, points, 0.0, rente_base, rente_comp, ctx, ref)


def _finaliser(trimestres, points_aa, points_rci, rente_base, rente_comp, ctx, ref) -> Droits:
    facteur = _facteur_rente(ctx, ref)
    taux_impot = float(ref.get("retraite.hypotheses_valorisation.taux_imposition_rente_a_la_retraite"))
    valeur = (rente_base + rente_comp) * facteur * (1 - taux_impot)
    return Droits(
        trimestres=float(trimestres),
        points_agirc_arrco=points_aa,
        points_rci=points_rci,
        rente_base_annuelle=rente_base,
        rente_complementaire_annuelle=rente_comp,
        valeur_actuelle_droits=valeur,
    )
