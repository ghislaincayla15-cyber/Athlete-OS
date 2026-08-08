"""Détection proactive des optimisations (§ 26 du cahier des charges).

Chaque alerte porte une justification, un chiffrage lorsqu'il est calculable,
et un renvoi à la règle qui la fonde. Aucune alerte n'est émise sans motif.
"""

from __future__ import annotations

from typing import Dict, List

from engine.entreprise import montant_reference_dividendes
from engine.epargne_salariale import plafonds
from engine.modeles import Contexte, Resultat
from engine.params import Referentiel
from engine.statut import acces_epargne_salariale, qualifier


def detecter(ctx: Contexte, actuel: Resultat, optimise: Resultat, ref: Referentiel) -> List[Dict[str, object]]:
    e, d, f = ctx.entreprise, ctx.dirigeant, ctx.foyer
    q = qualifier(ctx)
    acces = acces_epargne_salariale(ctx, ref)
    pass_ = ref.pass_
    out: List[Dict[str, object]] = []

    # --- plafond PER inutilisé ----------------------------------------------
    plaf = actuel.detail["plafond_per"]
    if plaf["disponible"] > float(ref.get("politique_cabinet.materialite.plafond_per_inutilise_signalable_eur")):
        out.append({
            "code": "PER_PLAFOND_INUTILISE",
            "niveau": "opportunite",
            "titre": "Plafond de déduction PER non utilisé",
            "message": (f"{plaf['disponible']:,.0f} € de plafond de déduction restent disponibles "
                        f"(plafond de l'année {plaf['plafond_retenu']:,.0f} € + report {plaf['report_anterieur']:,.0f} €)."),
            "justification": "Art. 163 quatervicies CGI et, pour le TNS, art. 154 bis CGI.",
            "reserve": "Un versement PER produit un report d'imposition, pas un gain sec : "
                       "la fiscalité de sortie doit être comparée au taux marginal du moment.",
        })

    # --- épargne salariale absente ------------------------------------------
    if acces["eligible"] and not (e.pee_existant or e.pereco_existant):
        p = plafonds(ctx, ref, actuel.revenu_imposable_remuneration)
        out.append({
            "code": "ES_ABSENTE",
            "niveau": "opportunite",
            "titre": "Aucun plan d'épargne salariale en place",
            "message": (f"L'effectif de {e.nb_salaries} salarié(s) ouvre l'accès du dirigeant aux dispositifs. "
                        f"Capacité d'abondement théorique : {p['abondement_pee_max']:,.0f} € sur le PEE et "
                        f"{p['abondement_pereco_max']:,.0f} € sur le PERECO, soit {p['abondement_total_max']:,.0f} € "
                        f"par an et par bénéficiaire."),
            "justification": "Art. L.3332-2 et L.3334-6 du code du travail.",
            "reserve": "Coût collectif à chiffrer : le règlement s'applique à tous les bénéficiaires.",
        })
    elif not acces["eligible"]:
        out.append({
            "code": "ES_INACCESSIBLE",
            "niveau": "information",
            "titre": "Épargne salariale inaccessible en l'état",
            "message": acces["motif"],
            "justification": acces["fondement"],
            "reserve": "L'embauche d'un salarié pour ouvrir un dispositif ne doit jamais être motivée par le seul "
                       "avantage social : le caractère artificiel de l'emploi est un motif de requalification.",
        })

    # --- abondement non maximisé --------------------------------------------
    if (e.pee_existant or e.pereco_existant) and acces["eligible"]:
        p = plafonds(ctx, ref, actuel.revenu_imposable_remuneration)
        utilise = (actuel.allocation.abondement_pee + actuel.allocation.abondement_pereco) if actuel.allocation else 0.0
        if utilise < p["abondement_total_max"] - 100:
            out.append({
                "code": "ES_ABONDEMENT_NON_MAXIMISE",
                "niveau": "opportunite",
                "titre": "Abondement non maximisé",
                "message": f"{p['abondement_total_max'] - utilise:,.0f} € d'abondement restent mobilisables.",
                "justification": "Plafonds de 8 % et 16 % du PASS, dans la limite du triple des versements.",
            })

    # --- rémunération dans une zone socialement inefficiente ------------------
    if q["statut_social"] == "TNS":
        # On teste la situation actuelle ET la recommandation : un optimum peut se
        # placer sur un seuil que la situation actuelle ne touche pas.
        assiette = max(actuel.detail.get("assiette_sociale_remuneration", 0.0),
                       optimise.detail.get("assiette_sociale_remuneration", 0.0))
        if assiette > 2.5 * pass_:
            out.append({
                "code": "TNS_ZONE_INCERTAINE",
                "niveau": "vigilance",
                "titre": "Assiette proche du décrochage du taux maladie",
                "message": (f"L'assiette sociale ({assiette:,.0f} €) approche ou dépasse 3 PASS "
                            f"({3 * pass_:,.0f} €), seuil auquel le taux de la cotisation maladie décroche."),
                "justification": "Barème progressif de la cotisation maladie-maternité des indépendants.",
                "reserve": "La position exacte du décrochage (3 ou 5 PASS) fait l'objet d'une divergence entre "
                           "sources : à confirmer avant de fonder une décision sur ce seuil.",
            })
        if assiette > 4 * pass_:
            out.append({
                "code": "TNS_AU_DELA_RCI",
                "niveau": "information",
                "titre": "Rémunération au-delà du plafond de la retraite complémentaire",
                "message": (f"Au-delà de 4 PASS ({4 * pass_:,.0f} €), la cotisation RCI cesse et la rémunération "
                            "supplémentaire ne génère plus de points de retraite complémentaire. La cotisation "
                            "maladie et la CSG/CRDS restent dues sans contrepartie proportionnelle."),
                "justification": "Barème RCI : tranche 2 limitée à 4 PASS.",
            })

    # --- dividendes et seuil des 10 % ----------------------------------------
    if q["statut_social"] == "TNS":
        montant_ref = montant_reference_dividendes(e, d.detention)
        # Le taux vient du référentiel, comme dans le calcul principal : le
        # dupliquer en dur ferait diverger l'alerte du montant réellement cotisé.
        seuil = float(ref.get("social_tns.dividendes_seuil_10.taux_seuil")) * montant_ref
        if d.dividendes_actuels > seuil > 0:
            out.append({
                "code": "DIV_AU_DESSUS_SEUIL",
                "niveau": "vigilance",
                "titre": "Dividendes au-dessus du seuil social",
                "message": (f"{d.dividendes_actuels - seuil:,.0f} € de dividendes dépassent le seuil de 10 % du "
                            f"montant de référence ({seuil:,.0f} €) et supportent les cotisations TNS."),
                "justification": "Art. L.136-3 II 2° CSS.",
                "reserve": "Le compte courant est retenu pour son solde MOYEN annuel, apprécié au dernier jour de "
                           "l'exercice précédent.",
            })
        elif montant_ref > 0 and d.dividendes_actuels < seuil * 0.8:
            out.append({
                "code": "DIV_MARGE_SOUS_SEUIL",
                "niveau": "opportunite",
                "titre": "Marge de distribution sous le seuil social",
                "message": (f"{seuil - d.dividendes_actuels:,.0f} € peuvent encore être distribués sous le seuil de "
                            "10 %, sans cotisations TNS."),
                "justification": "Art. L.136-3 II 2° CSS.",
            })

    # --- excès de trésorerie --------------------------------------------------
    if e.tresorerie > 0 and e.masse_salariale + actuel.cout_entreprise > 0:
        mois = e.tresorerie / max(1.0, (e.masse_salariale + actuel.cout_entreprise) / 12)
        if mois > 18:
            out.append({
                "code": "TRESORERIE_EXCEDENTAIRE",
                "niveau": "opportunite",
                "titre": "Trésorerie excédentaire",
                "message": f"La trésorerie représente environ {mois:.0f} mois de charges de personnel.",
                "justification": "Indicateur de gestion, non réglementaire.",
                "reserve": "Une trésorerie durablement excédentaire peut affecter la qualification de biens "
                           "professionnels pour l'IFI et le régime Dutreil. Point à examiner séparément.",
            })

    # --- droits sociaux insuffisants -----------------------------------------
    if actuel.droits.trimestres < 4:
        out.append({
            "code": "TRIMESTRES_INCOMPLETS",
            "niveau": "alerte",
            "titre": "Année incomplète pour la retraite",
            "message": (f"La rémunération actuelle ne valide que {actuel.droits.trimestres:.0f} trimestre(s). "
                        f"Il faut {ref.get('references.trimestre_retraite.valeur_2026'):,.0f} € d'assiette "
                        "pour un trimestre, quatre fois ce montant pour l'année."),
            "justification": "150 SMIC horaires par trimestre (art. R.351-9 CSS).",
        })

    # --- CEHR / CDHR ----------------------------------------------------------
    if actuel.cehr > 0 or actuel.cdhr > 0:
        out.append({
            "code": "HAUTS_REVENUS",
            "niveau": "vigilance",
            "titre": "Foyer soumis aux contributions sur les hauts revenus",
            "message": (f"CEHR : {actuel.cehr:,.0f} € — CDHR : {actuel.cdhr:,.0f} €. "
                        "Le lissage pluriannuel des revenus exceptionnels et le calendrier des distributions "
                        "deviennent des leviers à part entière."),
            "justification": "Art. 223 sexies et 224 CGI.",
        })

    # --- conjoint salarié -----------------------------------------------------
    if e.conjoint_salarie:
        out.append({
            "code": "CONJOINT_SALARIE",
            "niveau": "vigilance",
            "titre": "Conjoint salarié : robustesse à documenter",
            "message": ("La présence d'un conjoint salarié ouvre les dispositifs collectifs mais impose de "
                        "documenter la réalité de l'emploi : fonctions effectives, rémunération cohérente avec "
                        "le poste, temps de travail, déclarations sociales, lien de subordination lorsqu'il est requis."),
            "justification": "Conditions de fond du contrat de travail ; art. L.3312-3 et L.3332-2 du code du travail "
                             "pour l'accès du dirigeant.",
            "reserve": "Attendre un an avant de faire bénéficier le dirigeant du plan ne sécurise rien à soi seul.",
        })

    # --- comparaison de structure --------------------------------------------
    if e.forme.upper() in ("SARL", "EURL") and actuel.detail.get("assiette_sociale_remuneration", 0) > 1.5 * pass_:
        out.append({
            "code": "COMPARER_STRUCTURE",
            "niveau": "opportunite",
            "titre": "Comparaison SARL / SAS à simuler",
            "message": "Le niveau de rémunération justifie de comparer le régime TNS au régime assimilé salarié, "
                       "en intégrant les coûts de transformation et un horizon pluriannuel.",
            "justification": "§ 27 du cahier des charges.",
        })

    return out
