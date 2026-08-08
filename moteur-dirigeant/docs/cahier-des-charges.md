# Moteur d'optimisation patrimoniale du dirigeant

## Cahier des charges métier --- Référentiel de règles

**Version :** 0.1\
**Statut :** spécification fonctionnelle initiale\
**Objet :** construire un moteur de simulation, d'optimisation et
d'explication des arbitrages de rémunération, dividendes, protection
sociale, retraite et épargne salariale du dirigeant.

> Principe directeur : le moteur ne doit pas seulement calculer. Il doit
> **comprendre, comparer, justifier, sourcer, expliquer et
> recommander**.

------------------------------------------------------------------------

# 1. Vision du projet

L'outil doit répondre à une question centrale :

> **Pour une valeur économique disponible dans l'entreprise, quelle
> combinaison de dispositifs maximise la situation globale du dirigeant
> compte tenu de ses objectifs, de sa fiscalité, de son régime social,
> de ses droits futurs et des contraintes réglementaires ?**

Le moteur doit notamment comparer :

-   rémunération ;
-   dividendes ;
-   conservation de trésorerie dans la société ;
-   intéressement ;
-   participation ;
-   prime de partage de la valeur lorsque pertinente ;
-   PEE ;
-   PERECO / dispositif collectif de retraite applicable ;
-   abondement employeur ;
-   PER individuel ;
-   prise en charge de cotisations sociales par la société lorsque
    juridiquement possible ;
-   autres dispositifs futurs intégrés au référentiel.

Le résultat ne doit jamais être fondé uniquement sur le **net
immédiat**. Il faut raisonner en valeur globale.

------------------------------------------------------------------------

# 2. Principes non négociables

## 2.1 Séparer connaissance métier, calcul et interface

Architecture en trois couches :

1.  **Référentiel métier** : règles, paramètres, sources, dates d'effet,
    exceptions et interprétations.
2.  **Moteur de calcul** : applique les règles sans les réinventer.
3.  **Moteur d'explication** : transforme les résultats en
    recommandations compréhensibles.

Aucune constante réglementaire importante ne doit être enfouie dans le
code.

## 2.2 Versionner les règles

Chaque règle doit comporter au minimum :

-   un identifiant unique ;
-   un intitulé ;
-   la population concernée ;
-   la formule ou logique ;
-   les paramètres utilisés ;
-   les exceptions ;
-   la date d'entrée en vigueur ;
-   la date de fin éventuelle ;
-   la source ;
-   la date de dernière vérification ;
-   le niveau de confiance ;
-   les tests associés.

Exemple :

``` yaml
rule_id: SOCIAL_TNS_001
title: Assiette d'une cotisation TNS
effective_from: YYYY-MM-DD
source_type: legislation
source_reference: "..."
last_verified: YYYY-MM-DD
confidence: high
```

## 2.3 Ne jamais inventer une règle

Une règle réglementaire doit être :

-   sourcée ;
-   datée ;
-   vérifiable ;
-   versionnée.

Lorsqu'une réponse dépend d'une interprétation et non d'une règle
certaine, l'outil doit le signaler.

## 2.4 Calcul déterministe, interprétation par IA

Claude/Codex ne doit pas improviser les montants.

-   Le **moteur déterministe** calcule.
-   L'IA explique, contextualise, détecte des pistes et formule la
    restitution.
-   Une recherche documentaire peut confirmer ou mettre à jour une règle
    avant intégration.

------------------------------------------------------------------------

# 3. Hiérarchie des sources

Le projet peut utiliser les MCP disponibles pour interroger des bases
juridiques et documentaires.

Hiérarchie indicative :

1.  textes législatifs et réglementaires en vigueur ;
2.  Code de la sécurité sociale ;
3.  Code général des impôts ;
4.  doctrine administrative opposable lorsqu'elle est pertinente ;
5.  URSSAF ;
6.  organismes de retraite et caisses compétentes ;
7.  Bulletin officiel de la sécurité sociale ;
8.  jurisprudence ;
9.  réponses ministérielles ;
10. documentation des teneurs de compte et assureurs pour les
    caractéristiques contractuelles ;
