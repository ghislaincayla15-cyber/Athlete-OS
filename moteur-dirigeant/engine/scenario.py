"""Évaluation complète d'un scénario : de l'euro disponible dans l'entreprise
jusqu'au patrimoine du dirigeant.

Règle fondamentale imposée par le cahier des charges (§ 38) :
    tout euro doit être traçable de la société jusqu'au patrimoine du dirigeant,
    aux prélèvements ou à la trésorerie résiduelle.
Le contrôle de conservation est exécuté à chaque évaluation et échoue bruyamment.
"""

from __future__ import annotations

from typing import Dict, List

from . import dividendes as mod_div
from . import entreprise as mod_ent
from . import epargne_salariale as mod_es
from . import ir as mod_ir
from . import per as mod_per
from . import retraite as mod_retraite
from . import social_assimile as mod_as
from . import social_tns as mod_tns
from . import statut as mod_statut
from .modeles import Allocation, Contexte, Droits, LigneCotisation, Resultat
from .params import Referentiel

TOLERANCE = 0.51  # euro


def evaluer(ctx: Contexte, alloc: Allocation, ref: Referentiel, libelle: str = "") -> Resultat:
    e, d, f, h = ctx.entreprise, ctx.dirigeant, ctx.foyer, ctx.hypotheses
    q = mod_statut.qualifier(ctx)
    statut = q["statut_social"]
    res = Resultat(libelle=libelle or "scénario", allocation=alloc)
    res.detail["qualification"] = q
    alertes: List[Dict[str, str]] = []
    controles: List[Dict[str, object]] = []

    # =========================================================================
    # 1. ÉPARGNE SALARIALE — éligibilité et coût
    # =========================================================================
    acces = mod_statut.acces_epargne_salariale(ctx, ref)
    res.detail["acces_epargne_salariale"] = acces
    utilise_es = (alloc.abondement_pee + alloc.abondement_pereco + alloc.interessement_enveloppe) > 0
    if utilise_es and not acces["eligible"]:
        res.conformite = "impossible"
        alertes.append({"niveau": "bloquant", "code": "ES_INELIGIBLE", "message": acces["motif"]})
        alloc = Allocation(**{**alloc.__dict__,
                              "abondement_pee": 0.0, "abondement_pereco": 0.0,
                              "versement_pee": 0.0, "versement_pereco": 0.0,
                              "interessement_enveloppe": 0.0})
        res.allocation = alloc
        utilise_es = False

    # =========================================================================
    # 2. RÉMUNÉRATION — anatomie des cotisations
    # =========================================================================
    cout_remu = max(0.0, alloc.cout_remuneration)
    lignes: List[LigneCotisation] = []

    if statut == mod_statut.TNS:
        base_remu = mod_tns.net_et_imposable(cout_remu, ref, e.activite)
        lignes += base_remu["lignes"]
        net_remu = base_remu["net_percu"]
        imposable_remu_brut = base_remu["imposable_avant_abattement_10"]
        assiette_sociale_remu = base_remu["assiette"]
        brut_salarial = None
    else:
        base_remu = mod_as.net_et_imposable(cout_remu, ref, d.taux_atmp, d.affiliation_cadre, e.nb_salaries)
        # Le barème patronal comporte une discontinuité à 1 PASS (déclenchement de
        # la CET) : certains coûts cibles ne correspondent à aucun brut. On retient
        # le coût réellement engagé et on trace l'écart plutôt que de le perdre.
        ecart_inversion = base_remu["cout_entreprise"] - cout_remu
        if abs(ecart_inversion) > TOLERANCE:
            controles.append({"niveau": "condition", "code": "INVERSION_COUT_BRUT", "ecart": ecart_inversion,
                              "message": (f"Aucun brut ne correspond exactement à un coût de {cout_remu:,.2f} € "
                                          f"(discontinuité de la CET au passage de 1 PASS). Coût réellement "
                                          f"engagé : {base_remu['cout_entreprise']:,.2f} €.")})
        cout_remu = base_remu["cout_entreprise"]
        lignes += base_remu["lignes"]
        net_remu = base_remu["net_percu"]
        imposable_remu_brut = base_remu["imposable_avant_abattement_10"]
        assiette_sociale_remu = base_remu["brut"]
        brut_salarial = base_remu["brut"]

    # =========================================================================
    # 3. DIVIDENDES
    # =========================================================================
    div_brut = max(0.0, alloc.dividendes_bruts)
    cot_dividendes = 0.0
    lignes_div: List[LigneCotisation] = []
    if statut == mod_statut.TNS and div_brut > 0:
        rep = mod_div.repartition_seuil_10(div_brut, ctx, ref)
        res.detail["seuil_10_dividendes"] = rep
        if rep["fraction_sociale"] > 0:
            total = mod_tns.cotisations(cout_remu + rep["fraction_sociale"], ref, e.activite)[1]
            cot_dividendes = total["total"] - base_remu["total"]
            deductibles_div = total["cotisations_deductibles_ir"] - base_remu["cotisations_deductibles_ir"]
            lignes_div.append(LigneCotisation(
                code="TNS_DIV", libelle="Cotisations TNS sur la fraction de dividendes excédant 10 %",
                assiette=rep["fraction_sociale"], taux=cot_dividendes / rep["fraction_sociale"],
                montant=cot_dividendes, payeur="dirigeant",
                droits="Droits retraite proportionnels comme la rémunération",
                caractere="contributif_partiel",
                note="Fraction excédant 10 % du capital + primes d'émission + solde moyen des comptes courants.",
            ))
            alertes.append({
                "niveau": "vigilance", "code": "DIV_SEUIL_10",
                "message": (f"{rep['fraction_sociale']:,.0f} € de dividendes dépassent le seuil de 10 % "
                            f"({rep['seuil']:,.0f} €) et supportent les cotisations TNS."),
            })
        else:
            deductibles_div = 0.0
    else:
        rep = {"fraction_capital": div_brut, "fraction_sociale": 0.0, "seuil": None, "montant_reference": None}
        deductibles_div = 0.0
    lignes += lignes_div

    fisc_div = mod_div.fiscalite_dividendes(rep["fraction_capital"], rep["fraction_sociale"],
                                            ref, alloc.option_bareme_dividendes)
    res.detail["fiscalite_dividendes"] = fisc_div

    # =========================================================================
    # 4. ÉPARGNE SALARIALE — flux
    # =========================================================================
    # Les plafonds assis sur N-1 doivent partir d'un revenu IMPOSABLE, jamais d'un
    # coût entreprise : la confusion surestimait les plafonds du poids des
    # cotisations. Priorité au revenu N-1 déclaré ; à défaut, reconstitution.
    revenu_pro_n1 = _revenu_professionnel_n1(ctx, ref, statut, imposable_remu_brut)
    part_dir = mod_es.part_dirigeant_interessement(ctx, imposable_remu_brut)
    interessement_dirigeant = alloc.interessement_enveloppe * part_dir
    es = mod_es.cout_et_valeur(ctx, ref, alloc.abondement_pee, alloc.abondement_pereco,
                               interessement_dirigeant, alloc.interessement_enveloppe)
    res.detail["epargne_salariale"] = {**es, "part_dirigeant_interessement": part_dir,
                                       "interessement_dirigeant": interessement_dirigeant}
    controles += mod_es.controles(ctx, ref, alloc.versement_pee, alloc.abondement_pee,
                                  alloc.versement_pereco, alloc.abondement_pereco,
                                  interessement_dirigeant, alloc.interessement_enveloppe, revenu_pro_n1)

    # =========================================================================
    # 5. ENTREPRISE — IS, distribution, trésorerie
    # =========================================================================
    charges_deductibles = cout_remu + es["cout_entreprise"]
    resultat_fiscal = e.resultat_avant_remuneration - charges_deductibles
    calc_is = mod_ent.impot_societes(resultat_fiscal, e, ref)
    resultat_net = resultat_fiscal - calc_is["is"]
    distribuable = mod_ent.capacite_distributive(resultat_net, e)
    if div_brut > distribuable + TOLERANCE:
        res.conformite = "impossible"
        controles.append({"niveau": "erreur", "code": "DIV_SUP_DISTRIBUABLE",
                          "message": f"Dividendes de {div_brut:,.0f} € supérieurs au bénéfice distribuable "
                                     f"({distribuable:,.0f} €)."})
    tresorerie_flux = resultat_net - div_brut

    # =========================================================================
    # 6. IMPÔT SUR LE REVENU DU FOYER
    # =========================================================================
    plaf_per = mod_per.plafond(ctx, ref, statut, imposable_remu_brut, revenu_pro_n1)
    versement_per = max(0.0, alloc.versement_per_individuel)
    per_deductible = min(versement_per, plaf_per["disponible"])
    per_non_deductible = versement_per - per_deductible
    if per_non_deductible > 1e-6:
        alertes.append({"niveau": "vigilance", "code": "PER_HORS_PLAFOND",
                        "message": (f"{per_non_deductible:,.0f} € du versement PER excèdent le plafond de déduction "
                                    f"disponible ({plaf_per['disponible']:,.0f} €). Le versement reste possible mais "
                                    "cette fraction n'est pas déductible ; elle ouvre en contrepartie une sortie "
                                    "en capital non imposée sur cette part.")})

    # --- revenus du capital extérieurs au périmètre de la simulation ---------
    # Art. 200 A, 2 CGI : l'option pour le barème est GLOBALE et irrévocable pour
    # l'ensemble des revenus de capitaux mobiliers et des plus-values de l'année.
    # Elle ne peut pas être retenue pour les dividendes du scénario en laissant
    # les autres revenus du capital du foyer au PFU : les deux suivent l'option.
    capital_externe = max(0.0, f.revenus_capital_hors_scenario)
    taux_ps_capital = float(ref.get("capital.prelevements_sociaux.taux_plein_2026"))
    taux_pfu_ir = float(ref.get("capital.pfu.taux_ir"))
    csg_ded_capital = float(ref.get("capital.pfu.option_bareme.csg_deductible"))
    ps_capital_externe = capital_externe * taux_ps_capital
    if alloc.option_bareme_dividendes:
        # Pas d'abattement de 40 % : la nature de ces revenus n'est pas connue du
        # moteur (intérêts, plus-values, dividendes). Hypothèse prudente.
        ir_capital_externe = 0.0
        base_bareme_externe = capital_externe
        csg_deductible_externe = capital_externe * csg_ded_capital
    else:
        ir_capital_externe = capital_externe * taux_pfu_ir
        base_bareme_externe = 0.0
        csg_deductible_externe = 0.0

    imposable_remu = max(0.0, imposable_remu_brut - deductibles_div)
    abattement_dirigeant = mod_ir.abattement_10(imposable_remu, ref)
    net_categoriel_dirigeant = imposable_remu - abattement_dirigeant
    net_categoriel_conjoint = f.autres_revenus_salaires - mod_ir.abattement_10(f.autres_revenus_salaires, ref)

    csg_deductible_capital = fisc_div.get("csg_deductible", 0.0) + csg_deductible_externe
    revenu_net_global = (net_categoriel_dirigeant + net_categoriel_conjoint
                         + f.autres_revenus_imposables - per_deductible
                         - csg_deductible_capital)
    revenu_net_global = max(0.0, revenu_net_global)

    calc_ir = mod_ir.impot_revenu(revenu_net_global, f, ref,
                                  fisc_div["base_imposable_bareme"] + base_bareme_externe)
    ir_du = calc_ir["impot"]

    # RFR : revenu imposable, majoré des abattements et des revenus du capital
    # soumis à prélèvement forfaitaire. La CSG déductible du capital ne doit pas
    # minorer le RFR (art. 1417 IV CGI) : elle est réintégrée.
    rfr = calc_ir["revenu_imposable"] + fisc_div["abattement_40"] + csg_deductible_capital
    if fisc_div["mode"] == "pfu":
        rfr += rep["fraction_capital"] + rep["fraction_sociale"] + capital_externe
    cehr_du = mod_ir.cehr(rfr, f, ref)
    calc_cdhr = mod_ir.cdhr(rfr, ir_du, cehr_du,
                            fisc_div["ir_forfaitaire"] + ir_capital_externe, f, ref)

    # =========================================================================
    # 7. DROITS SOCIAUX
    # =========================================================================
    if statut == mod_statut.TNS:
        assiette_totale = mod_tns.assiette_unique(cout_remu + rep["fraction_sociale"], ref)["assiette"]
        recap_total = mod_tns.cotisations(cout_remu + rep["fraction_sociale"], ref, e.activite)[1]
        droits = mod_retraite.droits_tns(assiette_totale, recap_total["cotisation_rci"], ctx, ref)
        droits.protection_sociale = {
            "indemnites_journalieres": "oui, plafonnées",
            "invalidite_deces": "oui",
            "chomage": "non",
            "accidents_du_travail": "non (couverture volontaire à souscrire)",
        }
    else:
        droits = mod_retraite.droits_assimile(brut_salarial or 0.0, ctx, ref)
        droits.protection_sociale = {
            "indemnites_journalieres": "oui, régime général",
            "invalidite_deces": "oui, régime général",
            "chomage": "non (mandataire social)",
            "accidents_du_travail": "oui",
        }

    # =========================================================================
    # 8. AGRÉGATS PATRIMONIAUX
    # =========================================================================
    div_net = (div_brut - fisc_div["prelevements_sociaux_capital"] - fisc_div["ir_forfaitaire"] - cot_dividendes)
    versements_perso = versement_per + alloc.versement_pee + alloc.versement_pereco
    impots_personnels = ir_du + cehr_du + calc_cdhr["cdhr"]
    # Revenus du foyer étrangers au périmètre de la simulation : ils ne sont pas
    # pilotés par la stratégie mais ils financent l'impôt du foyer, qui est lui
    # calculé globalement. Les omettre rendrait le net immédiat non comparable.
    revenus_hors_scenario = (f.autres_revenus_salaires + f.autres_revenus_imposables
                             + capital_externe - ps_capital_externe - ir_capital_externe)

    net_immediat = net_remu + div_net + revenus_hors_scenario - versements_perso - impots_personnels
    epargne_pee = es["epargne_bloquee_pee"] + alloc.versement_pee
    epargne_pereco = es["epargne_bloquee_pereco"] + alloc.versement_pereco
    epargne_retraite = versement_per + epargne_pereco

    # Valorisation SYMÉTRIQUE de l'épargne : on ne peut pas débiter une fiscalité
    # de sortie calculée sur des gains projetés sans créditer ces gains. Chaque
    # poche est donc capitalisée au rendement d'hypothèse, nette de sa fiscalité
    # de sortie, puis ramenée en valeur d'aujourd'hui pour être comparable au net
    # immédiat. Faute de quoi l'optimiseur sous-alloue systématiquement le PER et
    # l'épargne salariale.
    valo_per = mod_per.valorisation_sortie(versement_per, ctx, ref, fraction_deductible=per_deductible)
    valo_es = mod_per.valorisation_epargne_salariale(epargne_pee + epargne_pereco, ctx, ref)
    cout_illiquidite = (epargne_pee + epargne_pereco + versement_per) * h.cout_illiquidite_annuel * min(5, h.horizon_annees)
    fiscalite_differee = valo_per["fiscalite_sortie_estimee"]
    ps_sortie_epargne_salariale = valo_es["prelevements_sociaux_sortie"]

    valeur_hors_droits = (net_immediat + valo_es["valeur_actuelle"] + valo_per["valeur_actuelle"]
                          - cout_illiquidite)
    valeur_patrimoniale = valeur_hors_droits + droits.valeur_actuelle_droits

    # =========================================================================
    # 9. CONTRÔLE DE CONSERVATION
    # =========================================================================
    # Les trois contrôles ci-dessous partent tous de la décomposition LIGNE À
    # LIGNE des cotisations, et non des agrégats qui ont servi à la produire :
    # une ligne oubliée, dupliquée ou mal attribuée les fait échouer. Les
    # versions antérieures recomposaient le résultat avec la formule qui l'avait
    # calculé, ce qui rendait l'échec impossible.
    lignes_remu = sum(l.montant for l in base_remu["lignes"])
    conservation = _controle_conservation(
        enveloppe=e.resultat_avant_remuneration,
        lignes_remu=lignes_remu, net_remu=net_remu, cout_es=es["cout_entreprise"],
        impot_societes=calc_is["is"], dividendes=div_brut, tresorerie=tresorerie_flux)
    controles.append(conservation)
    trace = _trace_euro(cout_remu, lignes_remu, div_brut, fisc_div, cot_dividendes,
                        impots_personnels, net_immediat, versements_perso, revenus_hors_scenario)
    ecart_lignes = cout_remu - (lignes_remu + net_remu)
    controles.append({
        "niveau": "erreur" if abs(ecart_lignes) > TOLERANCE else "ok",
        "code": "DECOMPOSITION_REMUNERATION", "ecart": ecart_lignes,
        "message": (f"Décomposition de la rémunération : coût {cout_remu:,.2f} € = cotisations "
                    f"{lignes_remu:,.2f} € + net perçu {net_remu:,.2f} € (écart {ecart_lignes:,.2f} €)."),
    })
    if tresorerie_flux < -TOLERANCE:
        depassement = -tresorerie_flux - max(0.0, e.reserves_distribuables)
        controles.append({
            "niveau": "erreur" if depassement > TOLERANCE else "condition",
            "code": "PRELEVEMENT_SUR_RESERVES", "ecart": min(0.0, tresorerie_flux),
            "message": (f"La distribution excède le résultat de l'exercice de {-tresorerie_flux:,.0f} € : elle "
                        f"prélève sur les réserves. Réserves déclarées : {e.reserves_distribuables:,.0f} €. "
                        "Une distribution de réserves n'est pas reproductible d'une année sur l'autre."),
        })
    controles.append(trace)
    if net_immediat < -TOLERANCE:
        controles.append({
            "niveau": "condition", "code": "NET_NEGATIF",
            "message": (f"Le net immédiat est négatif ({net_immediat:,.0f} €) : les versements personnels et les "
                        "impôts excèdent les revenus perçus. Le scénario suppose un financement sur l'épargne "
                        "existante du dirigeant.")})

    # =========================================================================
    # 10. ROBUSTESSE ET ALERTES
    # =========================================================================
    # Il n'existe AUCUNE discontinuité du barème maladie à 3 PASS : le taux de
    # 6,50 % de l'art. D.621-1 CSS est marginal sur la seule fraction excédant
    # 3 PASS, et la cotisation reste continue et croissante en tout point. La
    # « falaise » signalée par les versions antérieures était un artefact du
    # référentiel, qui appliquait ce taux à la totalité de l'assiette.
    note, motifs = _robustesse(ctx, alloc, acces, statut, rep, ref, es)
    if any(c.get("niveau") == "erreur" for c in controles):
        res.conformite = "impossible"
    elif any(c.get("niveau") == "condition" for c in controles):
        res.conformite = "conforme_sous_conditions"
    elif acces.get("conformite") == "conforme_sous_conditions" and utilise_es:
        res.conformite = "conforme_sous_conditions"

    # =========================================================================
    # 11. REMPLISSAGE DU RÉSULTAT
    # =========================================================================
    res.cout_entreprise = charges_deductibles
    res.cout_collectif_salaries = es["cout_abondement_salaries"] + es["interessement_salaries"]
    res.resultat_fiscal = resultat_fiscal
    res.impot_societes = calc_is["is"]
    res.resultat_net_societe = resultat_net
    res.tresorerie_residuelle = tresorerie_flux
    res.cotisations = lignes
    res.cotisations_totales = base_remu["total"] + cot_dividendes
    res.csg_crds_activite = base_remu.get("csg_crds", 0.0)
    res.remuneration_nette = net_remu
    res.revenu_imposable_remuneration = imposable_remu
    res.dividendes_nets = div_net
    res.prelevements_sociaux_capital = fisc_div["prelevements_sociaux_capital"]
    # L'IR affiché doit couvrir tout ce que le net immédiat déduit, y compris le
    # prélèvement forfaitaire des revenus du capital extérieurs au scénario.
    res.impot_revenu = ir_du + fisc_div["ir_forfaitaire"] + ir_capital_externe
    res.cehr = cehr_du
    res.cdhr = calc_cdhr["cdhr"]
    res.net_immediat = net_immediat
    res.epargne_bloquee = epargne_pee
    res.epargne_retraite = epargne_retraite
    res.droits = droits
    res.valeur_patrimoniale = valeur_patrimoniale
    res.valeur_patrimoniale_hors_droits = valeur_hors_droits
    res.valeur_globale = valeur_patrimoniale + max(0.0, tresorerie_flux) * h.coef_valeur_tresorerie_societe
    res.efficacite_marginale = valeur_patrimoniale / charges_deductibles if charges_deductibles else 0.0
    res.robustesse = note
    res.motifs_robustesse = motifs
    res.alertes = alertes
    res.controles = controles
    res.detail.update({
        "plafond_per": plaf_per,
        "per_deductible": per_deductible,
        "per_non_deductible": per_non_deductible,
        "impot_revenu_detail": calc_ir,
        "cdhr_detail": calc_cdhr,
        "rfr": rfr,
        "is_detail": calc_is,
        "valorisation_per": valo_per,
        "valorisation_epargne_salariale": valo_es,
        "cout_illiquidite": cout_illiquidite,
        "fiscalite_differee": fiscalite_differee,
        "ps_sortie_epargne_salariale": ps_sortie_epargne_salariale,
        "capital_externe": {"brut": capital_externe, "prelevements_sociaux": ps_capital_externe,
                            "ir_forfaitaire": ir_capital_externe},
        "taux_marginal_ir": mod_ir.taux_marginal(revenu_net_global, f, ref),
        "distribuable": distribuable,
        "assiette_sociale_remuneration": assiette_sociale_remu,
        "brut_salarial": brut_salarial,
    })
    return res


