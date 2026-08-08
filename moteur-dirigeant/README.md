# Moteur d'optimisation patrimoniale du dirigeant

Implémentation du cahier des charges `docs/cahier-des-charges.md`.
Millésime réglementaire **2026**, référentiel vérifié le **8 août 2026**.

Le moteur répond à une question : **pour une valeur économique disponible dans
l'entreprise, quelle combinaison de dispositifs maximise la situation globale du
dirigeant, compte tenu de ses objectifs, de sa fiscalité, de son régime social,
de ses droits futurs et des contraintes réglementaires ?**

---

## Ce qui est livré

| Élément | Chemin | Rôle |
|---|---|---|
| Simulateur autonome | `simulateur-dirigeant.html` | Un seul fichier à ouvrir dans un navigateur. Aucune installation, aucune ressource externe, aucune requête réseau : la saisie ne quitte jamais le poste. |
| Référentiel de règles | `rules/parameters/2026.yaml` | Toutes les constantes réglementaires, sourcées, datées, versionnées, avec un niveau de confiance. |
| Moteur Python | `engine/`, `optimizer/`, `explain/` | Implémentation de référence, testable et intégrable. |
| Moteur JavaScript | `ui/moteur.js` | Portage fidèle, vérifié ligne à ligne contre le moteur Python. |
| Bibliothèque de cas | `tests/cases/bibliotheque.py` | Les 17 cas du § 31 plus 5 cas limites, anonymisés et synthétiques. |
| Tests | `tests/` | 214 tests : barèmes calculés à la main, invariants, non-régression des défauts corrigés. |
| Vérification croisée | `build/verifier.js` | 6 336 comparaisons Python / JavaScript sur 7 objectifs, tolérance 0,01 €. |

---

## Démarrage

### Utiliser le simulateur

Ouvrir `simulateur-dirigeant.html` dans un navigateur. Le menu « charger un cas
type » précharge les 22 cas de la bibliothèque.

### Faire tourner le moteur Python

```bash
pip install pyyaml pytest
python -m pytest tests -q
```

```python
from api import simuler
from engine.modeles import Contexte, Entreprise, Dirigeant, Foyer

ctx = Contexte(
    entreprise=Entreprise(forme="SARL", ca_ht=600_000,
                          resultat_avant_remuneration=180_000,
                          capital_social=10_000,
                          compte_courant_associe_moyen=20_000,
                          nb_salaries=2, masse_salariale=70_000,
                          pee_existant=True, pereco_existant=True),
    dirigeant=Dirigeant(fonction="gerant_majoritaire", detention=1.0,
                        remuneration_actuelle=90_000, dividendes_actuels=30_000),
    foyer=Foyer(situation="couple", nb_enfants=2),
)
sortie = simuler(ctx, objectif="compromis")
print(sortie["niveau_1_client"]["phrase"])
```

### Reconstruire le simulateur après une modification

```bash
python build/export.py      # YAML -> ui/params.json + rejeu des cas Python
node   build/verifier.js    # vérification croisée Python / JavaScript
python build/bundle.py      # assemblage du fichier HTML autonome
```

Ces trois commandes doivent passer avant tout commit. `verifier.js` échoue si les
deux moteurs divergent de plus d'un centime sur un seul indicateur.

---

## Architecture en trois couches

```
rules/       référentiel métier      -> aucune règle dans le code
engine/      moteur déterministe     -> applique les règles, ne les réinvente pas
optimizer/   affectation marginale   -> les seuils émergent des règles
explain/     restitution             -> trois niveaux de lecture + journal
ui/          interface               -> portage JS du moteur + rendu
```

Voir `docs/architecture.md` et `docs/methodology.md`.

---

## Garde-fous implémentés

- **Conservation des euros.** Chaque évaluation vérifie quatre contrôles : deux
  identités comptables (société et dirigeant), un contrôle **non tautologique**
  de la décomposition de la rémunération — la somme des lignes de cotisation et
  du net perçu doit reconstituer le coût entreprise — et un contrôle de
  prélèvement sur réserves. Un écart supérieur à 0,51 € rend le scénario impossible.
- **Aucun scénario juridiquement impossible n'est recommandé.** L'épargne
  salariale est exclue d'office en l'absence de salarié distinct du dirigeant.
- **Score de robustesse A–E**, distinct de la performance économique, avec ses
  motifs. Un score E n'est jamais proposé.
- **Moteur d'incertitude.** Si une règle de confiance faible est mobilisée sur un
  montant matériellement important, le moteur refuse de conclure automatiquement.
- **Distinction stricte** entre PFU, prélèvements sociaux du capital et
  cotisations sociales professionnelles.
- **Un report d'imposition n'est jamais appelé « gain ».** L'épargne retraite est
  valorisée nette de la fiscalité de sortie estimée.
- **Les droits retraite sont produits en deux versions** : bruts (trimestres,
  points, rente annuelle) et monétisés. La monétisation repose sur des hypothèses
  actuarielles affichées, marquées `confidence: low` dans le référentiel.
- **La cotisation au-delà de 1 PASS n'est pas réputée sans droits** : la retraite
  complémentaire (RCI jusqu'à 4 PASS, Agirc-Arrco jusqu'à 8 PASS) reste
  contributive et le moteur la comptabilise comme telle.

---

## Points nécessitant une confirmation avant remise client

Ils sont listés automatiquement au niveau expert du simulateur. Les principaux :

1. **Décrochage du taux maladie TNS** à 3 ou 5 PASS — divergence entre sources.
2. **Prise en charge des cotisations par la société** — sous l'assiette unique
   post-réforme, le moteur la traite comme neutre en valeur globale et la classe
   en robustesse C. Le traitement fiscal du cas d'espèce doit être confirmé.
3. **Déductibilité des cotisations assises sur les dividendes** du revenu
   professionnel du gérant — pratique constante, non confirmée sur texte primaire.
4. **Prélèvements sociaux sur la rente PER** issue de versements déduits —
   lecture littérale de l'article L.136-8 CSS contre pratique de marché.
5. **Trimestres requis pour le taux plein** — la suspension de la réforme de 2023
   fait dépendre le barème de la date de liquidation.

Lorsque l'assiette sociale se situe entre 2,7 et 3,4 PASS, le moteur émet une
alerte dédiée et abaisse la robustesse en C : à cet endroit le résultat dépend
d'une discontinuité du barème maladie dont la position n'est pas confirmée. Ne
pas fonder une décision sur cet écart sans vérification.

---

## Périmètre de cette version

Couvert : SARL / EURL à l'IS avec gérant majoritaire TNS, SAS / SASU avec
président assimilé salarié, gérant minoritaire. Rémunération, dividendes et
seuil des 10 %, IS, IR du foyer, CEHR, CDHR, PER individuel, PEE, PERECO,
abondement, intéressement, optimisation marginale multicritère, projection des
droits, détection proactive, chronologie d'exécution, journal de décision.

Non couvert à ce stade : participation dérogatoire, PPV et PPVE (exclues pour le
dirigeant, documentées dans le référentiel), holdings et intégration fiscale,
comparaison chiffrée SARL → SAS avec coûts de transformation, scénarios de vie,
analyse de sensibilité automatisée, projection pluriannuelle.
