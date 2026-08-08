"""Anatomie des cotisations du travailleur non salarié — millésime post-réforme d'assiette.

Chaque cotisation est produite comme une LIGNE explicite : assiette, taux,
montant, droits générés, caractère contributif ou de solidarité.
Le moteur n'expose jamais un « taux global » sans sa décomposition.
"""

from __future__ import annotations

from typing import Dict, List, Tuple

from .modeles import LigneCotisation
from .params import Referentiel, bareme_progressif_taux_unique, tranche


def assiette_unique(revenu_brut: float, ref: Referentiel) -> Dict[str, float]:
    """Assiette sociale unique : R - abattement plafonné et plancheré.

    R = revenu professionnel brut = coût total supporté par la société au titre
    du dirigeant (rémunération nette + cotisations + CSG/CRDS), hors cotisations
    facultatives.
    """
    pass_ = ref.pass_
    taux = float(ref.get("social_tns.assiette.taux_abattement"))
    plancher = float(ref.get("social_tns.assiette.plancher_abattement_pct_pass")) * pass_
    plafond = float(ref.get("social_tns.assiette.plafond_abattement_pct_pass")) * pass_

    brut = max(0.0, revenu_brut)
    abattement_theorique = taux * brut
    abattement = min(max(abattement_theorique, plancher), plafond)
    abattement = min(abattement, brut)  # ne peut pas rendre l'assiette négative
    return {
        "revenu_brut": brut,
        "abattement_theorique": abattement_theorique,
        "abattement_retenu": abattement,
        "assiette": brut - abattement,
        "plancher": plancher,
        "plafond": plafond,
    }


def cotisation_maladie(assiette: float, ref: Referentiel) -> Dict[str, float]:
    """Cotisation maladie-maternité des indépendants (art. D.621-1 et D.621-2 CSS).

    Deux étages, souvent mal restitués :
      - le taux de BASE est de 8,50 % sur la fraction d'assiette n'excédant pas
        3 PASS et de 6,50 % sur la fraction au-delà. Le 6,50 % est un taux
        MARGINAL sur l'excédent, il ne s'applique jamais à la totalité ;
      - lorsque l'assiette totale est inférieure à 3 PASS, le taux de base subit
        une réduction dégressive (D.621-2) et le taux réduit, lui, s'applique à
        la totalité de l'assiette.

    La fonction est continue en 3 PASS (0,085 x 3 PASS des deux côtés) et
    croissante partout : aucune « falaise » n'existe dans ce barème.
    """
    pass_ = ref.pass_
    taux_base = float(ref.get("social_tns.maladie_maternite.taux_base"))
    seuil = float(ref.get("social_tns.maladie_maternite.seuil_fraction_superieure_pct_pass")) * pass_
    taux_sup = float(ref.get("social_tns.maladie_maternite.taux_fraction_superieure"))
    bareme = ref.get("social_tns.maladie_maternite.bareme_reduction_pct_pass")

    A = max(0.0, assiette)
    if A <= seuil:
        taux = bareme_progressif_taux_unique(A, bareme, pass_)
        montant = A * taux
        explication = (f"Taux réduit de {taux * 100:.2f} % appliqué à la totalité de l'assiette "
                       f"(assiette inférieure à 3 PASS, réduction de l'art. D.621-2 CSS).")
    else:
        montant = seuil * taux_base + (A - seuil) * taux_sup
        taux = montant / A if A else 0.0
        explication = (f"{taux_base * 100:.2f} % sur la fraction jusqu'à 3 PASS ({seuil:,.0f} €) "
                       f"et {taux_sup * 100:.2f} % sur la fraction au-delà "
                       f"({A - seuil:,.0f} €), soit un taux moyen de {taux * 100:.2f} %.")
    return {
        "montant": montant,
        "taux_moyen": taux,
        "assiette": A,
        "fraction_sous_seuil": min(A, seuil),
        "fraction_au_dela": max(0.0, A - seuil),
        "explication": explication,
    }