11. documentation secondaire uniquement pour contextualiser ou détecter
    une piste.

Le système doit conserver la **source primaire** qui fonde le calcul.

------------------------------------------------------------------------

# 4. Données d'entrée

## 4.1 Entreprise

-   forme juridique ;
-   régime fiscal : IR / IS ;
-   activité ;
-   chiffre d'affaires ;
-   résultat avant rémunération du dirigeant ;
-   résultat fiscal ;
-   trésorerie disponible ;
-   capitaux propres ;
-   capital social ;
-   primes d'émission ;
-   comptes courants d'associés ;
-   réserves distribuables ;
-   nombre de salariés ;
-   masse salariale ;
-   ancienneté de l'entreprise ;
-   présence d'un conjoint salarié ;
-   présence d'autres bénéficiaires ;
-   dispositifs d'épargne salariale existants ;
-   accords existants ;
-   convention collective si pertinente.

## 4.2 Dirigeant

-   statut juridique ;
-   statut social ;
-   pourcentage de détention ;
-   détention directe et indirecte ;
-   composition du collège de gérance lorsque nécessaire ;
-   rémunération actuelle ;
-   dividendes actuels ;
-   autres revenus professionnels ;
-   autres revenus du foyer ;
-   situation matrimoniale ;
-   nombre de parts fiscales ;
-   âge ;
-   caisse de retraite ;
-   profession réglementée éventuelle ;
-   protection sociale existante ;
-   objectifs patrimoniaux.

## 4.3 Foyer fiscal

-   revenu imposable ;
-   RFR ;
-   TMI ;
-   nombre de parts ;
-   revenus mobiliers ;
-   revenus fonciers ;
-   plus-values ;
-   charges déductibles ;
-   plafonds PER disponibles ;
-   CEHR / contributions additionnelles éventuellement applicables ;
-   autres éléments susceptibles de modifier le taux marginal réel.

## 4.4 Objectifs

Le moteur doit pouvoir optimiser selon plusieurs objectifs :

-   maximiser le revenu disponible immédiat ;
-   maximiser le patrimoine net ;
-   minimiser le coût entreprise ;
-   maximiser la retraite ;
-   maximiser la protection sociale ;
-   maximiser l'épargne capitalisée ;
-   limiter l'impôt immédiat ;
-   conserver de la liquidité ;
-   préparer une transmission ;
-   arbitrer consommation présente / patrimoine futur ;
-   obtenir un compromis multicritère.

------------------------------------------------------------------------

# 5. Qualification automatique du statut

Avant tout calcul, le moteur doit déterminer le régime applicable.

Cas à intégrer progressivement :

-   EI ;
-   EURL ;
-   SARL ;
-   SAS / SASU ;
-   SEL ;
-   sociétés civiles lorsque pertinent ;
-   structures holding ;
-   autres structures professionnelles.

Le moteur doit notamment distinguer :

-   TNS ;
-   assimilé salarié ;
-   salarié ;
-   dirigeant non rémunéré ;
-   situations mixtes.

La qualification doit être explicite et justifiée.

------------------------------------------------------------------------

# 6. Module « Anatomie des cotisations sociales »

Ce module est central.

Il doit expliquer **chaque couche** des prélèvements sociaux et non
simplement produire un taux global.

Pour chaque cotisation/contribution :

-   nom ;
-   assiette ;
-   taux ;
-   tranche ;
-   référence au PASS ;
-   minimum éventuel ;
-   maximum éventuel ;
-   caractère déductible ou non ;
-   organisme destinataire ;
-   droits personnels générés ;
-   nature des droits ;
-   caractère contributif ou de solidarité ;
-   effet marginal d'un euro supplémentaire de rémunération ;
-   interaction avec les autres cotisations.

## 6.1 PASS et tranches

Toutes les règles dépendant du PASS doivent être paramétrées par année.

Le moteur doit identifier les seuils :

-   fraction de PASS ;
-   1 PASS ;
-   multiples du PASS ;
-   plafonds propres aux régimes concernés.

## 6.2 Valeur marginale des cotisations

Pour chaque tranche supplémentaire de rémunération, calculer :

**Coût marginal entreprise → net immédiat → impôt → cotisations → droits
acquis.**

