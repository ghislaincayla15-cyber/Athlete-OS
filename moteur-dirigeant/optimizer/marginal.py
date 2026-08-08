"""Moteur d'optimisation marginale.

Pour chaque bloc d'euros disponible dans l'entreprise, le moteur teste toutes
les affectations juridiquement possibles et retient celle qui procure la
meilleure valeur marginale au regard de l'objectif choisi.

Aucun seuil n'est écrit à la main : les points de bascule émergent des règles
(plafonds d'abondement, seuil des 10 %, tranches de PASS, tranches d'IS et d'IR).
"""

from __future__ import annotations

from dataclasses import replace
from typing import Callable, Dict, List, Optional, Tuple

from engine.entreprise import impot_societes
from engine.epargne_salariale import (cout_et_valeur, enveloppe_interessement_max,
                                      part_dirigeant_interessement, plafonds)
from engine.modeles import Allocation, Contexte, Resultat
from engine.params import Referentiel
from engine.scenario import evaluer
from engine.statut import acces_epargne_salariale, qualifier

LEVIERS = ["remuneration", "abondement_pee", "abondement_pereco", "interessement", "dividendes", "tresorerie"]

_ATTR = {
    "remuneration": "remuneration",
    "abondement_pee": "abondement_pee",
    "abondement_pereco": "abondement_pereco",
    "interessement": "interessement",
    "dividendes": "e_dividendes",
    "tresorerie": "e_tresorerie",
}


# =============================================================================
# FONCTIONS OBJECTIF
# =============================================================================

def _score_multicritere(r: Resultat, ctx: Contexte) -> float:
    """Score multicritère, exprimé en euros de valeur pour le dirigeant.

    Toutes les composantes sont homogènes (des euros de valeur), de sorte que
    les pondérations expriment une préférence et non un changement d'unité.
    La trésorerie conservée dans la société est valorisée au coefficient
    d'extraction future affiché dans les hypothèses.
    """
    o, h = ctx.objectifs, ctx.hypotheses
    poids = {
        "liquidite": o.liquidite,
        "retraite": o.retraite,
        "protection": o.protection,
        "fiscalite": o.fiscalite,
        "capitalisation": o.capitalisation,
        "simplicite": o.simplicite,
        "robustesse": o.robustesse,
    }
    somme = sum(poids.values()) or 1.0
    treso_valorisee = max(0.0, r.tresorerie_residuelle) * h.coef_valeur_tresorerie_societe
    valeur_globale = r.valeur_globale or (r.valeur_patrimoniale + treso_valorisee)
    penalite_robustesse = {"A": 0.0, "B": 0.02, "C": 0.06, "D": 0.15, "E": 1.0}[r.robustesse]
    complexite = 0.0
    if r.allocation:
        complexite += 0.02 if r.allocation.interessement_enveloppe > 0 else 0.0
        complexite += 0.01 if (r.allocation.abondement_pee + r.allocation.abondement_pereco) > 0 else 0.0
    composantes = {
        "liquidite": r.net_immediat,   # la trésorerie de la société n'est pas de la liquidité personnelle
        "retraite": r.epargne_retraite + r.droits.valeur_actuelle_droits,
        "protection": r.droits.valeur_actuelle_droits,
        "fiscalite": valeur_globale,
        "capitalisation": r.epargne_bloquee + r.epargne_retraite + treso_valorisee,
        "simplicite": valeur_globale * (1 - complexite),
        "robustesse": valeur_globale * (1 - penalite_robustesse),
    }
    return sum(poids[k] * composantes[k] for k in poids) / somme


def objectif(nom: str) -> Callable[[Resultat, Contexte], float]:
    table = {
        "net_immediat": lambda r, c: r.net_immediat,
        "patrimoine_net": lambda r, c: r.valeur_globale,
        "patrimoine_personnel": lambda r, c: r.valeur_patrimoniale,
        "patrimoine_hors_droits": lambda r, c: r.valeur_patrimoniale_hors_droits,
        "cout_entreprise": lambda r, c: -r.cout_entreprise,
        "retraite": lambda r, c: r.epargne_retraite + r.droits.valeur_actuelle_droits,
        "impot_immediat": lambda r, c: -(r.impot_revenu + r.cehr + r.cdhr + r.impot_societes),
        "liquidite": lambda r, c: r.net_immediat + r.tresorerie_residuelle,
        "compromis": _score_multicritere,
    }
    return table.get(nom, _score_multicritere)


# =============================================================================
# CONSTRUCTION D'UNE ALLOCATION À PARTIR D'UN ÉTAT
# =============================================================================

