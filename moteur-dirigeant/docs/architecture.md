# Architecture

## Principe : trois couches strictement séparées

```
  rules/parameters/2026.yaml
        │  (aucune constante réglementaire ailleurs)
        ▼
  engine/params.py  ──────────────► ui/params.json ──► ui/moteur.js
        │  accès tracé                (export)          (portage JS)
        ▼
  engine/*.py            moteur déterministe
        ▼
  optimizer/marginal.py  affectation marginale et fonctions objectif
        ▼
  explain/*.py           restitution, alertes, journal de décision
        ▼
  api.py                 point d'entrée unique
```

## Modules du moteur

| Module | Responsabilité |
|---|---|
| `engine/params.py` | Chargement du référentiel, accès **tracé** (chaque lecture alimente le journal), barème progressif à taux unique, découpe en tranches. |
| `engine/modeles.py` | Dataclasses d'entrée (`Entreprise`, `Dirigeant`, `Foyer`, `Objectifs`, `Hypotheses`, `Allocation`) et de sortie (`Resultat`, `LigneCotisation`, `Droits`). |
| `engine/statut.py` | Qualification du statut social et fiscal, explicite et justifiée. Éligibilité à l'épargne salariale. |
| `engine/social_tns.py` | Assiette unique post-réforme, anatomie ligne à ligne des cotisations TNS. |
| `engine/social_assimile.py` | Cotisations du mandataire social assimilé salarié, inversion du barème patronal par dichotomie. |
| `engine/ir.py` | Barème, quotient familial et son plafonnement, décote, TMI réel mesuré à la marge, CEHR, CDHR. |
| `engine/entreprise.py` | IS et taux réduit, capacité distributive, montant de référence du seuil des 10 %. |
| `engine/dividendes.py` | Répartition de part et d'autre du seuil social, PFU ou barème. |
| `engine/per.py` | Plafonds de déduction (droit commun et TNS), valorisation nette de sortie. |
| `engine/epargne_salariale.py` | Plafonds, coût collectif, forfait social, contrôles bloquants. |
| `engine/retraite.py` | Trimestres, points RCI et Agirc-Arrco, rente, valorisation actuarielle. |
| `engine/scenario.py` | Assemblage complet et **contrôles de conservation**. |
| `optimizer/marginal.py` | Allocation gloutonne par blocs, raffinement local par échanges, garde-fou sur la situation actuelle, fonctions objectif. |
| `explain/alertes.py` | Détection proactive (§ 26). |
| `explain/restitution.py` | Trois niveaux de lecture, chronologie, journal de décision, moteur d'incertitude. |

## Anatomie d'une cotisation

Chaque cotisation est produite comme une `LigneCotisation` portant : code,
libellé, assiette, taux, montant, payeur, **droits générés** et **caractère**
(`contributif`, `contributif_partiel`, `solidarite`). Le moteur n'affiche jamais
un taux global sans sa décomposition, et le niveau conseiller indique quelle part
des prélèvements finance des droits personnels.

## Optimisation marginale

L'état d'allocation est un vecteur en coût entreprise :
`(rémunération, abondement PEE, abondement PERECO, intéressement, dividendes, trésorerie)`.

1. L'enveloppe part intégralement en trésorerie.
2. Chaque bloc de `pas` euros est déplacé vers le levier qui améliore le plus la
   fonction objectif. Les candidats juridiquement impossibles ou dont le net
   immédiat serait négatif (versements personnels non finançables) sont écartés.
3. Un raffinement local échange des blocs entre leviers jusqu'à stabilisation :
   l'allocation gloutonne seule est myope.
4. Un garde-fou compare le résultat à la situation actuelle sur la même métrique.
5. Le versement PER individuel est ajusté ensuite : il est financé sur le net du
   dirigeant, pas sur l'enveloppe de l'entreprise.
6. L'option pour le barème sur les dividendes est testée en dernier.

Les seuils de bascule ne sont écrits nulle part : ils **émergent** des plafonds
d'abondement, du seuil des 10 %, des tranches de PASS, d'IS et d'IR.

## Double implémentation

`ui/moteur.js` est un portage fidèle du moteur Python. Les deux lisent le même
référentiel. `build/verifier.js` rejoue les 17 cas × 5 scénarios et compare
3 060 valeurs avec une tolérance de 0,01 €. Toute divergence fait échouer le
build. Cette redondance est délibérée : elle transforme le simulateur navigateur
en test permanent du moteur de référence.