Le moteur doit pouvoir indiquer :

> « Sur les 1 000 € supplémentaires affectés à cette option, X €
> deviennent du revenu disponible, Y € financent des droits personnels,
> Z € correspondent à des prélèvements sans augmentation proportionnelle
> de droits. »

Attention : la qualification « sans droits » doit être fondée
juridiquement et techniquement, et non déduite automatiquement du
dépassement d'un PASS.

## 6.3 Retraite

Distinguer :

-   retraite de base ;
-   retraite complémentaire ;
-   trimestres ;
-   points ;
-   plafonds ;
-   rendement marginal ;
-   droits déjà saturés sur l'année.

L'outil doit éviter l'erreur consistant à considérer toute cotisation
au-delà de 1 PASS comme dépourvue de droits.

## 6.4 Protection sociale

Intégrer lorsque possible :

-   maladie ;
-   maternité ;
-   indemnités journalières ;
-   invalidité ;
-   décès ;
-   prévoyance obligatoire ;
-   allocations familiales ;
-   autres branches applicables.

------------------------------------------------------------------------

# 7. Réforme de l'assiette sociale des indépendants

Le référentiel doit intégrer la réforme de l'assiette sociale des
travailleurs indépendants avec :

-   année d'application ;
-   ancienne méthode ;
-   nouvelle méthode ;
-   assiette ;
-   abattements ou retraitements ;
-   conséquences sur cotisations ;
-   conséquences sur CSG/CRDS ;
-   conséquences sur droits ;
-   effets différenciés selon le niveau de revenu.

Prévoir des cas tests spécifiques pour :

-   faible revenu ;
-   1 PASS ;
-   2 PASS ;
-   hauts revenus ;
-   dividendes soumis aux cotisations.

------------------------------------------------------------------------

# 8. Module rémunération

Pour chaque montant de rémunération testé :

-   coût société ;
-   rémunération brute ou assiette pertinente ;
-   cotisations personnelles ;
-   cotisations prises en charge par la société ;
-   rémunération nette ;
-   montant imposable ;
-   IR marginal ;
-   net après IR ;
-   droits retraite ;
-   droits prévoyance ;
-   coût total pour obtenir 1 € net ;
-   valeur patrimoniale totale générée.

Le calcul doit fonctionner **à la marge**.

------------------------------------------------------------------------

# 9. Module dividendes

## 9.1 SAS / assimilé salarié

Distinguer correctement :

-   absence de cotisations sociales de travailleur indépendant sur les
    dividendes ;
-   prélèvements sociaux applicables aux revenus du capital ;
-   PFU ;
-   option éventuelle pour le barème ;
-   abattements applicables selon le régime fiscal ;
-   CEHR éventuelle ;
-   coût préalable de l'IS.

## 9.2 SARL / gérant majoritaire TNS

Le moteur doit déterminer la fraction de dividendes entrant
éventuellement dans l'assiette sociale en tenant compte des règles
applicables, notamment des éléments servant au seuil légal.

Il doit comparer :

-   dividendes sous le seuil ;
-   dividendes au-dessus du seuil ;
-   prélèvements sociaux sur la fraction concernée ;
-   cotisations sociales TNS lorsque applicables ;
-   fiscalité personnelle ;
-   coût IS préalable.

## 9.3 Prise en charge des cotisations par la société

Prévoir explicitement le cas où la société prend en charge les
cotisations sociales personnelles du dirigeant, y compris celles
afférentes à des dividendes lorsqu'une telle prise en charge est
juridiquement admise.

Le moteur doit déterminer :

-   qualification de la prise en charge ;
-   traitement comptable ;
-   déductibilité éventuelle ;
-   conséquence sur la rémunération imposable ;
-   conséquence sur l'assiette sociale ;
-   éventuel effet de boucle ;
-   coût société réel ;
-   net final du dirigeant.

**Interdiction de supposer que la prise en charge est automatiquement
neutre ou toujours déductible : le traitement doit être fondé sur les
sources applicables.**

------------------------------------------------------------------------

# 10. Fiscalité de l'entreprise

Intégrer :