class Etat:
    """Répartition de l'enveloppe entre leviers, en coût entreprise."""

    def __init__(self):
        self.remuneration = 0.0
        self.abondement_pee = 0.0
        self.abondement_pereco = 0.0
        self.interessement = 0.0
        self.e_dividendes = 0.0
        self.e_tresorerie = 0.0

    def copie(self) -> "Etat":
        n = Etat()
        n.__dict__.update(self.__dict__)
        return n

    def consomme(self) -> float:
        return (self.remuneration + self.abondement_pee + self.abondement_pereco
                + self.interessement + self.e_dividendes + self.e_tresorerie)


def _allocation(etat: Etat, ctx: Contexte, ref: Referentiel, versement_per: float = 0.0,
                option_bareme: bool = False) -> Allocation:
    p = plafonds(ctx, ref, 0.0)
    mult_pee = max(p["multiple_versement_pee"], 1e-9)
    mult_pereco = max(p["multiple_versement_pereco"], 1e-9)
    return Allocation(
        cout_remuneration=etat.remuneration,
        abondement_pee=etat.abondement_pee,
        versement_pee=etat.abondement_pee / mult_pee if etat.abondement_pee else 0.0,
        abondement_pereco=etat.abondement_pereco,
        versement_pereco=etat.abondement_pereco / mult_pereco if etat.abondement_pereco else 0.0,
        interessement_enveloppe=etat.interessement,
        versement_per_individuel=versement_per,
        dividendes_bruts=0.0,   # recalculé après IS
        option_bareme_dividendes=option_bareme,
    )


def _evaluer_etat(etat: Etat, ctx: Contexte, ref: Referentiel, versement_per: float = 0.0,
                  option_bareme: bool = False, dividendes_forces: Optional[float] = None) -> Resultat:
    alloc = _allocation(etat, ctx, ref, versement_per, option_bareme)
    # Le résultat net distribuable est calculé analytiquement (pas de double
    # évaluation) : charges déductibles -> résultat fiscal -> IS -> résultat net.
    part_dir = part_dirigeant_interessement(ctx, etat.remuneration)
    es = cout_et_valeur(ctx, ref, alloc.abondement_pee, alloc.abondement_pereco,
                        etat.interessement * part_dir, etat.interessement)
    charges = etat.remuneration + es["cout_entreprise"]
    resultat_fiscal = ctx.entreprise.resultat_avant_remuneration - charges
    net_societe = resultat_fiscal - impot_societes(resultat_fiscal, ctx.entreprise, ref)["is"]
    total_apres_is = etat.e_dividendes + etat.e_tresorerie
    ratio = etat.e_dividendes / total_apres_is if total_apres_is > 0 else 0.0
    if dividendes_forces is not None:
        dividendes = dividendes_forces
    else:
        # Le distribuable comprend le résultat de l'exercice ET les réserves
        # déclarées : sans cela, une société aux réserves accumulées ne se verrait
        # jamais proposer leur distribution.
        base_distribuable = max(0.0, net_societe) + max(0.0, ctx.entreprise.reserves_distribuables)
        dividendes = base_distribuable * ratio
    alloc = replace(alloc, dividendes_bruts=dividendes)
    return evaluer(ctx, alloc, ref)


# =============================================================================
# OPTIMISEUR
# =============================================================================

