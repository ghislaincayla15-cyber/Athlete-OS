"""Génère les artefacts partagés entre le moteur Python et le moteur JavaScript.

  ui/params.json   : le référentiel, converti tel quel depuis le YAML
  build/cases.json : les contextes de la bibliothèque de cas
  build/attendus.json : les résultats produits par le moteur Python

build/verifier.js rejoue les mêmes cas côté JavaScript et compare.
"""
from __future__ import annotations

import json
import os
import sys
from dataclasses import asdict

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, RACINE)

import yaml  # noqa: E402

from engine.params import Referentiel  # noqa: E402
from optimizer.marginal import optimiser, scenario_actuel  # noqa: E402
from tests.cases.bibliotheque import CAS  # noqa: E402

OBJECTIFS = ["net_immediat", "patrimoine_net", "retraite", "compromis",
             "impot_immediat", "liquidite", "patrimoine_personnel"]
CHAMPS = [
    "cout_entreprise", "resultat_fiscal", "impot_societes", "resultat_net_societe",
    "tresorerie_residuelle", "cotisations_totales", "remuneration_nette",
    "revenu_imposable_remuneration", "dividendes_nets", "prelevements_sociaux_capital",
    "impot_revenu", "cehr", "cdhr", "net_immediat", "epargne_bloquee", "epargne_retraite",
    "valeur_patrimoniale", "valeur_globale", "robustesse", "conformite",
]


def contexte_dict(ctx) -> dict:
    return {
        "entreprise": asdict(ctx.entreprise),
        "dirigeant": asdict(ctx.dirigeant),
        "foyer": {**asdict(ctx.foyer), "nb_parts": ctx.foyer.nb_parts},
        "objectifs": asdict(ctx.objectifs),
        "hypotheses": asdict(ctx.hypotheses),
        "millesime": ctx.millesime,
    }


def resume(r) -> dict:
    out = {c: getattr(r, c) for c in CHAMPS}
    out["droits"] = {
        "trimestres": r.droits.trimestres,
        "points_rci": r.droits.points_rci,
        "points_agirc_arrco": r.droits.points_agirc_arrco,
        "rente_base_annuelle": r.droits.rente_base_annuelle,
        "rente_complementaire_annuelle": r.droits.rente_complementaire_annuelle,
        "valeur_actuelle_droits": r.droits.valeur_actuelle_droits,
    }
    a = r.allocation
    out["allocation"] = asdict(a) if a else None
    return out


def main() -> None:
    # 1. référentiel -> JSON
    src = os.path.join(RACINE, "rules", "parameters", "2026.yaml")
    with open(src, encoding="utf-8") as f:
        params = yaml.safe_load(f)
    dst = os.path.join(RACINE, "ui", "params.json")
    with open(dst, "w", encoding="utf-8") as f:
        json.dump(params, f, ensure_ascii=False, indent=1)
    print("écrit", dst)

    # 2. cas + attendus
    ref = Referentiel(2026)
    cas, attendus = {}, {}
    for cle in sorted(CAS):
        ctx = CAS[cle]
        cas[cle] = contexte_dict(ctx)
        attendus[cle] = {"actuel": resume(scenario_actuel(ctx, ref))}
        for o in OBJECTIFS:
            attendus[cle][o] = resume(optimiser(ctx, ref, o)["resultat"])
        print("  cas rejoué :", cle)

    for nom, contenu in (("cases.json", cas), ("attendus.json", attendus)):
        chemin = os.path.join(RACINE, "build", nom)
        with open(chemin, "w", encoding="utf-8") as f:
            json.dump(contenu, f, ensure_ascii=False, indent=1)
        print("écrit", chemin)


if __name__ == "__main__":
    main()