-   IS ;
-   taux réduit si applicable ;
-   taux normal ;
-   conditions d'éligibilité ;
-   résultat avant/après rémunération ;
-   déductibilité des charges ;
-   non-déductibilité éventuelle ;
-   distribution du résultat après IS ;
-   réserves ;
-   trésorerie résiduelle.

L'optimisation doit raisonner à **coût entreprise constant** lorsque
cela est pertinent.

------------------------------------------------------------------------

# 11. Fiscalité personnelle

Le moteur doit recalculer l'impôt du foyer et ne pas se limiter à
appliquer mécaniquement la TMI.

À intégrer :

-   quotient familial ;
-   barème IR ;
-   décote si pertinente ;
-   plafonnement du quotient ;
-   PFU ;
-   option globale pour le barème ;
-   abattements ;
-   CSG déductible lorsque applicable ;
-   CEHR et mécanismes associés ;
-   plafonds de déduction ;
-   effets de seuil ;
-   revenu fiscal de référence.

Comparer systématiquement :

**impôt sans stratégie / impôt avec stratégie / fiscalité différée.**

------------------------------------------------------------------------

# 12. PER individuel

Pour chaque versement :

-   personne qui effectue matériellement le paiement ;
-   traitement lorsque l'entreprise prend en charge le versement ;
-   qualification fiscale et sociale ;
-   plafond de déduction ;
-   plafond propre au TNS lorsqu'applicable ;
-   plafonds reportables ;
-   mutualisation éventuelle entre conjoints ;
-   économie d'IR ;
-   coût social éventuel ;
-   indisponibilité ;
-   fiscalité de sortie ;
-   sortie rente/capital ;
-   cas de déblocage anticipé ;
-   valeur future estimée.

Le moteur doit comparer :

1.  rémunération supplémentaire puis versement personnel ;
2.  paiement direct par l'entreprise lorsque possible ;
3.  absence de versement ;
4.  alternatives d'épargne salariale.

------------------------------------------------------------------------

# 13. Épargne salariale

Module complet comprenant :

-   intéressement ;
-   participation ;
-   PPV si pertinente ;
-   PEE ;
-   PERECO ;
-   abondement ;
-   versements volontaires ;
-   transferts ;
-   disponibilité ;
-   fiscalité à l'entrée ;
-   fiscalité à la sortie ;
-   forfait social lorsque applicable ;
-   plafonds annuels ;
-   conditions d'effectif ;
-   conditions d'accès du dirigeant ;
-   ancienneté éventuelle ;
-   caractère collectif ;
-   non-substitution à la rémunération ;
-   règles de répartition.

------------------------------------------------------------------------

# 14. Intéressement

Vérifier notamment :

-   éligibilité de l'entreprise ;
-   existence réelle d'une collectivité de travail ;
-   bénéficiaires ;
-   caractère aléatoire ;
-   formule ;
-   période de calcul ;
-   plafonds ;
-   dépôt/accord ;
-   respect des délais ;
-   traitement fiscal ;
-   traitement social ;
-   affectation au PEE/PERECO ;
-   disponibilité immédiate ou blocage.

Le moteur doit détecter les dispositifs artificiels ou insuffisamment
sécurisés.

------------------------------------------------------------------------

# 15. Participation

Intégrer :

-   entreprises obligatoirement concernées ;
-   mise en place volontaire ;
-   formule légale ;
-   formule dérogatoire si admise ;
-   bénéficiaires ;
-   plafonds ;
-   traitement fiscal/social ;
-   affectation aux plans ;
-   indisponibilité ;
-   cas de déblocage.

------------------------------------------------------------------------

# 16. PEE

Pour le PEE :

-   bénéficiaires ;
-   conditions permettant au dirigeant d'en bénéficier ;
-   versements volontaires ;
-   plafond de versement ;
-   abondement ;
-   taux d'abondement ;
-   plafond légal ;
-   plafond prévu par le règlement ;
-   possibilité d'abondement unilatéral lorsque prévue ;
-   durée de blocage ;
-   cas de déblocage ;
-   fiscalité ;
-   prélèvements sociaux ;
-   frais.