# =============================================================================
# CONTRÔLES
# =============================================================================

def _revenu_professionnel_n1(ctx, ref, statut, imposable_remu_brut):
    """Revenu professionnel imposable de N-1, base des plafonds assis sur N-1.

    Trois cas, dans cet ordre :
      1. le conseiller a saisi le revenu N-1 de l'avis d'imposition : on l'utilise ;
      2. sinon, la rémunération actuelle (qui est un COÛT entreprise) est
         convertie en revenu imposable par le barème du statut ;
      3. à défaut, on retombe sur l'imposable du scénario simulé.
    """
    d, e = ctx.dirigeant, ctx.entreprise
    if d.revenu_professionnel_n1 is not None:
        return max(0.0, float(d.revenu_professionnel_n1))
    if d.remuneration_actuelle > 0:
        if statut == mod_statut.TNS:
            base = mod_tns.net_et_imposable(d.remuneration_actuelle, ref, e.activite)
        else:
            base = mod_as.net_et_imposable(d.remuneration_actuelle, ref, d.taux_atmp,
                                           d.affiliation_cadre, e.nb_salaries)
        return max(0.0, base["imposable_avant_abattement_10"])
    return max(0.0, imposable_remu_brut)


def _controle_conservation(enveloppe, lignes_remu, net_remu, cout_es, impot_societes,
                           dividendes, tresorerie):
    """L'enveloppe doit se retrouver intégralement dans ses emplois.

    Le coût de la rémunération n'est PAS repris tel quel : il est reconstitué
    depuis la somme des lignes de cotisations et du net perçu. Une ligne oubliée
    ou comptée deux fois casse donc l'égalité, ce que la version antérieure —
    qui réutilisait l'agrégat de départ — ne pouvait pas détecter.
    """
    total = lignes_remu + net_remu + cout_es + impot_societes + dividendes + tresorerie
    ecart = enveloppe - total
    return {
        "niveau": "erreur" if abs(ecart) > TOLERANCE else "ok",
        "code": "CONSERVATION_SOCIETE",
        "message": (f"Conservation société : enveloppe {enveloppe:,.2f} € = cotisations {lignes_remu:,.2f} "
                    f"+ net versé {net_remu:,.2f} + épargne salariale {cout_es:,.2f} "
                    f"+ IS {impot_societes:,.2f} + dividendes {dividendes:,.2f} "
                    f"+ trésorerie {tresorerie:,.2f} (écart {ecart:,.2f} €)."),
        "ecart": ecart,
    }