def cotisations(revenu_brut: float, ref: Referentiel, activite: str = "commerciale",
                appliquer_minimales: bool = True) -> Tuple[List[LigneCotisation], Dict[str, float]]:
    """Retourne les lignes de cotisations TNS et un récapitulatif."""
    pass_ = ref.pass_
    a = assiette_unique(revenu_brut, ref)
    A = a["assiette"]
    lignes: List[LigneCotisation] = []

    # --- maladie-maternité -------------------------------------------------
    # Il n'existe pas de cotisation minimale maladie (supprimée par la LFSS 2017) :
    # le taux est simplement nul sous 20 % du PASS (art. D.621-2, 1° CSS).
    mal = cotisation_maladie(A, ref)
    lignes.append(LigneCotisation(
        code="TNS_MAL", libelle="Maladie-maternité", assiette=A, taux=mal["taux_moyen"],
        montant=mal["montant"], payeur="dirigeant",
        droits=ref.get("social_tns.maladie_maternite.droits_generes"),
        caractere=ref.get("social_tns.maladie_maternite.caractere"),
        note=mal["explication"],
    ))

    # --- indemnités journalières -------------------------------------------
    plaf_ij = float(ref.get("social_tns.indemnites_journalieres.plafond_pct_pass")) * pass_
    min_ij = float(ref.get("social_tns.indemnites_journalieres.assiette_minimale_pct_pass")) * pass_
    assiette_ij = min(max(A, min_ij if appliquer_minimales else 0.0), plaf_ij)
    taux_ij = float(ref.get("social_tns.indemnites_journalieres.taux"))
    montant_ij = assiette_ij * taux_ij
    if appliquer_minimales:
        montant_ij = max(montant_ij, float(ref.get("social_tns.indemnites_journalieres.cotisation_minimale_eur")))
    lignes.append(LigneCotisation(
        code="TNS_IJ", libelle="Indemnités journalières", assiette=assiette_ij, taux=taux_ij,
        montant=montant_ij, payeur="dirigeant",
        droits=ref.get("social_tns.indemnites_journalieres.droits_generes"),
        caractere=ref.get("social_tns.indemnites_journalieres.caractere"),
    ))

    # --- retraite de base ---------------------------------------------------
    tr = ref.get("social_tns.retraite_base.tranches")
    base_t1 = min(A, pass_)
    montant_t1 = base_t1 * float(tr[0]["taux"])
    if appliquer_minimales:
        montant_t1 = max(montant_t1, float(ref.get("social_tns.retraite_base.cotisation_minimale_eur")))
    lignes.append(LigneCotisation(
        code="TNS_RB1", libelle="Retraite de base — tranche plafonnée", assiette=base_t1,
        taux=float(tr[0]["taux"]), montant=montant_t1, payeur="dirigeant",
        droits="Trimestres et report au compte, dans la limite de 1 PASS",
        caractere="contributif",
    ))
    lignes.append(LigneCotisation(
        code="TNS_RB2", libelle="Retraite de base — part déplafonnée", assiette=A,
        taux=float(tr[1]["taux"]), montant=A * float(tr[1]["taux"]), payeur="dirigeant",
        droits="Aucun droit proportionnel : contribution de solidarité",
        caractere="solidarite",
        note="Part déplafonnée : cotisée sans contrepartie de droits.",
    ))

    # --- retraite complémentaire RCI ---------------------------------------
    cot_rci = 0.0
    for t in ref.get("social_tns.retraite_complementaire_rci.tranches"):
        de = float(t["de_pct_pass"]) * pass_
        a_ = None if t["a_pct_pass"] is None else float(t["a_pct_pass"]) * pass_
        base = tranche(A, de, a_)
        if base <= 0 or float(t["taux"]) == 0:
            continue
        m = base * float(t["taux"])
        cot_rci += m
        lignes.append(LigneCotisation(
            code=f"TNS_RCI_{t['libelle']}", libelle=f"Retraite complémentaire RCI — {t['libelle']}",
            assiette=base, taux=float(t["taux"]), montant=m, payeur="dirigeant",
            droits="Points RCI", caractere="contributif",
        ))

    # --- invalidité-décès ---------------------------------------------------
    min_id = float(ref.get("social_tns.invalidite_deces.assiette_minimale_pct_pass")) * pass_
    assiette_id = min(max(A, min_id if appliquer_minimales else 0.0), pass_)
    taux_id = float(ref.get("social_tns.invalidite_deces.taux"))
    lignes.append(LigneCotisation(
        code="TNS_ID", libelle="Invalidité-décès", assiette=assiette_id, taux=taux_id,
        montant=assiette_id * taux_id, payeur="dirigeant",
        droits=ref.get("social_tns.invalidite_deces.droits_generes"),
        caractere=ref.get("social_tns.invalidite_deces.caractere"),
    ))

    # --- allocations familiales --------------------------------------------
    taux_af = bareme_progressif_taux_unique(A, ref.get("social_tns.allocations_familiales.bareme_pct_pass"), pass_)
    lignes.append(LigneCotisation(
        code="TNS_AF", libelle="Allocations familiales", assiette=A, taux=taux_af,
        montant=A * taux_af, payeur="dirigeant",
        droits="Aucun droit personnel proportionnel", caractere="solidarite",
    ))

    # --- CSG / CRDS ---------------------------------------------------------
    taux_csg = float(ref.get("social_tns.csg_crds.taux_csg"))
    taux_crds = float(ref.get("social_tns.csg_crds.taux_crds"))
    lignes.append(LigneCotisation(
        code="TNS_CSG", libelle="CSG (dont 6,80 pts déductibles)", assiette=A, taux=taux_csg,
        montant=A * taux_csg, payeur="dirigeant", droits="Aucun", caractere="solidarite",
    ))
    lignes.append(LigneCotisation(
        code="TNS_CRDS", libelle="CRDS", assiette=A, taux=taux_crds,
        montant=A * taux_crds, payeur="dirigeant", droits="Aucun", caractere="solidarite",
    ))

    # --- formation professionnelle -----------------------------------------
    cle = "taux_artisan" if activite == "artisanale" else "taux_commercant"
    taux_cfp = float(ref.get(f"social_tns.formation_professionnelle.{cle}"))
    lignes.append(LigneCotisation(
        code="TNS_CFP", libelle="Contribution à la formation professionnelle", assiette=pass_,
        taux=taux_cfp, montant=pass_ * taux_cfp, payeur="dirigeant",
        droits="Droit à la formation professionnelle", caractere="contributif_partiel",
    ))

    total = sum(l.montant for l in lignes)
    csg_crds = A * (taux_csg + taux_crds)
    csg_deductible = A * float(ref.get("social_tns.csg_crds.part_csg_deductible"))
    cotisations_deductibles = total - csg_crds  # les cotisations sociales obligatoires sont déductibles

    recap = {
        "assiette": A,
        "revenu_brut": a["revenu_brut"],
        "abattement": a["abattement_retenu"],
        "total": total,
        "csg_crds": csg_crds,
        "csg_deductible": csg_deductible,
        "csg_non_deductible": csg_crds - csg_deductible,
        "cotisations_hors_csg": cotisations_deductibles,
        "cotisations_deductibles_ir": cotisations_deductibles + csg_deductible,
        "cotisation_rci": cot_rci,
        "cotisation_retraite_base_t1": montant_t1,
    }
    return lignes, recap


def net_et_imposable(revenu_brut: float, ref: Referentiel, activite: str = "commerciale") -> Dict[str, float]:
    """Décompose un coût entreprise en net perçu et en revenu imposable (art. 62 CGI)."""
    lignes, r = cotisations(revenu_brut, ref, activite)
    net = revenu_brut - r["total"]
    imposable_avant_abattement = revenu_brut - r["cotisations_deductibles_ir"]
    return {
        **r,
        "lignes": lignes,
        "net_percu": net,
        "imposable_avant_abattement_10": max(0.0, imposable_avant_abattement),
    }