Le moteur doit gérer un abondement exprimé par exemple à 100 %, 200 % ou
300 %, **sans jamais dépasser les limites légales et celles du règlement
du plan**.

------------------------------------------------------------------------

# 17. PERECO

Même logique que le PEE avec :

-   versements ;
-   intéressement ;
-   participation ;
-   abondement ;
-   droits issus du CET ou jours de repos lorsque applicable ;
-   compartiments ;
-   sortie ;
-   fiscalité ;
-   cas de déblocage ;
-   plafonds spécifiques.

Comparer l'intérêt du PEE et du PERECO selon :

-   horizon ;
-   besoin de liquidité ;
-   âge ;
-   retraite ;
-   fiscalité ;
-   objectif patrimonial.

------------------------------------------------------------------------

# 18. Conjoint salarié et dispositifs collectifs

Cas important à modéliser.

Si le dirigeant emploie son conjoint :

-   vérifier la réalité du contrat de travail ;
-   fonctions réelles ;
-   lien de subordination lorsque requis ;
-   rémunération cohérente ;
-   déclarations sociales ;
-   ancienneté ;
-   accès aux dispositifs collectifs ;
-   égalité de traitement ;
-   conditions permettant ensuite au dirigeant de bénéficier du
    dispositif.

Le moteur ne doit **jamais** considérer qu'attendre un an avant que le
dirigeant bénéficie du plan suffit à sécuriser un montage.

Il doit produire un **score de robustesse** et signaler les faits
pouvant révéler un emploi ou un dispositif artificiel.

------------------------------------------------------------------------

# 19. Contraintes réglementaires

Avant optimisation, filtrer les scénarios juridiquement impossibles.

Chaque scénario doit être classé :

-   conforme ;
-   conforme sous conditions ;
-   interprétation à confirmer ;
-   déconseillé ;
-   impossible.

Une stratégie mathématiquement optimale mais juridiquement impossible ne
doit jamais apparaître comme recommandation.

------------------------------------------------------------------------

# 20. Score de robustesse

Attribuer un score distinct de la performance économique.

Dimensions possibles :

-   solidité textuelle ;
-   doctrine disponible ;
-   jurisprudence ;
-   risque URSSAF ;
-   risque fiscal ;
-   dépendance à une interprétation ;
-   complexité documentaire ;
-   risque de requalification ;
-   nécessité d'un conseil externe.

Exemple :

-   **A --- robuste**
-   **B --- robuste sous conditions**
-   **C --- validation recommandée**
-   **D --- interprétation sensible**
-   **E --- ne pas automatiser**

------------------------------------------------------------------------

# 21. Moteur d'optimisation marginale

C'est le cœur du produit.

Pour chaque euro supplémentaire disponible dans l'entreprise, déterminer
l'affectation procurant la meilleure valeur marginale.

Exemple conceptuel :

``` text
1er bloc     → dispositif A
bloc suivant → dispositif B
bloc suivant → rémunération
bloc suivant → dividendes
surplus      → conservation / autre stratégie
```

Les seuils doivent émerger des règles et non être définis
arbitrairement.

------------------------------------------------------------------------

# 22. Fonction objectif

Ne jamais réduire « optimal » à « moins d'impôt ».

Créer plusieurs métriques :

## Net immédiat

``` text
revenu disponible après fiscalité et prélèvements
```

## Valeur patrimoniale

``` text
net immédiat
+ épargne capitalisée
+ valeur estimée des droits sociaux supplémentaires
- coût d’illiquidité
- fiscalité future estimée
```

## Coût société

``` text
dépense totale nécessaire pour générer la valeur obtenue
```

## Efficacité marginale

``` text
valeur nette créée / coût supplémentaire société
```

## Score multicritère

Pondérations paramétrables selon le client :

-   liquidité ;
-   retraite ;
-   protection ;
-   fiscalité ;
-   capitalisation ;
-   simplicité ;
-   robustesse.

------------------------------------------------------------------------

# 23. Projection long terme

Projeter :

-   1 an ;
-   5 ans ;
-   10 ans ;
-   retraite.

Hypothèses paramétrables :

-   rendement ;
-   inflation ;
-   évolution du PASS ;
-   évolution des revenus ;
-   fiscalité constante ou scénarios ;
-   revalorisation des droits ;
-   âge de départ ;
-   espérance de détention.

