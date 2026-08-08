# Journal des versions

## Référentiel 1.1.0 / Moteur 1.1.0 — 8 août 2026

Version issue d'un audit croisé du référentiel, du moteur Python, du moteur
JavaScript et du simulateur. **Cette version corrige deux erreurs de barème qui
faussaient l'arbitrage dans les deux statuts : les résultats produits par la
version 1.0.1 ne doivent pas être réutilisés.**

### Corrections critiques du référentiel

- **Cotisation maladie TNS (SOCIAL_TNS_002)** — le taux de 6,50 % applicable
  au-delà de 3 PASS était appliqué à la TOTALITÉ de l'assiette. L'art. D.621-1
  CSS en fait un taux MARGINAL sur la seule fraction excédant 3 PASS, le taux de
  base restant à 8,50 % en deçà. Le barème est désormais continu et strictement
  croissant. Confiance relevée à `high` (texte primaire lu sur Légifrance).
- **Suppression de la « falaise » à 3 PASS** — conséquence directe du point
  précédent : la discontinuité descendante d'environ 2 900 €, présentée comme le
  garde-fou principal de l'outil, était un artefact du référentiel. L'alerte
  `TNS_FALAISE_MALADIE` et la dégradation de robustesse en C ont été retirées, au
  profit d'une information factuelle sur la baisse du taux marginal.
- **Taux Agirc-Arrco (SOCIAL_AS_002)** — les taux portés étaient les taux
  CONTRACTUELS (6,20 % en T1, 17,00 % en T2) alors qu'ils étaient étiquetés
  « appelé ». Remplacés par les taux appelés 7,87 % (3,15 / 4,72) et 21,59 %
  (8,64 / 12,95). L'erreur sous-estimait les cotisations d'environ 21 % et
  surestimait donc le net de tout dirigeant assimilé salarié.
- **Assiette minimale maladie** — le minimum de 40 % du PASS a été retiré de la
  cotisation maladie : il ne concerne que la cotisation IJ (art. D.621-3 CSS).
- **Plafond des indemnités journalières (SOCIAL_TNS_003)** — ramené de 1/730 de
  3 PASS à 1/730 de 1 PASS (65,84 €/jour). Le plafond de 3 PASS ne vaut que pour
  les professions libérales réglementées. La valorisation des droits générés
  était surestimée d'un facteur 3.

### Corrections du moteur

- **Option pour le barème rendue globale** (art. 200 A, 2 CGI) — les revenus du
  capital du foyer extérieurs au scénario restaient au PFU pendant que les
  dividendes passaient au barème. L'option emporte désormais les deux, avec CSG
  déductible et réintégration au RFR. Une recommandation pouvait être inversée
  pour un foyer à TMI faible disposant de revenus de capital importants.
- **Valorisation de l'épargne symétrisée** — la fiscalité de sortie était
  débitée sur des gains projetés qui n'étaient jamais crédités : le PER et
  l'épargne salariale étaient mécaniquement sous-alloués. Chaque poche est
  désormais capitalisée, nette de sa fiscalité de sortie, puis actualisée pour
  être comparable au net immédiat.
- **Fiscalité différée du PER** — assise sur la seule fraction déduite pour
  l'IR, et sur les plus-values pour le PFU.
- **Optimiseur : état incohérent après garde-fou** — lorsque le garde-fou
  retenait la situation actuelle, l'affinage du PER et le test de l'option
  barème repartaient de l'allocation qui venait d'être écartée, et pouvaient la
  réintroduire. Ils repartent désormais de la base réellement retenue.
- **Plafonds assis sur N-1** — ils étaient calculés sur un coût entreprise et
  non sur un revenu imposable, ce qui les surestimait de près de moitié. Un
  champ « revenu professionnel N-1 » a été ajouté ; à défaut, le coût est
  converti en imposable par le barème du statut.
- **Condition morte dans l'optimiseur** — `pee_existant is not None`, toujours
  vraie, supprimée.