def _trace_euro(cout_remu, lignes_remu, div_brut, fisc_div, cot_div,
                impots_personnels, net_immediat, versements_perso, revenus_hors_scenario=0.0):
    """Vérifie que le net immédiat se reconstitue à partir de flux indépendants.

    Le net de rémunération est reconstruit par différence entre le coût engagé et
    la somme des lignes de cotisations, et non repris de l'agrégat qui a servi à
    calculer le net immédiat : le contrôle peut donc réellement échouer.
    """
    net_remu_reconstitue = cout_remu - lignes_remu
    entrees = net_remu_reconstitue + div_brut - fisc_div["prelevements_sociaux_capital"] \
        - fisc_div["ir_forfaitaire"] - cot_div + revenus_hors_scenario
    sorties = versements_perso + impots_personnels
    reconstitue = entrees - sorties
    ecart = reconstitue - net_immediat
    return {
        "niveau": "erreur" if abs(ecart) > TOLERANCE else "ok",
        "code": "CONSERVATION_DIRIGEANT",
        "message": (f"Conservation dirigeant : net immédiat reconstitué {reconstitue:,.2f} € "
                    f"contre {net_immediat:,.2f} € calculé (écart {ecart:,.2f} €)."),
        "ecart": ecart,
    }


# =============================================================================
# ROBUSTESSE
# =============================================================================

