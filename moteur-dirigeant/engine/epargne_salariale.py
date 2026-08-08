"""Épargne salariale : PEE, PERECO, abondement, intéressement.

Le module raisonne en COÛT COLLECTIF : un dispositif d'épargne salariale est
par nature collectif. Le moteur ne fait jamais apparaître l'abondement ou
l'intéressement du dirigeant sans la charge correspondante pour les autres
bénéficiaires.
"""

from __future__ import annotations

from typing import Dict, List

from .modeles import Contexte
from .params import Referentiel


def plafonds(ctx: Contexte, ref: Referentiel, revenu_professionnel_n1: float) -> Dict[str, float]:
    pass_ = ref.pass_
    e = ctx.entreprise
    ab_pee = float(ref.get("epargne_salariale.pee.abondement_plafond_pct_pass")) * pass_
    ab_pereco = float(ref.get("epargne_salariale.pereco.abondement_plafond_pct_pass")) * pass_
    multiple = float(ref.get("epargne_salariale.pee.abondement_plafond_multiple_versement"))
    multiple_reglement = min(multiple, max(e.reglement_abondement_pee_pct, 0.0))
    multiple_reglement_pereco = min(multiple, max(e.reglement_abondement_pereco_pct, 0.0))

    taux_vv = float(ref.get("epargne_salariale.pee.taux_plafond_versement_volontaire"))
    plafond_versement = taux_vv * max(revenu_professionnel_n1, 0.0)
    if plafond_versement <= 0:
        plafond_versement = taux_vv * pass_  # référence en l'absence de rémunération

    inter_indiv = float(ref.get("epargne_salariale.interessement.plafond_individuel_pct_pass")) * pass_
    inter_global_taux = float(ref.get("epargne_salariale.interessement.taux_plafond_global"))

    return {
        "abondement_pee_max": ab_pee,
        "abondement_pereco_max": ab_pereco,
        "abondement_total_max": ab_pee + ab_pereco,
        "multiple_versement_pee": multiple_reglement,
        "multiple_versement_pereco": multiple_reglement_pereco,
        "versement_volontaire_max": plafond_versement,
        "interessement_individuel_max": inter_indiv,
        "interessement_taux_global": inter_global_taux,
    }


def enveloppe_interessement_max(ctx: Contexte, remuneration_dirigeant_imposable: float,
                                ref: Referentiel) -> float:
    """20 % du total des salaires bruts et de la rémunération du dirigeant."""
    taux = float(ref.get("epargne_salariale.interessement.taux_plafond_global"))
    return taux * (ctx.entreprise.masse_salariale + max(0.0, remuneration_dirigeant_imposable))


def part_dirigeant_interessement(ctx: Contexte, remuneration_dirigeant: float,
                                 mode: str = "proportionnel") -> float:
    """Quote-part du dirigeant dans l'enveloppe d'intéressement, selon la règle de répartition."""
    e = ctx.entreprise
    if mode == "uniforme":
        return 1.0 / max(1, e.nb_salaries + 1)
    total = e.masse_salariale + max(0.0, remuneration_dirigeant)
    return (max(0.0, remuneration_dirigeant) / total) if total > 0 else 0.0