- **Cotisation IJ minimale** (96 €) désormais appliquée : le paramètre était
  déclaré au référentiel mais jamais lu.
- **IR affiché** — inclut le prélèvement forfaitaire des revenus du capital hors
  scénario, que le net immédiat déduisait déjà.
- **RFR** — la CSG déductible du capital est réintégrée (art. 1417 IV CGI).

### Contrôles et tests

- **Contrôles de conservation rendus non tautologiques** —
  `CONSERVATION_SOCIETE` et `CONSERVATION_DIRIGEANT` recomposaient le résultat
  avec la formule qui l'avait produit : ils ne pouvaient pas échouer. Ils
  partent désormais de la décomposition ligne à ligne des cotisations, si bien
  qu'une ligne oubliée, dupliquée ou mal attribuée les fait échouer.
- Nouveaux tests de non-régression : monotonie de la cotisation maladie sur tout
  le domaine, monotonie du net au franchissement de 3 PASS, continuité du barème,
  symétrie de la valorisation de l'épargne.
- Tests vides ou tautologiques corrigés : le cas `cdhr` n'avait aucune
  assertion, le cas `versement` portait sur un dict toujours non vide, et le
  contrôle des actions client se contentait d'un `is not None`. Chaque paramètre
  est désormais testé sur un contexte où il mord réellement.

### Référentiel et restitution

- Nouvelle section `politique_cabinet` : les seuils de matérialité, les
  pénalités de robustesse et le seuil de signalement du plafond PER inutilisé
  sont sortis du code. Ils ne sont pas réglementaires et sont désormais
  auditables comme le reste.
- Le taux du seuil des 10 % n'est plus dupliqué en dur dans les alertes des deux
  moteurs : il est lu au référentiel, comme dans le calcul principal.
- Confiance de la CSG/CRDS d'activité relevée à `high` (art. L.136-8 I 1° CSS).

### Simulateur

- **Google Fonts retiré** — l'appel envoyait l'adresse IP de l'utilisateur à un
  tiers à chaque ouverture, y compris en contexte de dossier client, ce qui
  contredisait la promesse « aucune donnée ne quitte votre navigateur ». Le
  fichier ne contient plus aucune ressource externe.
- **Validation des saisies** — bornes `min`/`max` sur tous les champs numériques
  et contrôle de vraisemblance bloquant. Un résultat négatif, un âge de −5 ans ou
  une détention de 500 % produisaient auparavant un chiffrage « conforme ».
- **Hypothèses figées exposées** — ancienneté de la société, capital libéré,
  détention par des personnes physiques, affiliation cadre, ancienneté du
  conjoint salarié et multiples d'abondement étaient codés en dur dans la lecture
  du formulaire tout en conditionnant le taux d'IS réduit et l'accès à l'épargne
  salariale. Ils sont désormais saisissables.
- **Accessibilité** — labels associés à leurs champs, onglets avec rôles ARIA,
  zone de résultat annoncée aux lecteurs d'écran.

### Vérification

- 213 tests passent.
- Parité Python / JavaScript vérifiée sur 6 336 valeurs, écart nul à 0,01 € près.


## Référentiel 1.0.0 — 8 août 2026

Première version. Millésime réglementaire 2026.

- Assiette sociale unique des indépendants (abattement de 26 %, plancher 1,76 %
  du PASS, plafond 130 % du PASS).
- Barèmes de cotisations TNS et assimilé salarié 2026, PASS 48 060 €.
- Prélèvements sociaux du capital portés à 18,6 % ; liste limitative des produits
  restés à 17,2 %.
- Barème IR indexé de 0,9 % ; CDHR reconduite pour les revenus 2026.
- Plafonds d'épargne salariale 2026 : abondement PEE 3 844,80 €, PERECO
  7 689,60 €, intéressement individuel 36 045 €.
- Plafonds PER 2026 : 37 680 € (droit commun), 88 911 € (TNS).
- Report des plafonds PER porté à 5 ans à compter de 2026, sans rétroactivité.

