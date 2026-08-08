"""Module dividendes.

Distingue rigoureusement trois natures de prélèvement que le cahier des charges
interdit de confondre :
  - l'IR (PFU à 12,8 % ou barème après abattement de 40 %) ;
  - les prélèvements sociaux du CAPITAL (18,6 % en 2026, sauf produits dérogatoires) ;
  - les cotisations sociales PROFESSIONNELLES du TNS, qui ne frappent que la
    fraction de dividendes excédant 10 % du montant de référence.
"""

from __future__ import annotations

from typing import Dict

from .entreprise import montant_reference_dividendes
from .modeles import Contexte
from .params import Referentiel


def repartition_seuil_10(dividendes_bruts: float, ctx: Contexte, ref: Referentiel) -> Dict[str, float]:
    """Scinde les dividendes d'un gérant majoritaire de part et d'autre du seuil légal."""
    taux_seuil = float(ref.get("social_tns.dividendes_seuil_10.taux_seuil"))
    montant_ref = montant_reference_dividendes(ctx.entreprise, ctx.dirigeant.detention)
    seuil = taux_seuil * montant_ref
    sous = min(dividendes_bruts, seuil)
    au_dessus = max(0.0, dividendes_bruts - seuil)
    return {
        "montant_reference": montant_ref,
        "seuil": seuil,
        "fraction_capital": sous,
        "fraction_sociale": au_dessus,
    }


def fiscalite_dividendes(fraction_capital: float, fraction_sociale: float, ref: Referentiel,
                         option_bareme: bool = False) -> Dict[str, float]:
    """Prélèvements applicables aux dividendes, hors cotisations TNS.

    - fraction_capital  : IR (PFU ou barème) + prélèvements sociaux du capital ;
    - fraction_sociale  : IR seulement (les prélèvements sociaux du capital sont
      remplacés par les cotisations et la CSG/CRDS d'activité, calculées en amont).
    """
    taux_ps = float(ref.get("capital.prelevements_sociaux.taux_plein_2026"))
    taux_pfu_ir = float(ref.get("capital.pfu.taux_ir"))
    abattement = float(ref.get("capital.pfu.option_bareme.abattement_dividendes"))
    csg_ded = float(ref.get("capital.pfu.option_bareme.csg_deductible"))

    ps = fraction_capital * taux_ps
    if option_bareme:
        # imposition au barème : la base imposable remonte dans le revenu global
        base_bareme = (fraction_capital + fraction_sociale) * (1 - abattement)
        csg_deductible = fraction_capital * csg_ded
        return {
            "mode": "bareme",
            "prelevements_sociaux_capital": ps,
            "ir_forfaitaire": 0.0,
            "base_imposable_bareme": base_bareme,
            "csg_deductible": csg_deductible,
            "abattement_40": (fraction_capital + fraction_sociale) * abattement,
        }
    return {
        "mode": "pfu",
        "prelevements_sociaux_capital": ps,
        "ir_forfaitaire": (fraction_capital + fraction_sociale) * taux_pfu_ir,
        "base_imposable_bareme": 0.0,
        "csg_deductible": 0.0,
        "abattement_40": 0.0,
    }
