"""Chargement du référentiel de paramètres.

Le moteur ne contient AUCUNE constante réglementaire. Tout vient d'ici.
Toute lecture de paramètre passe par `P.get(chemin)` qui trace l'accès :
le journal de décision peut ainsi restituer la liste exacte des règles
utilisées par une simulation et leur niveau de confiance.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List

import yaml

_RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_FICHIER = os.path.join(_RACINE, "rules", "parameters", "{millesime}.yaml")


class Referentiel:
    """Accès tracé au référentiel d'un millésime."""

    def __init__(self, millesime: int = 2026):
        self.millesime = millesime
        with open(_FICHIER.format(millesime=millesime), "r", encoding="utf-8") as f:
            self.data: Dict[str, Any] = yaml.safe_load(f)
        self.acces: List[str] = []

    # -- accès ---------------------------------------------------------------
    def get(self, chemin: str, defaut: Any = "__RAISE__") -> Any:
        """Lit un paramètre via un chemin pointé, ex. 'social_tns.assiette.taux_abattement'."""
        noeud: Any = self.data
        for cle in chemin.split("."):
            if not isinstance(noeud, dict) or cle not in noeud:
                if defaut != "__RAISE__":
                    return defaut
                raise KeyError(f"Paramètre absent du référentiel : {chemin}")
            noeud = noeud[cle]
        if chemin not in self.acces:
            self.acces.append(chemin)
        return noeud

    # -- métadonnées ---------------------------------------------------------
    @property
    def pass_(self) -> float:
        return float(self.get("references.pass.valeurs")[self.millesime])

    def pass_annee(self, annee: int) -> float:
        return float(self.get("references.pass.valeurs")[annee])

    def regles_utilisees(self) -> List[Dict[str, Any]]:
        """Retourne, pour le journal de décision, les blocs de règles touchés."""
        vus, sortie = set(), []
        for chemin in self.acces:
            morceaux = chemin.split(".")
            for prof in range(len(morceaux), 0, -1):
                noeud = self.data
                ok = True
                for cle in morceaux[:prof]:
                    if not isinstance(noeud, dict) or cle not in noeud:
                        ok = False
                        break
                    noeud = noeud[cle]
                if ok and isinstance(noeud, dict) and "rule_id" in noeud:
                    rid = noeud["rule_id"]
                    if rid not in vus:
                        vus.add(rid)
                        sortie.append(
                            {
                                "rule_id": rid,
                                "title": noeud.get("title", ""),
                                "confidence": noeud.get("confidence", "n/a"),
                                "source": noeud.get("source_reference", ""),
                                "last_verified": noeud.get("last_verified", ""),
                                "note": noeud.get("note", ""),
                            }
                        )
                    break
        return sorted(sortie, key=lambda r: r["rule_id"])

    def alertes_confiance(self) -> List[Dict[str, Any]]:
        """Règles utilisées dont la confiance n'est pas 'high'."""
        return [r for r in self.regles_utilisees() if r["confidence"] not in ("high", "n/a")]


def bareme_progressif_taux_unique(assiette: float, bareme: List[Dict[str, Any]], pass_: float) -> float:
    """Taux UNIQUE applicable à la totalité de l'assiette, interpolé linéairement.

    Utilisé par les cotisations TNS maladie et allocations familiales : le taux
    n'est pas marginal par tranche, il dépend du niveau global du revenu et
    s'applique ensuite à l'intégralité de l'assiette.
    """
    ratio = assiette / pass_ if pass_ else 0.0
    for tr in bareme:
        borne_haute = tr["a"]
        if borne_haute is None or ratio <= borne_haute:
            if borne_haute is None or tr["taux_debut"] == tr["taux_fin"]:
                return float(tr["taux_fin"])
            largeur = borne_haute - tr["de"]
            if largeur <= 0:
                return float(tr["taux_fin"])
            avancement = (ratio - tr["de"]) / largeur
            return float(tr["taux_debut"] + avancement * (tr["taux_fin"] - tr["taux_debut"]))
    return float(bareme[-1]["taux_fin"])


def tranche(assiette: float, de: float, a: float | None) -> float:
    """Fraction de l'assiette comprise entre `de` et `a` (bornes en euros)."""
    haut = assiette if a is None else min(assiette, a)
    return max(0.0, haut - de)