Afficher les hypothèses clairement.

------------------------------------------------------------------------

# 24. Sensibilité

Tester automatiquement :

-   variation du résultat ;
-   variation de rémunération ;
-   variation de TMI ;
-   variation de rendement ;
-   variation de dividendes ;
-   changement de statut ;
-   embauche/départ d'un salarié ;
-   modification réglementaire ;
-   hausse/baisse du PASS.

Identifier les recommandations qui changent lorsque les hypothèses
bougent légèrement.

------------------------------------------------------------------------

# 25. Scénarios de vie

Prévoir à terme :

-   mariage/PACS ;
-   naissance ;
-   divorce ;
-   décès ;
-   invalidité ;
-   départ en retraite ;
-   cession d'entreprise ;
-   changement de forme sociale ;
-   transformation SARL → SAS ;
-   création de holding ;
-   baisse temporaire d'activité ;
-   besoin exceptionnel de liquidité.

------------------------------------------------------------------------

# 26. Détection proactive des optimisations

L'outil ne doit pas seulement répondre à une question.

Il doit rechercher automatiquement :

-   plafond PER inutilisé ;
-   abondement non maximisé ;
-   PEE/PERECO absent ;
-   rémunération située dans une tranche socialement inefficiente ;
-   dividendes mal calibrés ;
-   risque de dépassement d'un seuil ;
-   prise en charge de cotisations à étudier ;
-   intéressement/participation potentiellement mobilisable ;
-   changement de statut à simuler ;
-   droits sociaux insuffisants ;
-   excès de trésorerie.

Chaque alerte doit être accompagnée d'une justification.

------------------------------------------------------------------------

# 27. Comparaison de structures

À terme, le moteur doit pouvoir comparer :

-   SARL vs SAS ;
-   EURL vs SASU ;
-   rémunération TNS vs assimilé salarié ;
-   détention directe vs holding ;
-   distribution vs capitalisation.

La comparaison doit inclure les coûts de transformation et ne pas
raisonner uniquement sur une année.

------------------------------------------------------------------------

# 28. Chronologie des actions

Chaque stratégie recommandée doit générer un plan d'exécution :

-   action ;
-   responsable ;
-   date limite ;
-   document nécessaire ;
-   dépendance ;
-   ordre des opérations ;
-   preuve à conserver.

Exemple :

``` text
1. Vérifier l’éligibilité
2. Mettre en place l’accord
3. Déposer dans le délai requis
4. Effectuer le versement
5. Affecter au plan
6. Archiver les justificatifs
```

------------------------------------------------------------------------

# 29. Moteur d'incertitude

Le système doit savoir dire :

> « Je ne peux pas conclure automatiquement. »

Déclencheurs :

-   texte ambigu ;
-   jurisprudence contradictoire ;
-   doctrine manquante ;
-   donnée client insuffisante ;
-   opération atypique ;
-   règle récemment modifiée ;
-   montant matériellement important.

Dans ce cas :

-   bloquer la recommandation automatique si nécessaire ;
-   expliquer le point ;
-   fournir les sources ;
-   demander une validation humaine.

------------------------------------------------------------------------

# 30. Journal de décision

Pour chaque simulation conserver :

-   données utilisées ;
-   version des règles ;
-   hypothèses ;
-   scénarios testés ;
-   scénarios exclus ;
-   raison d'exclusion ;
-   recommandation ;
-   sources ;
-   date ;
-   validation humaine éventuelle.

Objectif : auditabilité et reproductibilité.

------------------------------------------------------------------------

# 31. Bibliothèque de cas tests

Créer des cas anonymisés et synthétiques.

Minimum V1 :

1.  SARL IS --- gérant majoritaire seul.
2.  SARL IS --- gérant majoritaire + salarié.
3.  SARL IS --- conjoint salarié.
4.  SARL --- dividendes sous le seuil social.
5.  SARL --- dividendes au-dessus du seuil.
6.  SARL --- prise en charge des cotisations.
7.  SASU --- président rémunéré.
8.  SASU --- dividendes.
9.  PEE avec abondement.
10. PERECO avec abondement.
11. Intéressement affecté au PEE.
12. Intéressement affecté au PERECO.
13. PER individuel TNS.
14. Haut revenu.
15. Dirigeant proche de la retraite.
16. Foyer soumis à CEHR.
17. Changement SARL → SAS.

