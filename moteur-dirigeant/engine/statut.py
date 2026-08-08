"""Qualification automatique du statut social et fiscal du dirigeant.

La qualification précède tout calcul et doit être explicite et justifiée
(cahier des charges, § 5).
"""

from __future__ import annotations

from typing import Dict

from .modeles import Contexte

TNS = "TNS"
ASSIMILE = "ASSIMILE_SALARIE"


def qualifier(ctx: Contexte) -> Dict[str, str]:
    e, d = ctx.entreprise, ctx.dirigeant
    forme = e.forme.upper()
    fonction = d.fonction

    if forme in ("EI",):
        return {
            "statut_social": TNS,
            "regime_fiscal_remuneration": "BIC_BNC",
            "justification": "Entrepreneur individuel : affiliation de plein droit au régime des travailleurs indépendants.",
            "fondement": "Art. L.611-1 CSS",
        }

    if forme in ("SARL", "EURL"):
        if fonction == "gerant_majoritaire" or d.detention > 0.50:
            return {
                "statut_social": TNS,
                "regime_fiscal_remuneration": "ART_62",
                "justification": (
                    f"Gérant détenant {d.detention:.0%} des parts (seuil de majorité apprécié en tenant compte "
                    "des parts du conjoint, du partenaire pacsé, des enfants mineurs et du collège de gérance) : "
                    "travailleur non salarié."
                ),
                "fondement": "Art. L.611-1 6° CSS ; art. 62 CGI pour l'imposition de la rémunération",
            }
        return {
            "statut_social": ASSIMILE,
            "regime_fiscal_remuneration": "TRAITEMENTS_SALAIRES",
            "justification": f"Gérant non majoritaire ({d.detention:.0%}) : assimilé salarié au regard de la sécurité sociale.",
            "fondement": "Art. L.311-3 11° CSS",
        }

    if forme in ("SAS", "SASU"):
        return {
            "statut_social": ASSIMILE,
            "regime_fiscal_remuneration": "TRAITEMENTS_SALAIRES",
            "justification": "Président de société par actions simplifiée : assimilé salarié, quel que soit son niveau de détention.",
            "fondement": "Art. L.311-3 23° CSS",
        }

    raise ValueError(f"Forme juridique non prise en charge dans cette version : {forme}")


def acces_epargne_salariale(ctx: Contexte, ref) -> Dict[str, object]:
    """Le dirigeant peut-il bénéficier des dispositifs d'épargne salariale ?"""
    e = ctx.entreprise
    mini = int(ref.get("epargne_salariale.acces_dirigeant.effectif_min_salaries"))
    maxi = int(ref.get("epargne_salariale.acces_dirigeant.effectif_max_salaries"))
    effectif = e.nb_salaries

    if effectif < mini:
        return {
            "eligible": False,
            "motif": (
                "Aucun salarié dans l'entreprise. Les dispositifs d'épargne salariale sont réservés aux "
                "entreprises employant au moins un salarié autre que le dirigeant lui-même."
            ),
            "fondement": "Art. L.3312-3 et L.3332-2 du code du travail",
            "conformite": "impossible",
        }
    if effectif > maxi:
        return {
            "eligible": False,
            "motif": f"Effectif de {effectif} salariés : au-delà du plafond de {maxi} salariés ouvrant l'accès du dirigeant.",
            "fondement": "Art. L.3312-3 et L.3332-2 du code du travail",
            "conformite": "impossible",
        }

    conformite = "conforme"
    reserves = []
    if effectif == 1 and e.conjoint_salarie:
        conformite = "conforme_sous_conditions"
        reserves.append(
            "L'unique salarié est le conjoint du dirigeant. La réalité du contrat de travail (fonctions "
            "effectives, rémunération cohérente avec l'emploi, lien de subordination lorsqu'il est requis, "
            "déclarations sociales) conditionne la validité du dispositif. L'ancienneté du contrat ne suffit "
            "jamais à elle seule à sécuriser le montage."
        )
    return {
        "eligible": True,
        "motif": f"Effectif de {effectif} salarié(s) : dans la fourchette de {mini} à {maxi}.",
        "fondement": "Art. L.3312-3 et L.3332-2 du code du travail",
        "conformite": conformite,
        "reserves": reserves,
    }