def optimiser(ctx: Contexte, ref: Referentiel, objectif_nom: Optional[str] = None,
              pas: Optional[float] = None, journal: bool = True) -> Dict[str, object]:
    obj_nom = objectif_nom or ctx.objectifs.objectif_principal
    fobj = objectif(obj_nom)
    pas = pas or ctx.hypotheses.pas_optimisation
    enveloppe = ctx.entreprise.resultat_avant_remuneration
    acces = acces_epargne_salariale(ctx, ref)
    q = qualifier(ctx)

    p = plafonds(ctx, ref, 0.0)
    # L'abondement reste proposable quand le plan n'existe pas encore : sa
    # création est un acte de droit commun, et la note de robustesse le signale
    # explicitement ("Plan à créer"). L'ancienne condition `pee_existant is not
    # None` portait sur un booléen toujours renseigné : elle ne filtrait rien.
    plafond_abondement_pee = p["abondement_pee_max"] if acces["eligible"] else 0.0
    plafond_abondement_pereco = p["abondement_pereco_max"] if acces["eligible"] else 0.0

    etat = Etat()
    etat.e_tresorerie = enveloppe
    courant = _evaluer_etat(etat, ctx, ref)
    trace: List[Dict[str, object]] = []
    exclus: List[Dict[str, str]] = []

    if not acces["eligible"]:
        exclus.append({"levier": "epargne_salariale", "motif": acces["motif"],
                       "fondement": acces["fondement"], "classement": "impossible"})

    n_blocs = int(enveloppe // pas)
    restant = enveloppe
    for i in range(n_blocs):
        if restant < pas:
            break
        meilleur, meilleur_score, meilleur_nom = None, fobj(courant, ctx), None
        for levier in LEVIERS:
            candidat = etat.copie()
            if levier == "remuneration":
                candidat.remuneration += pas
            elif levier == "abondement_pee":
                if candidat.abondement_pee + pas > plafond_abondement_pee:
                    continue
                candidat.abondement_pee += pas
            elif levier == "abondement_pereco":
                if candidat.abondement_pereco + pas > plafond_abondement_pereco:
                    continue
                candidat.abondement_pereco += pas
            elif levier == "interessement":
                if not acces["eligible"]:
                    continue
                maxi = enveloppe_interessement_max(ctx, candidat.remuneration, ref)
                if candidat.interessement + pas > maxi:
                    continue
                candidat.interessement += pas
            elif levier == "dividendes":
                candidat.e_dividendes += pas
            else:
                candidat.e_tresorerie += pas
            candidat.e_tresorerie -= pas
            if candidat.e_tresorerie < -1e-9:
                continue
            r = _evaluer_etat(candidat, ctx, ref)
            if r.conformite == "impossible":
                continue
            # Les versements personnels doivent être finançables : on refuse un
            # candidat dont le net immédiat devient négatif, sauf s'il ne dégrade
            # pas une situation déjà négative (cotisations minimales du TNS, par
            # exemple, dues même sans rémunération).
            if r.net_immediat < -1e-6 and r.net_immediat < courant.net_immediat - 1e-6:
                continue
            s = fobj(r, ctx)
            if meilleur is None or s > meilleur_score + 1e-9:
                meilleur, meilleur_score, meilleur_nom = candidat, s, levier
        if meilleur is None:
            break
        etat = meilleur
        courant = _evaluer_etat(etat, ctx, ref)
        restant -= pas
        if journal:
            trace.append({"bloc": i + 1, "de": round(i * pas), "a": round((i + 1) * pas),
                          "levier": meilleur_nom, "score": round(meilleur_score, 2),
                          "net_immediat": round(courant.net_immediat, 2),
                          "valeur_patrimoniale": round(courant.valeur_patrimoniale, 2)})

    # --- raffinement local : déplacements de blocs entre leviers ---------------
    # L'allocation gloutonne est myope. On la stabilise par des échanges de blocs
    # tant qu'un déplacement améliore l'objectif.
    ameliore = True
    tours = 0
    while ameliore and tours < 40:
        ameliore, tours = False, tours + 1
        base_score = fobj(courant, ctx)
        for source in LEVIERS:
            attr_src = _ATTR[source]
            if getattr(etat, attr_src) < pas - 1e-9:
                continue
            for cible in LEVIERS:
                if cible == source:
                    continue
                candidat = etat.copie()
                setattr(candidat, attr_src, getattr(candidat, attr_src) - pas)
                attr_cible = _ATTR[cible]
                nouvelle = getattr(candidat, attr_cible) + pas
                if cible == "abondement_pee" and nouvelle > plafond_abondement_pee:
                    continue
                if cible == "abondement_pereco" and nouvelle > plafond_abondement_pereco:
                    continue
                if cible == "interessement" and (not acces["eligible"]
                                                 or nouvelle > enveloppe_interessement_max(ctx, candidat.remuneration, ref)):
                    continue
                setattr(candidat, attr_cible, nouvelle)
                r = _evaluer_etat(candidat, ctx, ref)
                if r.conformite == "impossible":
                    continue
                if r.net_immediat < -1e-6 and r.net_immediat < courant.net_immediat - 1e-6:
                    continue
                s = fobj(r, ctx)
                if s > base_score + 1e-6:
                    etat, courant, base_score, ameliore = candidat, r, s, True

    # --- garde-fou : ne jamais proposer moins bon que la situation actuelle ----
    # Lorsqu'il se déclenche, l'allocation optimisée est ÉCARTÉE. Les affinages
    # suivants doivent donc repartir de la situation actuelle : les greffer sur
    # l'état rejeté réintroduisait par la bande l'allocation que ce garde-fou
    # venait d'écarter, et comparait un plafond PER calculé sur une rémunération
    # à un scénario qui en retenait une autre.
    actuel_ref = scenario_actuel(ctx, ref)
    garde_fou_actif = fobj(actuel_ref, ctx) > fobj(courant, ctx) + 1e-6
    if garde_fou_actif:
        courant = actuel_ref
        trace.append({"bloc": "GARDE-FOU", "levier": "situation_actuelle",
                      "commentaire": "Aucune réorganisation testée ne fait mieux que l'organisation existante."})

    def _base(versement_per: float = 0.0, option_bareme: bool = False) -> Resultat:
        """Réévalue la base retenue (état optimisé ou situation actuelle)."""
        if garde_fou_actif:
            return scenario_actuel(ctx, ref, versement_per=versement_per, option_bareme=option_bareme)
        return _evaluer_etat(etat, ctx, ref, versement_per=versement_per, option_bareme=option_bareme)

    # --- affinage du PER individuel (financé sur le net, pas sur l'enveloppe) --
    meilleur_per, meilleur_score = 0.0, fobj(courant, ctx)
    disponible_per = courant.detail["plafond_per"]["disponible"]
    borne = min(disponible_per, max(0.0, courant.net_immediat))
    v = pas
    while v <= borne + 1e-9:
        r = _base(versement_per=v)
        if r.net_immediat < -1e-6:
            break
        s = fobj(r, ctx)
        if s > meilleur_score + 1e-9:
            meilleur_score, meilleur_per = s, v
        v += pas
    if meilleur_per > 0:
        courant = _base(versement_per=meilleur_per)
        if journal:
            trace.append({"bloc": "PER", "levier": "per_individuel", "montant": meilleur_per,
                          "score": round(meilleur_score, 2)})

    # --- test de l'option pour le barème sur les dividendes -------------------
    # L'option est globale (art. 200 A) : elle emporte aussi les revenus du
    # capital du foyer extérieurs au scénario, ce que l'évaluation intègre.
    if courant.allocation and courant.allocation.dividendes_bruts > 0:
        alternative = _base(versement_per=meilleur_per, option_bareme=True)
        if fobj(alternative, ctx) > fobj(courant, ctx) + 1e-9:
            courant = alternative
            if journal:
                trace.append({"bloc": "OPTION", "levier": "bareme_dividendes",
                              "score": round(fobj(alternative, ctx), 2)})

    courant.libelle = f"Optimisé — {obj_nom}"
    return {
        "resultat": courant,
        "objectif": obj_nom,
        "qualification": q,
        "pas": pas,
        "trace": trace,
        "scenarios_exclus": exclus,
        "etat": etat.__dict__,
    }


def scenario_actuel(ctx: Contexte, ref: Referentiel, versement_per: float = 0.0,
                    option_bareme: bool = False) -> Resultat:
    """Reconstitue la situation existante du dirigeant, sans stratégie.

    Les dividendes réellement versés sont repris tels quels, y compris lorsqu'ils
    proviennent des réserves : les plafonner au résultat de l'exercice fausserait
    la base de comparaison affichée au client.

    `versement_per` et `option_bareme` permettent de greffer sur la situation
    actuelle les deux leviers qui ne consomment pas l'enveloppe de l'entreprise,
    lorsque le garde-fou a écarté toute réorganisation.
    """
    e, d = ctx.entreprise, ctx.dirigeant
    etat = Etat()
    etat.remuneration = d.remuneration_actuelle
    reste = max(0.0, e.resultat_avant_remuneration - d.remuneration_actuelle)
    etat.e_dividendes, etat.e_tresorerie = reste, 0.0
    provisoire = _evaluer_etat(etat, ctx, ref, dividendes_forces=0.0)
    distribuable = max(0.0, provisoire.resultat_net_societe) + max(0.0, e.reserves_distribuables)
    dividendes = min(max(0.0, d.dividendes_actuels), distribuable)
    r = _evaluer_etat(etat, ctx, ref, dividendes_forces=dividendes,
                      versement_per=versement_per, option_bareme=option_bareme)
    r.libelle = "Situation actuelle"
    return r


def comparer(ctx: Contexte, ref: Referentiel, objectifs_testes: Optional[List[str]] = None) -> Dict[str, object]:
    objectifs_testes = objectifs_testes or ["net_immediat", "patrimoine_net", "retraite", "compromis"]
    actuel = scenario_actuel(ctx, ref)
    resultats = {"actuel": actuel}
    traces = {}
    for o in objectifs_testes:
        sortie = optimiser(ctx, ref, o)
        resultats[o] = sortie["resultat"]
        traces[o] = sortie["trace"]
    return {"actuel": actuel, "scenarios": resultats, "traces": traces}
