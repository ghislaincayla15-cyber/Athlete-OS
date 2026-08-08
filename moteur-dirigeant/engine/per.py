"""PER individuel : plafonds de déduction et valorisation.

Garde-fou du cahier des charges : un versement PER produit un REPORT
d'imposition, pas un gain sec. Le moteur valorise donc toujours l'épargne
retraite nette de la fiscalité de sortie estimée, et n'appelle jamais « gain »
l'économie d'impôt immédiate prise isolément.
"""

from __future__ import annotations

from typing import Dict

from .modeles import Contexte
from .params import Referentiel


def plafond(ctx: Contexte, ref: Referentiel, statut_social: str,
            revenu_professionnel_n: float, revenu_professionnel_n1: float) -> Dict[str, float]:
    pass_n = ref.pass_
    pass_n1 = ref.pass_annee(ctx.millesime - 1)

    # plafond de droit commun (salariés et assimilés) — assis sur N-1
    t_sal = float(ref.get("per_individuel.plafond_salarie.taux"))
    p_sal = float(ref.get("per_individuel.plafond_salarie.plafond_pass"))
    tp_sal = float(ref.get("per_individuel.plafond_salarie.taux_plancher"))
    plafond_salarie = max(t_sal * min(revenu_professionnel_n1, p_sal * pass_n1), tp_sal * pass_n1)

    # plafond spécifique TNS (art. 154 bis CGI) — assis sur N
    t_base = float(ref.get("per_individuel.plafond_tns.taux_base"))
    t_maj = float(ref.get("per_individuel.plafond_tns.taux_majore"))
    p_tns = float(ref.get("per_individuel.plafond_tns.plafond_pass"))
    tp_tns = float(ref.get("per_individuel.plafond_tns.taux_plancher"))
    benefice = max(0.0, revenu_professionnel_n)
    plafonne = min(benefice, p_tns * pass_n)
    plafond_tns = max(t_base * plafonne + t_maj * max(0.0, plafonne - pass_n), tp_tns * pass_n)

    retenu = plafond_tns if statut_social == "TNS" else plafond_salarie
    disponible = retenu + max(0.0, ctx.foyer.plafond_per_reporte) - max(0.0, ctx.foyer.per_deja_verse)

    ref.get("per_individuel.plafond_tns.formule")
    ref.get("per_individuel.plafond_salarie.formule")
    return {
        "plafond_salarie": plafond_salarie,
        "plafond_tns": plafond_tns,
        "plafond_retenu": retenu,
        "report_anterieur": max(0.0, ctx.foyer.plafond_per_reporte),
        "deja_verse": max(0.0, ctx.foyer.per_deja_verse),
        "disponible": max(0.0, disponible),
    }


def valorisation_sortie(capital_verse: float, ctx: Contexte, ref: Referentiel,
                        fraction_deductible: float | None = None) -> Dict[str, float]:
    """Valeur nette estimée à l'horizon, puis ramenée en valeur d'aujourd'hui.

    Seule la fraction DÉDUITE à l'entrée est imposée au barème à la sortie : la
    fraction versée au-delà du plafond n'a procuré aucune économie d'impôt et
    ressort en franchise. Les plus-values supportent le PFU dans les deux cas.

    La valeur actuelle est obtenue en actualisant la valeur nette d'horizon au
    taux d'actualisation réel du référentiel. C'est ce qui rend la comparaison
    homogène avec le net immédiat : on ne peut pas débiter une fiscalité future
    sans créditer les revenus futurs qui la produisent.
    """
    h = ctx.hypotheses
    n = max(0, int(h.horizon_annees))
    deductible = capital_verse if fraction_deductible is None else max(0.0, min(fraction_deductible, capital_verse))
    non_deductible = capital_verse - deductible

    valeur_brute = capital_verse * ((1 + h.rendement_epargne) ** n)
    plus_values = max(0.0, valeur_brute - capital_verse)

    # part versements déduits : barème IR catégorie pensions, sans abattement de 10 %
    taux_ir_sortie = h.fiscalite_future_epargne_retraite
    # part plus-values : PFU
    taux_pfu = float(ref.get("capital.pfu.taux_global"))
    taux_actualisation = float(ref.get("retraite.hypotheses_valorisation.taux_actualisation_reel"))

    fiscalite = deductible * taux_ir_sortie + plus_values * taux_pfu
    net = valeur_brute - fiscalite
    valeur_actuelle = net / ((1 + taux_actualisation) ** n)
    return {
        "capital_verse": capital_verse,
        "fraction_deductible": deductible,
        "fraction_non_deductible": non_deductible,
        "valeur_brute_horizon": valeur_brute,
        "plus_values": plus_values,
        "fiscalite_sortie_estimee": fiscalite,
        "valeur_nette_horizon": net,
        "valeur_actuelle": valeur_actuelle,
        "hypotheses": {
            "rendement": h.rendement_epargne,
            "horizon": n,
            "taux_ir_sortie_versements_deduits": taux_ir_sortie,
            "taux_pfu_plus_values": taux_pfu,
            "taux_actualisation_reel": taux_actualisation,
        },
    }


def valorisation_epargne_salariale(capital: float, ctx: Contexte, ref: Referentiel) -> Dict[str, float]:
    """Valeur actuelle d'une épargne salariale bloquée.

    Symétrique du PER : le capital est capitalisé au rendement d'hypothèse, les
    prélèvements sociaux de sortie frappent les seules plus-values, et le net
    d'horizon est actualisé. L'IR ne s'applique pas (exonération).
    """
    h = ctx.hypotheses
    n = max(0, int(h.horizon_annees))
    taux_ps = float(ref.get("epargne_salariale.prelevements_sociaux_sortie.taux_2026"))
    taux_actualisation = float(ref.get("retraite.hypotheses_valorisation.taux_actualisation_reel"))

    valeur_brute = capital * ((1 + h.rendement_epargne) ** n)
    plus_values = max(0.0, valeur_brute - capital)
    ps_sortie = plus_values * taux_ps
    net = valeur_brute - ps_sortie
    return {
        "capital": capital,
        "valeur_brute_horizon": valeur_brute,
        "plus_values": plus_values,
        "prelevements_sociaux_sortie": ps_sortie,
        "valeur_nette_horizon": net,
        "valeur_actuelle": net / ((1 + taux_actualisation) ** n),
    }
