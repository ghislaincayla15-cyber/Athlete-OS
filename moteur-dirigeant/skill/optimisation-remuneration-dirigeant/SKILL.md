---
name: optimisation-remuneration-dirigeant
description: >-
  Méthode, ordre des vérifications, hiérarchie des sources, garde-fous et
  conventions de calcul pour arbitrer la rémunération d'un dirigeant : salaire,
  dividendes, trésorerie conservée, PER individuel, PEE, PERECO, abondement,
  intéressement, prise en charge de cotisations. Déclencher dès que la
  conversation porte sur la rémunération d'un dirigeant, le choix entre salaire
  et dividendes, le seuil des 10 % en SARL, le statut TNS ou assimilé salarié,
  l'assiette sociale des indépendants, l'accès du dirigeant à l'épargne
  salariale, l'arbitrage SARL / SAS, ou dès que l'utilisateur demande combien se
  verser, comment se rémunérer, ou ce qu'il reste au dirigeant pour un euro
  dépensé par la société. Déclencher aussi sur : « salaire ou dividendes »,
  « net en poche du gérant », « optimiser ma rémunération », « abondement PEE »,
  « intéressement du dirigeant », « plafond PER du TNS ».
---

# Optimisation de la rémunération du dirigeant

## Ce que ce skill impose

Répondre à quatre questions, **dans cet ordre**, jamais dans un autre :

1. Qu'est-ce qui est juridiquement possible ?
2. Combien chaque option coûte réellement à l'entreprise ?
3. Qu'est-ce que le dirigeant reçoit réellement en contrepartie ?
4. Quelle combinaison répond le mieux à son objectif — objectif qui doit être nommé ?

La fiscalité n'est qu'une composante. Toute réponse intègre : social + fiscal +
PASS et tranches + droits acquis + liquidité + horizon + risque réglementaire +
coût entreprise + patrimoine futur.

## Ordre des vérifications

1. **Qualifier le statut** avant tout calcul. SARL / EURL avec gérant majoritaire
   (majorité appréciée avec le conjoint, le partenaire pacsé, les enfants mineurs
   et le collège de gérance) → TNS, rémunération imposée selon l'article 62 du CGI.
   SAS / SASU, gérant minoritaire ou égalitaire → assimilé salarié. Énoncer la
   qualification et son fondement.
2. **Filtrer les scénarios impossibles** avant d'optimiser. En particulier :
   l'épargne salariale suppose au moins un salarié **autre que le dirigeant** et
   moins de 250 salariés. Sans salarié, PEE, PERECO et intéressement sont hors jeu.
3. **Raisonner à enveloppe économique constante** : résultat avant rémunération
   du dirigeant et avant IS. Sans cela, la comparaison salaire / dividendes /
   trésorerie n'a pas de sens.
4. **Décomposer les prélèvements**, jamais un taux global seul.
5. **Chiffrer les droits acquis en contrepartie**, séparément de la monétisation.
6. **Attribuer un score de robustesse** distinct de la performance économique.
7. **Produire une chronologie d'exécution** avec documents et preuves à conserver.

## Distinctions à ne jamais confondre

