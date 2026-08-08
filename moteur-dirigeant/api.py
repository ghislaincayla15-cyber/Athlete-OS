"""Point d'entrée unique du moteur.

    from api import simuler
    sortie = simuler(contexte)
"""
from __future__ import annotations

from typing import Dict, Optional

from engine.modeles import Allocation, Contexte, Resultat
from engine.params import Referentiel
from engine.scenario import evaluer
from explain import alertes as mod_alertes
from explain import restitution as mod_restitution
from optimizer.marginal import comparer, optimiser, scenario_actuel


def simuler(ctx: Contexte, objectif: Optional[str] = None,
            objectifs_compares: Optional[list] = None) -> Dict[str, object]:
    ref = Referentiel(ctx.millesime)
    actuel = scenario_actuel(ctx, ref)
    sortie = optimiser(ctx, ref, objectif or ctx.objectifs.objectif_principal)
    optimal: Resultat = sortie["resultat"]

    autres = {}
    for o in (objectifs_compares or []):
        if o != sortie["objectif"]:
            autres[o] = optimiser(ctx, ref, o)["resultat"]

    scenarios = {"actuel": actuel, "optimise": optimal, **autres}
    return {
        "niveau_1_client": mod_restitution.niveau_client(actuel, optimal, sortie["objectif"]),
        "niveau_2_conseiller": {
            **mod_restitution.niveau_conseiller(ctx, scenarios),
            "chronologie": mod_restitution.chronologie(optimal, ctx),
            "alertes": mod_alertes.detecter(ctx, actuel, optimal, ref),
        },
        "niveau_3_expert": {
            "journal": mod_restitution.journal_de_decision(ctx, ref, sortie, actuel),
            "incertitude": mod_restitution.moteur_incertitude(ref, optimal),
        },
        "resultats": scenarios,
        "referentiel": ref,
    }