Chaque évolution du moteur doit rejouer l'ensemble des tests.

------------------------------------------------------------------------

# 32. Restitution : trois niveaux de lecture

La restitution doit être compréhensible par un débutant en moins de 30
secondes.

## Niveau 1 --- Client

Maximum :

-   recommandation ;
-   gain ;
-   raison ;
-   actions.

Exemple :

> **Stratégie recommandée :** X.\
> Elle améliore votre situation de Y € par rapport à votre organisation
> actuelle, principalement grâce à Z.

## Niveau 2 --- Conseiller

Afficher :

-   coût société ;
-   net ;
-   IR ;
-   cotisations ;
-   épargne ;
-   droits ;
-   fiscalité différée ;
-   comparaison des scénarios ;
-   risques ;
-   chronologie.

## Niveau 3 --- Expert / audit

Afficher :

-   formules ;
-   paramètres ;
-   textes ;
-   doctrine ;
-   version des règles ;
-   détail des calculs ;
-   journal de décision.

------------------------------------------------------------------------

# 33. Règles rédactionnelles de Claude

Claude doit :

-   utiliser des phrases courtes ;
-   éviter le jargon non expliqué ;
-   commencer par la conclusion ;
-   quantifier les écarts ;
-   distinguer économie immédiate et différée ;
-   distinguer fiscalité et cotisations sociales ;
-   distinguer prélèvements sociaux sur le capital et cotisations
    sociales professionnelles ;
-   expliquer les hypothèses ;
-   ne jamais masquer une incertitude ;
-   citer les sources dans le niveau expert.

Claude ne doit pas :

-   présenter une optimisation fiscale comme certaine sans source ;
-   confondre PFU, prélèvements sociaux et cotisations TNS ;
-   appeler « gain » un simple report d'imposition ;
-   valoriser arbitrairement des droits retraite ;
-   inventer un taux.

------------------------------------------------------------------------

# 34. Référentiel documentaire via MCP

Créer un workflow dédié :

``` text
Question métier
    ↓
Recherche MCP
    ↓
Sources primaires
    ↓
Extraction de la règle
    ↓
Contrôle humain si nécessaire
    ↓
Création / modification d’une règle
    ↓
Tests
    ↓
Versionnage Git
    ↓
Déploiement
```

Le moteur de production ne doit pas modifier spontanément une règle
parce qu'un agent a trouvé une page différente.

------------------------------------------------------------------------

# 35. GitHub

Organisation suggérée :

``` text
/
├── README.md
├── docs/
│   ├── cahier-des-charges.md
│   ├── architecture.md
│   └── methodology.md
├── rules/
│   ├── social/
│   ├── tax/
│   ├── retirement/
│   ├── dividends/
│   ├── per/
│   └── employee_savings/
├── sources/
├── tests/
│   ├── unit/
│   ├── regression/
│   └── cases/
├── engine/
├── optimizer/
├── explain/
├── ui/
└── changelog/
```

Toute modification réglementaire doit passer par :

1.  modification de la règle ;
2.  source ;
3.  test ;
4.  revue ;
5.  commit ;
6.  version.

------------------------------------------------------------------------

# 36. Claude Code / environnement agentique

Répartition recommandée :

## Claude Code / agent de développement

-   architecture ;
-   moteur ;
-   tests ;
-   interface ;
-   optimisation ;
-   CI/CD ;
-   intégration GitHub.

## Agent de recherche / Cowork + MCP

-   recherche réglementaire ;
-   mise à jour documentaire ;
-   collecte des sources ;
-   proposition de modification des règles ;
-   génération de notes de veille.

## Skill métier dédié

Créer un skill « optimisation rémunération dirigeant » contenant :

-   méthode ;
-   ordre des vérifications ;
-   règles de restitution ;
-   hiérarchie des sources ;
-   garde-fous ;
-   conventions de calcul.