| À distinguer | Pourquoi |
|---|---|
| PFU (12,8 % d'IR) | c'est de l'impôt sur le revenu |
| Prélèvements sociaux du capital | ils ne créent aucun droit — taux au référentiel du millésime, jamais de mémoire |
| Cotisations sociales professionnelles TNS | elles créent des droits, partiellement |
| Économie d'impôt immédiate | ce n'est pas un gain si c'est un report |
| Droits bruts (trimestres, points, rente) | ils viennent des règles |
| Valeur monétisée de ces droits | elle vient d'hypothèses actuarielles |

## Garde-fous non négociables

- **Ne jamais inventer un taux.** Vérifier sur source primaire avant de citer un
  taux, un plafond ou un seuil, et indiquer l'année de référence.
- **Ne jamais présenter une cotisation au-delà de 1 PASS comme dépourvue de
  droits.** La retraite complémentaire reste contributive : RCI jusqu'à 4 PASS,
  Agirc-Arrco jusqu'à 8 PASS. Ce qui n'ouvre pas de droits proportionnels, c'est
  la part déplafonnée de la retraite de base, les allocations familiales, la CSG,
  la CRDS, la CEG et le différentiel entre taux appelé et taux contractuel
  Agirc-Arrco. Attention au piège symétrique : le taux d'appel majore la
  cotisation DUE sans créer de points, mais c'est bien le taux APPELÉ qui est
  précompté. Confondre les deux sous-estime les cotisations d'environ 21 %.
- **Ne jamais appeler « gain » un report d'imposition.** Un versement PER se
  compare nécessairement à la fiscalité de sortie estimée.
- **Ne jamais valoriser arbitrairement des droits retraite.** Afficher la durée
  de service de la rente, le taux d'actualisation et le taux d'imposition retenus.
- **Ne jamais supposer que la prise en charge de cotisations par la société est
  neutre ou automatiquement déductible.** Sous l'assiette unique post-réforme,
  elle n'ouvre pas de gain mécanique : elle est déjà comprise dans le coût
  entreprise. Le traitement du cas d'espèce doit être confirmé.
- **Ne jamais considérer qu'attendre un an suffit à sécuriser un dispositif
  ouvert grâce à un conjoint salarié.** Ce qui compte est la réalité de l'emploi :
  fonctions effectives, rémunération cohérente avec le poste, temps de travail,
  déclarations sociales, lien de subordination lorsqu'il est requis.
- **Ne jamais recommander une stratégie mathématiquement optimale mais
  juridiquement impossible.**
- **Ne jamais oublier le coût collectif.** L'épargne salariale est collective :
  l'abondement et l'intéressement s'appliquent à tous les bénéficiaires.
- **Savoir dire « je ne peux pas conclure ».** Texte ambigu, jurisprudence
  contradictoire, doctrine manquante, donnée client insuffisante, règle récemment
  modifiée, montant matériellement important → bloquer la recommandation
  automatique, expliquer, fournir les sources, demander une validation humaine.

## Hiérarchie des sources

Textes en vigueur (Légifrance) → code de la sécurité sociale et code général des
impôts → code du travail → doctrine administrative opposable (BOFiP) → URSSAF et
BOSS → caisses de retraite → jurisprudence → réponses ministérielles →
documentation des teneurs de compte et assureurs pour les caractéristiques
contractuelles → documentation secondaire pour contextualiser seulement.

Conserver la source primaire qui fonde le calcul. Avant toute réponse chiffrée,
exécuter le pipeline de vérification du skill `legal-fiscal-grounding`.

## Conventions de calcul

- **Assiette sociale TNS** : revenu brut = coût total supporté par la société,
  puis abattement forfaitaire de 26 %, planché et plafonné. Le calcul n'est plus
  circulaire depuis la réforme de l'assiette unique.
- **Coût entreprise d'un assimilé salarié** : le mandataire social ne cotise ni à
  l'assurance chômage ni à l'AGS et n'accède pas à la réduction générale. Le taux
  patronal réel est donc inférieur aux 42-45 % couramment cités pour un salarié.
- **Seuil des 10 % en SARL** : montant de référence = capital social libéré +
  primes d'émission détenus par le dirigeant et ses proches + **solde moyen
  annuel** des comptes courants d'associés, apprécié au dernier jour de l'exercice
  précédent. Ce n'est pas le solde ponctuel.
- **Impôt sur le revenu** : recalculer le foyer entier — quotient familial,
  plafonnement, décote. Ne pas appliquer mécaniquement une TMI de table.
- **Conservation** : tout euro doit être traçable de la société jusqu'au
  patrimoine du dirigeant, aux prélèvements ou à la trésorerie résiduelle.

## Forme de la restitution

Trois niveaux, à choisir selon l'interlocuteur.

**Niveau client** — recommandation, gain chiffré, raison, actions. Phrases
courtes, pas de jargon non expliqué, conclusion d'abord.

**Niveau conseiller** — coût société, net, IR, cotisations, épargne, droits,
fiscalité différée, comparaison des scénarios, risques, chronologie, hypothèses.

**Niveau expert** — formules, paramètres, textes, doctrine, version des règles,
détail des calculs, journal de décision.

Ne jamais écrire « optimal » sans dire pour quel objectif : « optimale pour
maximiser le net immédiat », « optimale pour maximiser le patrimoine à 10 ans »,
« optimale sous contrainte de liquidité », « meilleur compromis entre net,
retraite et robustesse ».

## Outil associé

Le moteur déterministe correspondant est livré séparément : simulateur HTML
autonome et référentiel de règles versionné (`rules/parameters/<millésime>.yaml`).
Ce YAML est la SEULE source à éditer : `ui/params.json`, `build/attendus.json` et
le HTML autonome en sont dérivés par `build/export.py` puis `build/bundle.py`.
Modifier `params.json` directement fait diverger les deux moteurs sans que le
vérificateur de parité ne le signale.
L'IA explique, contextualise et détecte des pistes ; elle n'improvise pas les
montants. Si un chiffre est nécessaire, le produire avec le moteur, pas de tête.