def cout_et_valeur(ctx: Contexte, ref: Referentiel, abondement_pee: float, abondement_pereco: float,
                   interessement_dirigeant: float, enveloppe_interessement: float) -> Dict[str, float]:
    """Coût entreprise et valeur nette pour le dirigeant des flux d'épargne salariale."""
    e = ctx.entreprise
    effectif = e.nb_salaries

    fs = ref.get("epargne_salariale.forfait_social")
    seuil_ab = int(fs["seuil_effectif_abondement_participation"])
    seuil_int = int(fs["seuil_effectif_interessement"])
    taux_fs_abondement = 0.0 if effectif < seuil_ab else float(fs["taux_droit_commun"])
    taux_fs_interessement = 0.0 if effectif < seuil_int else float(fs["taux_droit_commun"])
    taux_csg = float(ref.get("epargne_salariale.csg_crds_sur_epargne_salariale.taux"))

    abondement_total_dirigeant = abondement_pee + abondement_pereco
    # Coût collectif : le règlement du plan est le même pour tous. Les autres
    # bénéficiaires sont abondés au même niveau que le dirigeant, pondéré par le
    # taux d'adhésion observé. La formule est continue : elle ne crée pas de
    # marche d'escalier qui rendrait le premier euro d'abondement prohibitif.
    abondement_salaries = (effectif * ctx.hypotheses.taux_adhesion_salaries
                           * abondement_total_dirigeant)
    cout_abondement = (abondement_total_dirigeant + abondement_salaries) * (1 + taux_fs_abondement)
    cout_interessement = enveloppe_interessement * (1 + taux_fs_interessement)

    net_abondement = abondement_total_dirigeant * (1 - taux_csg)
    net_interessement = interessement_dirigeant * (1 - taux_csg)

    return {
        "cout_entreprise": cout_abondement + cout_interessement,
        "cout_abondement_dirigeant": abondement_total_dirigeant * (1 + taux_fs_abondement),
        "cout_abondement_salaries": abondement_salaries * (1 + taux_fs_abondement),
        "cout_interessement_total": cout_interessement,
        "interessement_salaries": max(0.0, enveloppe_interessement - interessement_dirigeant),
        "forfait_social_abondement": (abondement_total_dirigeant + abondement_salaries) * taux_fs_abondement,
        "forfait_social_interessement": enveloppe_interessement * taux_fs_interessement,
        "csg_crds": (abondement_total_dirigeant + interessement_dirigeant) * taux_csg,
        "epargne_bloquee_pee": (abondement_pee + interessement_dirigeant) * (1 - taux_csg),
        "epargne_bloquee_pereco": abondement_pereco * (1 - taux_csg),
        "net_dirigeant": net_abondement + net_interessement,
        "taux_forfait_social_abondement": taux_fs_abondement,
        "taux_forfait_social_interessement": taux_fs_interessement,
    }


def controles(ctx: Contexte, ref: Referentiel, versement_pee: float, abondement_pee: float,
              versement_pereco: float, abondement_pereco: float,
              interessement_dirigeant: float, enveloppe_interessement: float,
              revenu_professionnel_n1: float) -> List[Dict[str, str]]:
    """Contrôles de cohérence bloquants (§ 38 du cahier des charges)."""
    p = plafonds(ctx, ref, revenu_professionnel_n1)
    out: List[Dict[str, str]] = []

    if abondement_pee > p["abondement_pee_max"] + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_PLAFOND_PEE",
                    "message": f"Abondement PEE de {abondement_pee:,.0f} € supérieur au plafond légal de "
                               f"{p['abondement_pee_max']:,.0f} € (8 % du PASS)."})
    if abondement_pee > versement_pee * p["multiple_versement_pee"] + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_MULTIPLE_PEE",
                    "message": f"Abondement PEE supérieur à {p['multiple_versement_pee']:.0f} fois le versement "
                               f"volontaire du bénéficiaire ({versement_pee:,.0f} €)."})
    if abondement_pereco > p["abondement_pereco_max"] + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_PLAFOND_PERECO",
                    "message": f"Abondement PERECO de {abondement_pereco:,.0f} € supérieur au plafond légal de "
                               f"{p['abondement_pereco_max']:,.0f} € (16 % du PASS)."})
    if abondement_pereco > versement_pereco * p["multiple_versement_pereco"] + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_MULTIPLE_PERECO",
                    "message": "Abondement PERECO supérieur au triple du versement volontaire du bénéficiaire."})
    if versement_pee + versement_pereco > p["versement_volontaire_max"] + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_PLAFOND_VERSEMENT",
                    "message": f"Versements volontaires supérieurs à 25 % du revenu professionnel de référence "
                               f"({p['versement_volontaire_max']:,.0f} €)."})
    if interessement_dirigeant > p["interessement_individuel_max"] + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_PLAFOND_INT_INDIV",
                    "message": f"Intéressement du dirigeant supérieur au plafond individuel de "
                               f"{p['interessement_individuel_max']:,.0f} € (75 % du PASS)."})
    max_env = enveloppe_interessement_max(ctx, revenu_professionnel_n1, ref)
    if enveloppe_interessement > max_env + 1e-6:
        out.append({"niveau": "erreur", "code": "ES_PLAFOND_INT_GLOBAL",
                    "message": f"Enveloppe d'intéressement supérieure à 20 % des rémunérations "
                               f"({max_env:,.0f} €)."})
    if enveloppe_interessement > 0 and not ctx.entreprise.accord_interessement:
        out.append({"niveau": "condition", "code": "ES_ACCORD_ABSENT",
                    "message": "Aucun accord d'intéressement en place : la stratégie est conditionnelle à la mise "
                               "en place et au dépôt d'un accord dans les délais légaux."})
    return out
