"""Restitution à trois niveaux de lecture (§ 32) et journal de décision (§ 30)."""

from __future__ import annotations

import datetime as _dt
from typing import Dict, List

from engine.modeles import Contexte, Resultat
from engine.params import Referentiel


def _eur(x: float) -> str:
    return f"{x:,.0f} €".replace(",", " ")


# =============================================================================
# NIVEAU 1 — CLIENT
# =============================================================================

def niveau_client(actuel: Resultat, optimise: Resultat, objectif: str) -> Dict[str, object]:
    libelles = {
        "net_immediat": "maximiser le revenu disponible immédiat",
        "patrimoine_net": "maximiser le patrimoine à horizon",
        "retraite": "maximiser les droits et l'épargne retraite",
        "compromis": "obtenir le meilleur compromis entre revenu, retraite, fiscalité et robustesse",
        "impot_immediat": "limiter l'impôt immédiat",
        "liquidite": "conserver de la liquidité",
    }
    gain_net = optimise.net_immediat - actuel.net_immediat
    gain_patrimoine = optimise.valeur_globale - actuel.valeur_globale
    a = optimise.allocation
    actions = []
    if a:
        if abs(a.cout_remuneration - (actuel.allocation.cout_remuneration if actuel.allocation else 0)) > 500:
            actions.append(f"Porter le coût de la rémunération à {_eur(a.cout_remuneration)} par an.")
        if a.abondement_pee > 0:
            actions.append(f"Verser {_eur(a.versement_pee)} sur le PEE pour déclencher {_eur(a.abondement_pee)} d'abondement.")
        if a.abondement_pereco > 0:
            actions.append(f"Verser {_eur(a.versement_pereco)} sur le PERECO pour déclencher {_eur(a.abondement_pereco)} d'abondement.")
        if a.interessement_enveloppe > 0:
            actions.append(f"Mettre en place un intéressement, enveloppe de {_eur(a.interessement_enveloppe)}.")
        if a.versement_per_individuel > 0:
            actions.append(f"Verser {_eur(a.versement_per_individuel)} sur le PER individuel.")
        if a.dividendes_bruts > 0:
            actions.append(f"Distribuer {_eur(a.dividendes_bruts)} de dividendes.")
        if optimise.tresorerie_residuelle > 0:
            actions.append(f"Conserver {_eur(optimise.tresorerie_residuelle)} de trésorerie dans la société.")
    if gain_patrimoine >= 0:
        phrase = (
            f"À enveloppe économique identique, cette organisation crée {_eur(gain_patrimoine)} de valeur "
            f"globale supplémentaire par an. Le revenu immédiatement disponible passe de "
            f"{_eur(actuel.net_immediat)} à {_eur(optimise.net_immediat)}."
        )
    else:
        phrase = (
            f"Cette organisation ne crée pas de valeur globale supplémentaire par rapport à l'organisation "
            f"actuelle (écart de {_eur(gain_patrimoine)}). Elle réoriente la répartition entre revenu immédiat, "
            f"épargne et trésorerie conformément à l'objectif retenu : le revenu immédiatement disponible passe "
            f"de {_eur(actuel.net_immediat)} à {_eur(optimise.net_immediat)}."
        )
    return {
        "recommandation": optimise.libelle,
        "objectif": f"Stratégie optimale pour {libelles.get(objectif, objectif)}.",
        "gain_net_immediat": gain_net,
        "gain_valeur_patrimoniale": gain_patrimoine,
        "phrase": phrase,
        "robustesse": optimise.robustesse,
        "actions": actions,
        "avertissement": "Les montants sont annuels et reposent sur les hypothèses affichées au niveau conseiller.",
    }


# =============================================================================
# NIVEAU 2 — CONSEILLER
# =============================================================================

def niveau_conseiller(ctx: Contexte, scenarios: Dict[str, Resultat]) -> Dict[str, object]:
    lignes = []
    for cle, r in scenarios.items():
        lignes.append({
            "scenario": r.libelle or cle,
            "cout_entreprise": r.cout_entreprise,
            "impot_societes": r.impot_societes,
            "cotisations_professionnelles": r.cotisations_totales,
            "prelevements_sociaux_capital": r.prelevements_sociaux_capital,
            "impot_revenu": r.impot_revenu,
            "cehr": r.cehr,
            "cdhr": r.cdhr,
            "net_immediat": r.net_immediat,
            "epargne_bloquee": r.epargne_bloquee,
            "epargne_retraite": r.epargne_retraite,
            "trimestres": r.droits.trimestres,
            "rente_annuelle_acquise": r.droits.rente_base_annuelle + r.droits.rente_complementaire_annuelle,
            "valeur_droits_sociaux": r.droits.valeur_actuelle_droits,
            "tresorerie_residuelle": r.tresorerie_residuelle,
            "valeur_patrimoniale": r.valeur_patrimoniale,
            "robustesse": r.robustesse,
            "conformite": r.conformite,
        })
    return {
        "tableau": lignes,
        "hypotheses": ctx.hypotheses.__dict__,
        "objectifs": ctx.objectifs.__dict__,
    }


