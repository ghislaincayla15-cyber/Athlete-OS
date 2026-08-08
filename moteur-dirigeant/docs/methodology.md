# Méthodologie

## Hiérarchie des sources appliquée

1. Textes législatifs et réglementaires en vigueur (Légifrance, texte consolidé lu).
2. Code de la sécurité sociale, code général des impôts, code du travail.
3. Doctrine administrative opposable (BOFiP).
4. URSSAF, BOSS, caisses de retraite (CNAV, Agirc-Arrco).
5. Sources professionnelles spécialisées, pour recoupement uniquement.

Chaque paramètre du référentiel porte `source_reference`, `last_verified` et
`confidence`. Le moteur remonte au niveau expert la liste des règles réellement
mobilisées par la simulation en cours, et isole celles dont la confiance n'est
pas « high ».

## Niveaux de confiance

| Niveau | Signification | Conséquence dans le moteur |
|---|---|---|
| `high` | Texte primaire lu, ou deux sources officielles concordantes | Aucune |
| `medium` | Deux sources professionnelles concordantes, texte primaire non lu | Affiché au niveau expert, signalé au conseiller |
| `low` | Une seule source, ou divergence non tranchée | Bloque la conclusion automatique si le montant en jeu est matériellement important |

## Conventions de calcul

**Enveloppe économique.** Toutes les comparaisons se font à *résultat avant
rémunération du dirigeant et avant IS* constant. C'est la seule façon de
comparer rémunération, dividendes, abondement et trésorerie sans biais.

**Assiette sociale TNS.** Depuis la réforme de l'assiette unique, le calcul n'est
plus circulaire : le revenu brut correspond au coût total supporté par la société,
et l'abattement forfaitaire de 26 % (planché et plafonné) remplace la déduction
des cotisations réellement payées. Le moteur est donc déterministe et non itératif.

**Coût entreprise pour l'assimilé salarié.** L'inverse du barème patronal est
obtenu par dichotomie sur le brut, à 10⁻⁷ € près.

**Attribution marginale des cotisations sur dividendes.** Les cotisations dues sur
la fraction de dividendes excédant le seuil des 10 % sont calculées comme la
différence entre les cotisations sur (rémunération + fraction) et les cotisations
sur la rémunération seule. C'est l'attribution économiquement significative
lorsque les barèmes sont progressifs.

**Impôt sur le revenu.** Recalculé sur le foyer entier : quotient familial,
plafonnement, décote. Le taux marginal affiché est mesuré empiriquement sur
100 € supplémentaires, décote et plafonnement inclus — pas lu dans une table.

**Coût collectif.** Un dispositif d'épargne salariale est collectif par nature.
Le moteur chiffre l'abondement des autres bénéficiaires selon un taux d'adhésion
paramétrable, et la quote-part d'intéressement revenant aux salariés. Ces montants
apparaissent en clair au niveau conseiller.

**Valorisation des droits sociaux.** Deux sorties distinctes, jamais confondues :
les droits bruts (trimestres, points, rente annuelle), qui découlent des règles
des régimes ; et la valeur actuelle monétisée, qui repose sur une durée de service
de la rente, un taux d'actualisation réel et un taux d'imposition à la retraite —
trois hypothèses non réglementaires, marquées `low` et affichées à chaque
restitution.

**Trésorerie conservée.** Valorisée pour le dirigeant à un coefficient
d'extraction future paramétrable (75 % par défaut), et jamais comptée comme de la
liquidité personnelle dans le score multicritère.

## Fonctions objectif

| Objectif | Métrique maximisée |
|---|---|
| `net_immediat` | Revenu immédiatement disponible |
| `patrimoine_net` | Valeur globale (patrimoine personnel + trésorerie valorisée) |
| `patrimoine_personnel` | Patrimoine du dirigeant seul |
| `retraite` | Épargne retraite + valeur actuelle des droits |
| `impot_immediat` | Opposé de (IR + CEHR + CDHR + IS) |
| `liquidite` | Net immédiat + trésorerie |
| `compromis` | Moyenne pondérée de sept composantes, toutes exprimées en euros de valeur |

Le moteur n'affirme jamais qu'une solution est « optimale » sans nommer
l'objectif : la restitution client commence par « Stratégie optimale pour… ».

## Procédure de mise à jour réglementaire

1. Recherche sur sources primaires (Légifrance, BOFiP, URSSAF, BOSS).
2. Modification du seul fichier `rules/parameters/<millésime>.yaml`, avec
   `source_reference`, `last_verified` et `confidence` mis à jour.
3. `python build/export.py` puis `python -m pytest tests -q`.
4. `node build/verifier.js` — les deux moteurs doivent rester identiques.
5. `python build/bundle.py`.
6. Entrée dans `changelog/CHANGELOG.md`, incrément de `meta.version_referentiel`.

Le moteur de production ne modifie jamais une règle de lui-même parce qu'un agent
a trouvé une page différente.