------------------------------------------------------------------------

# 37. Sécurité et confidentialité

Prévoir dès la conception :

-   séparation des données clients et des cas tests ;
-   minimisation des données ;
-   chiffrement ;
-   contrôle des accès ;
-   journalisation ;
-   suppression/export des données ;
-   absence de données personnelles dans Git ;
-   anonymisation des cas servant aux tests ;
-   politique de conservation.

------------------------------------------------------------------------

# 38. Contrôles de cohérence

Exemples :

-   dividendes \> montant distribuable → erreur ;
-   abondement \> plafond → erreur ;
-   versement PER \> plafond déductible → distinguer versement possible
    et fraction déductible ;
-   dirigeant non éligible au plan → scénario exclu ;
-   accord absent → stratégie conditionnelle ;
-   données insuffisantes → demande d'information ;
-   somme des flux ≠ coût société → erreur de conservation.

Créer une règle fondamentale :

> **Tout euro doit être traçable de la société jusqu'au patrimoine du
> dirigeant, aux prélèvements ou à la trésorerie résiduelle.**

------------------------------------------------------------------------

# 39. Indicateurs de résultat

Pour chaque scénario :

  Indicateur                              Valeur
  --------------------------------- ------------
  Coût entreprise                              €
  IS                                           €
  Cotisations professionnelles                 €
  Prélèvements sociaux du capital              €
  IR                                           €
  CEHR                                         €
  Net immédiatement disponible                 €
  Épargne bloquée                              €
  Épargne retraite                             €
  Droits sociaux supplémentaires      estimation
  Trésorerie société résiduelle                €
  Valeur patrimoniale projetée                 €
  Score de robustesse                       A--E

------------------------------------------------------------------------

# 40. Roadmap

## V1 --- SARL / TNS

Priorité absolue :

-   SARL à l'IS ;
-   gérant majoritaire TNS ;
-   rémunération ;
-   dividendes ;
-   cotisations ;
-   réforme d'assiette ;
-   PASS ;
-   PER ;
-   PEE ;
-   PERECO ;
-   abondement ;
-   intéressement ;
-   prise en charge des cotisations ;
-   IR / PFU / CEHR ;
-   optimisation marginale ;
-   restitution 3 niveaux.

## V2 --- SAS / SASU

Ajouter :

-   assimilé salarié ;
-   rémunération ;
-   dividendes ;
-   comparaison SAS/SARL.

## V3 --- Épargne salariale avancée

-   participation ;
-   PPV ;
-   cas complexes ;
-   chronologie ;
-   contrôles de conformité.

## V4 --- Projection patrimoniale

-   retraite ;
-   capitalisation ;
-   scénarios de vie ;
-   sensibilité.

## V5 --- Moteur patrimonial global

Connecter progressivement :

-   transmission ;
-   assurance-vie ;
-   démembrement ;
-   immobilier ;
-   holding ;
-   cession d'entreprise ;
-   retraite globale ;
-   allocation patrimoniale.

------------------------------------------------------------------------

# 41. Définition d'une recommandation « optimale »

Le moteur ne doit jamais affirmer qu'une solution est « optimale » sans
préciser l'objectif.

Il doit écrire par exemple :

-   « optimale pour maximiser le net immédiat » ;
-   « optimale pour maximiser le patrimoine à 10 ans » ;
-   « optimale sous contrainte de liquidité » ;
-   « meilleur compromis entre net, retraite et robustesse ».

------------------------------------------------------------------------

# 42. Principe final

Le produit doit répondre à quatre questions dans cet ordre :

1.  **Qu'est-ce qui est juridiquement possible ?**
2.  **Combien chaque option coûte réellement ?**
3.  **Qu'est-ce que le dirigeant reçoit réellement en contrepartie ?**
4.  **Quelle combinaison répond le mieux à son objectif ?**

La fiscalité n'est qu'une composante de la décision.

Le moteur doit systématiquement intégrer :

> **social + fiscal + PASS/tranches + droits acquis + liquidité +
> horizon + risque réglementaire + coût entreprise + patrimoine futur.**

C'est cette lecture globale qui doit permettre de détecter les
véritables points d'optimisation.