## Moteur 1.0.0 — 8 août 2026

- Architecture en trois couches, référentiel YAML sourcé et versionné.
- Qualification automatique du statut (SARL / EURL / SAS / SASU / EI).
- Anatomie des cotisations ligne à ligne, avec droits générés et caractère.
- Module dividendes avec seuil des 10 % et attribution marginale des cotisations.
- IS, IR du foyer, CEHR, CDHR, PER, PEE, PERECO, abondement, intéressement.
- Optimiseur marginal par blocs avec raffinement local et garde-fou.
- Score de robustesse A–E, moteur d'incertitude, journal de décision.
- Restitution à trois niveaux, chronologie d'exécution, détection proactive.
- 154 tests, 17 cas types, 3 060 comparaisons croisées Python / JavaScript.

## Moteur 1.1.0 / référentiel 1.0.1 — 8 août 2026

Correctifs issus d'une revue critique croisée du moteur (11 défauts confirmés
par exécution, tous présents à l'identique dans les deux implémentations).

**Corrections de calcul**

- La situation actuelle reprend désormais les dividendes réellement versés, y
  compris lorsqu'ils proviennent des réserves. Ils étaient auparavant plafonnés
  au résultat de l'exercice, ce qui faussait la base de comparaison affichée au
  client.
- Les revenus du capital extérieurs à la simulation sont imposés au PFU : nets
  d'IR et de prélèvements sociaux dans le net immédiat, bruts dans le RFR, et
  leur IR forfaitaire s'impute désormais sur la CDHR.
- Le coût collectif de l'abondement intègre le PERECO, qui en était absent, et
  suit une formule continue : le premier euro d'abondement ne déclenche plus une
  marche d'escalier qui rendait le levier inatteignable.
- Le plafonnement du quotient familial traite la part entière du premier enfant
  du parent isolé (4 262 €). Le paramètre existait au référentiel et n'était pas lu.
- La fiscalité différée du PER porte sur la seule fraction déductible du versement.
- Les prélèvements sociaux de sortie de l'épargne salariale sont estimés sur les
  plus-values projetées, de façon symétrique au traitement du PER.
- Les réserves distribuables sont devenues un levier réel de l'optimiseur.
- La discontinuité du barème patronal à 1 PASS (déclenchement de la CET) est
  tracée : le coût réellement engagé est retenu et l'écart signalé.

**Garde-fous renforcés**

- Nouveau contrôle non tautologique `DECOMPOSITION_REMUNERATION` : la somme des
  lignes de cotisation et du net perçu doit reconstituer le coût entreprise.
- Nouveau contrôle `PRELEVEMENT_SUR_RESERVES` : une distribution excédant le
  résultat de l'exercice est signalée et bloquée si elle dépasse les réserves.
- Nouvelle alerte `TNS_FALAISE_MALADIE` et dégradation de la robustesse en C
  lorsque l'assiette se situe entre 2,7 et 3,4 PASS, zone où le résultat dépend
  d'une discontinuité du barème non confirmée sur source primaire.
- La détection proactive teste désormais la situation actuelle **et** la
  recommandation : un optimum peut se placer sur un seuil que l'existant ne
  touche pas.

**Référentiel**

- Paramètres jusqu'alors codés en dur remontés au référentiel et effectivement
  lus : seuils d'effectif du forfait social, coefficient de lissage de la CDHR,
  taux du plafond de versement volontaire, taux et plafonds du PER, taux du
  seuil des 10 % sur dividendes, plafond du parent isolé.

**Couverture**

- 5 nouveaux cas types (18 à 22) : réserves distribuables, parent isolé, revenus
  du capital extérieurs déclenchant la CDHR, assiette au voisinage de 3 PASS,
  effectif au-delà des seuils du forfait social.
- 10 tests de non-régression dédiés aux défauts corrigés.
- Vérification croisée étendue à 7 objectifs : 6 336 comparaisons Python /
  JavaScript, écart nul.
