"""Anatomie des cotisations du dirigeant assimilé salarié (président de SAS/SASU,
gérant minoritaire de SARL).

Particularités modélisées :
  - pas d'assurance chômage, pas d'AGS ;
  - pas d'accès à la réduction générale dégressive unique (RGDU), donc taux
    pleins maladie (13 %) et allocations familiales (5,25 %) quel que soit le
    niveau de rémunération, y compris après la fusion des bandeaux au 1/1/2026 ;
  - points Agirc-Arrco acquis sur le taux CONTRACTUEL alors que la cotisation
    est appelée à 127 % : le différentiel ne crée aucun droit.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

from .modeles import LigneCotisation
from .params import Referentiel, tranche


def _base(brut: float, code_base: str, pass_: float) -> float:
    if code_base == "TOT":
        return brut
    if code_base == "T1":
        return min(brut, pass_)
    if code_base == "T2":
        return tranche(brut, pass_, 8 * pass_)
    if code_base == "T1T2":
        return min(brut, 8 * pass_)
    raise ValueError(code_base)


def cotisations_from_brut(brut: float, ref: Referentiel, taux_atmp: float | None = None,
                          affiliation_cadre: bool = True, effectif: int = 0,
                          taux_versement_mobilite: float = 0.0
                          ) -> Tuple[List[LigneCotisation], Dict[str, float]]:
    pass_ = ref.pass_
    lignes: List[LigneCotisation] = []
    patronal = salarial = salarial_deductible = 0.0

    for l in ref.get("social_assimile_salarie.cotisations.lignes"):
        code = l["code"]
        if code == "APEC" and not affiliation_cadre:
            continue
        if code == "CET" and brut <= pass_:
            continue
        if "effectif_min" in l and effectif < int(l["effectif_min"]):
            continue
        if "effectif_max" in l and effectif > int(l["effectif_max"]):
            continue
        base = _base(brut, l["base"], pass_)
        if base <= 0:
            continue
        tp = float(l["taux_patronal"])
        if code == "ATMP" and taux_atmp is not None:
            tp = float(taux_atmp)
        if code == "VM":
            tp = float(taux_versement_mobilite)
            if tp <= 0:
                continue
        ts = float(l["taux_salarial"])
        if tp:
            m = base * tp
            patronal += m
            lignes.append(LigneCotisation(
                code=f"AS_{code}_P", libelle=f"{l['libelle']} (part employeur)", assiette=base,
                taux=tp, montant=m, payeur="societe", droits=l["droits"], caractere=l["caractere"],
            ))
        if ts:
            m = base * ts
            salarial += m
            salarial_deductible += m  # toutes les cotisations salariales sont déductibles de l'IR
            lignes.append(LigneCotisation(
                code=f"AS_{code}_S", libelle=f"{l['libelle']} (part salariale)", assiette=base,
                taux=ts, montant=m, payeur="dirigeant", droits=l["droits"], caractere=l["caractere"],
            ))

    # --- CSG / CRDS ---------------------------------------------------------
    ab = float(ref.get("social_assimile_salarie.csg_crds.abattement_frais_pro"))
    plaf_ab = float(ref.get("social_assimile_salarie.csg_crds.plafond_abattement_pct_pass")) * pass_
    assiette_csg = min(brut, plaf_ab) * (1 - ab) + max(0.0, brut - plaf_ab)
    t_csg_d = float(ref.get("social_assimile_salarie.csg_crds.taux_csg_deductible"))
    t_csg_nd = float(ref.get("social_assimile_salarie.csg_crds.taux_csg_non_deductible"))
    t_crds = float(ref.get("social_assimile_salarie.csg_crds.taux_crds"))
    for lib, taux, ded in (("CSG déductible", t_csg_d, True),
                           ("CSG non déductible", t_csg_nd, False),
                           ("CRDS", t_crds, False)):
        m = assiette_csg * taux
        salarial += m
        if ded:
            salarial_deductible += m
        lignes.append(LigneCotisation(
            code="AS_CSG" if "CSG" in lib else "AS_CRDS", libelle=lib, assiette=assiette_csg,
            taux=taux, montant=m, payeur="dirigeant", droits="Aucun", caractere="solidarite",
        ))

    recap = {
        "brut": brut,
        "patronal": patronal,
        "salarial": salarial,
        "salarial_deductible": salarial_deductible,
        "cout_entreprise": brut + patronal,
        "net_percu": brut - salarial,
        "imposable_avant_abattement_10": max(0.0, brut - salarial_deductible),
        "assiette_csg": assiette_csg,
        "csg_crds": assiette_csg * (t_csg_d + t_csg_nd + t_crds),
        "total_cotisations": patronal + salarial,
    }
    return lignes, recap


def brut_depuis_cout(cout: float, ref: Referentiel, taux_atmp: float | None = None,
                     affiliation_cadre: bool = True, effectif: int = 0,
                     taux_versement_mobilite: float = 0.0, tolerance: float = 1e-7) -> float:
    """Inverse le barème patronal : quel brut correspond à un coût entreprise donné ?"""
    if cout <= 0:
        return 0.0
    bas, haut = 0.0, cout
    for _ in range(200):
        mid = (bas + haut) / 2
        _, r = cotisations_from_brut(mid, ref, taux_atmp, affiliation_cadre, effectif, taux_versement_mobilite)
        if r["cout_entreprise"] > cout:
            haut = mid
        else:
            bas = mid
        if haut - bas < tolerance:
            break
    return (bas + haut) / 2


def net_et_imposable(cout: float, ref: Referentiel, taux_atmp: float | None = None,
                     affiliation_cadre: bool = True, effectif: int = 0,
                     taux_versement_mobilite: float = 0.0) -> Dict[str, float]:
    brut = brut_depuis_cout(cout, ref, taux_atmp, affiliation_cadre, effectif, taux_versement_mobilite)
    lignes, r = cotisations_from_brut(brut, ref, taux_atmp, affiliation_cadre, effectif, taux_versement_mobilite)
    r["lignes"] = lignes
    r["total"] = r["total_cotisations"]
    return r