_ORDRE = ["A", "B", "C", "D", "E"]


def _degrader(note, cible):
    return _ORDRE[max(_ORDRE.index(note), _ORDRE.index(cible))]


def _robustesse(ctx, alloc, acces, statut, rep, ref, es):
    note = "A"
    motifs: List[str] = []
    e = ctx.entreprise

    if alloc.interessement_enveloppe > 0:
        if not e.accord_interessement:
            note = _degrader(note, "C")
            motifs.append("Accord d'intéressement à mettre en place et à déposer : la stratégie est conditionnelle.")
        if e.nb_salaries <= 1:
            note = _degrader(note, "D")
            motifs.append(
                "Intéressement dans une entreprise à un seul salarié : la réalité de la collectivité de travail "
                "et le caractère aléatoire de la formule seront examinés. Risque de requalification.")
    if (alloc.abondement_pee + alloc.abondement_pereco) > 0:
        if e.nb_salaries == 1 and e.conjoint_salarie:
            note = _degrader(note, "D")
            motifs.append(
                "Le seul salarié est le conjoint du dirigeant. Le dispositif suppose un contrat de travail réel : "
                "fonctions effectives, rémunération cohérente, déclarations sociales. L'ancienneté du contrat ne "
                "sécurise pas à elle seule le montage.")
        elif e.nb_salaries < 2:
            note = _degrader(note, "C")
            motifs.append("Effectif très réduit : vérifier le caractère collectif effectif du plan et l'égalité de traitement.")
        if not (e.pee_existant or e.pereco_existant):
            note = _degrader(note, "B")
            motifs.append("Plan à créer : règlement, teneur de compte et information des bénéficiaires à formaliser.")
    if statut == "TNS" and rep.get("fraction_sociale", 0) > 0:
        note = _degrader(note, "B")
        motifs.append(
            "Fraction de dividendes soumise aux cotisations TNS : le montant de référence doit être justifié "
            "(capital libéré, primes d'émission, solde MOYEN annuel des comptes courants au dernier jour de "
            "l'exercice précédent).")
    if alloc.versement_per_individuel > 0:
        motifs.append("Versement PER : dispositif de droit commun, sécurisé, sous réserve du plafond disponible.")
    if not motifs:
        motifs.append("Rémunération et distribution de droit commun : aucune interprétation sensible mobilisée.")
    if not acces["eligible"] and (alloc.abondement_pee + alloc.abondement_pereco + alloc.interessement_enveloppe) > 0:
        note = "E"
        motifs.insert(0, acces["motif"])
    return note, motifs