def chronologie(optimise: Resultat, ctx: Contexte) -> List[Dict[str, str]]:
    a = optimise.allocation
    etapes: List[Dict[str, str]] = []
    if a and a.interessement_enveloppe > 0:
        etapes += [
            {"ordre": "1", "action": "Vérifier l'éligibilité : au moins un salarié, moins de 250, et un salarié distinct du dirigeant.",
             "responsable": "Conseiller", "document": "Registre du personnel, DSN", "preuve": "Copie du registre"},
            {"ordre": "2", "action": "Rédiger l'accord d'intéressement : formule aléatoire, période de calcul, règle de répartition, durée de 1 à 5 ans.",
             "responsable": "Conseil / expert-comptable", "document": "Projet d'accord", "preuve": "Accord signé"},
            {"ordre": "3", "action": "Déposer l'accord sur TéléAccords dans le délai légal — l'exonération sociale est conditionnée au dépôt.",
             "responsable": "Entreprise", "document": "Récépissé de dépôt", "preuve": "Récépissé"},
        ]
    if a and (a.abondement_pee > 0 or a.abondement_pereco > 0):
        etapes += [
            {"ordre": str(len(etapes) + 1), "action": "Mettre en place le règlement de plan (PEE et/ou PERECO) et choisir le teneur de compte.",
             "responsable": "Entreprise", "document": "Règlement de plan", "preuve": "Règlement daté et déposé"},
            {"ordre": str(len(etapes) + 2), "action": "Informer l'ensemble des bénéficiaires — le caractère collectif est une condition de fond.",
             "responsable": "Entreprise", "document": "Note d'information", "preuve": "Accusé de réception"},
            {"ordre": str(len(etapes) + 3), "action": f"Effectuer les versements volontaires ({_eur(a.versement_pee + a.versement_pereco)}) puis déclencher l'abondement.",
             "responsable": "Dirigeant", "document": "Bulletins de versement", "preuve": "Relevés du teneur de compte"},
        ]
    if a and a.versement_per_individuel > 0:
        etapes.append({"ordre": str(len(etapes) + 1),
                       "action": f"Verser {_eur(a.versement_per_individuel)} sur le PER individuel avant le 31 décembre.",
                       "responsable": "Dirigeant", "document": "Bulletin de versement",
                       "preuve": "Attestation fiscale de l'assureur"})
    if a and a.dividendes_bruts > 0:
        etapes.append({"ordre": str(len(etapes) + 1),
                       "action": f"Faire approuver la distribution de {_eur(a.dividendes_bruts)} en assemblée, après approbation des comptes.",
                       "responsable": "Associés", "document": "PV d'assemblée générale",
                       "preuve": "PV enregistré, feuille de présence"})
    etapes.append({"ordre": str(len(etapes) + 1),
                   "action": "Archiver l'ensemble des justificatifs et la présente simulation dans le dossier client.",
                   "responsable": "Conseiller", "document": "Journal de décision", "preuve": "Export PDF horodaté"})
    return etapes


# =============================================================================
# NIVEAU 3 — EXPERT / AUDIT
# =============================================================================

def journal_de_decision(ctx: Contexte, ref: Referentiel, sortie: Dict[str, object],
                        actuel: Resultat) -> Dict[str, object]:
    r: Resultat = sortie["resultat"]
    return {
        "horodatage": _dt.datetime.now().isoformat(timespec="seconds"),
        "millesime_referentiel": ref.millesime,
        "version_referentiel": ref.get("meta.version_referentiel"),
        "derniere_verification": ref.get("meta.last_verified"),
        "donnees_utilisees": {
            "entreprise": ctx.entreprise.__dict__,
            "dirigeant": ctx.dirigeant.__dict__,
            "foyer": {**ctx.foyer.__dict__, "nb_parts": ctx.foyer.nb_parts},
        },
        "hypotheses": ctx.hypotheses.__dict__,
        "objectif": sortie["objectif"],
        "qualification": sortie["qualification"],
        "regles_appliquees": ref.regles_utilisees(),
        "regles_a_confiance_limitee": ref.alertes_confiance(),
        "scenarios_exclus": sortie["scenarios_exclus"],
        "trace_optimisation": sortie["trace"],
        "controles": r.controles,
        "recommandation": r.libelle,
        "validation_humaine": None,
        "anatomie_cotisations": [l.__dict__ for l in r.cotisations],
        "comparaison_impot": {
            "sans_strategie": actuel.impot_revenu + actuel.cehr + actuel.cdhr,
            "avec_strategie": r.impot_revenu + r.cehr + r.cdhr,
            "fiscalite_differee": r.detail.get("fiscalite_differee", 0.0),
        },
    }


def moteur_incertitude(ref: Referentiel, r: Resultat) -> Dict[str, object]:
    """Détermine si le moteur doit refuser de conclure automatiquement (§ 29)."""
    limites = ref.alertes_confiance()
    bloquants = [x for x in limites if x["confidence"] == "low"]
    # Seuils de matérialité : convention de cabinet, pas règle de droit. Ils
    # vivent au référentiel (section politique_cabinet) pour rester auditables.
    seuil_cout = float(ref.get("politique_cabinet.materialite.ecart_valeur_significatif_eur"))
    seuil_valeur = float(ref.get("politique_cabinet.materialite.ecart_valeur_majeur_eur"))
    materiel = r.cout_entreprise > seuil_cout or abs(r.valeur_patrimoniale) > seuil_valeur
    doit_bloquer = bool(bloquants) and materiel
    return {
        "conclusion_automatique_possible": not doit_bloquer and r.conformite != "impossible" and r.robustesse in ("A", "B", "C"),
        "regles_a_confirmer": limites,
        "motifs": (
            ([f"Règle {b['rule_id']} de confiance faible mobilisée sur un montant matériellement important."
              for b in bloquants] if materiel else [])
            + (["Scénario juridiquement impossible en l'état."] if r.conformite == "impossible" else [])
            + (["Score de robustesse D ou E : ne pas automatiser, validation humaine requise."]
               if r.robustesse in ("D", "E") else [])
        ),
        "message": ("Le moteur peut conclure sous réserve des points de vigilance listés."
                    if not doit_bloquer else
                    "Le moteur ne peut pas conclure automatiquement : validation humaine requise."),
    }
