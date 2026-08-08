# Registre des sources — millésime 2026

Sources consultées le 8 août 2026 pour construire `rules/parameters/2026.yaml`.
Les URL sont conservées à titre de piste de vérification ; la source qui fonde le
calcul est le texte primaire cité dans `source_reference`.

## Textes primaires lus

| Référence | Objet |
|---|---|
| Arrêté du 22 décembre 2025 (JORFTEXT000053143451) | PASS et PMSS 2026 |
| Art. D.621-1 CSS (décret n° 2024-688) | Cotisation maladie TNS : 8,50 % jusqu'à 3 PASS, 6,50 % sur la fraction au-delà |
| Art. D.621-2 CSS (décret n° 2024-688) | Réduction dégressive du taux maladie sous 3 PASS |
| Art. D.621-3 CSS (décret n° 2024-688) | Cotisation IJ : 0,50 %, assiette plafonnée à 5 PASS, minimum 40 % du PASS |
| Art. L.131-6, L.136-3, D.136-5 CSS ; décret n° 2024-688 du 5 juillet 2024 | Assiette sociale unique des indépendants, abattement de 26 % |
| Art. L.136-3 II 2° et R.131-7 CSS | Seuil des 10 % sur les dividendes du gérant majoritaire |
| Art. L.136-8 CSS (I 2° et IV) | Prélèvements sociaux du capital : 18,6 % et liste limitative des dérogations |
| Loi n° 2025-1403 du 30 décembre 2025 (LFSS 2026) | Hausse de la CSG sur les revenus du capital |
| Loi n° 2026-103 du 19 février 2026 (LF 2026), art. 2, 4 et 15 | Barème IR, CDHR, IS |
| Art. 219 I et I-b CGI | Taux normal et taux réduit de l'IS |
| Art. 223 sexies CGI | CEHR |
| Art. 224 CGI | CDHR, formule et décote |
| Art. 154 quinquies II CGI | CSG déductible maintenue à 6,8 points |
| Art. 158 3-2°, 200 A CGI | Abattement de 40 %, PFU |
| Art. 163 quatervicies et 154 bis CGI | Plafonds PER |
| Art. L.3312-3, L.3312-5, L.3314-8, L.3332-2, L.3332-10, L.3332-11, L.3324-2 code du travail | Accès du dirigeant, plafonds PEE, abondement, intéressement, participation |
| Décret n° 2025-1446 du 31 décembre 2025 | Cotisation vieillesse déplafonnée patronale à 2,11 % |
| Circulaire CNAV n° 2025-31 du 22 décembre 2025 | Valeurs du point RCI |
| Chiffr'Agirc-Arrco 2026 | Taux, taux d'appel, valeurs du point |
| BOI-IR-LIQ-20-20-20 (07/04/2026), BOI-IR-CDHR-10 et -20 | Quotient familial, CDHR |

## Divergences relevées et non tranchées

| Sujet | Positions en présence | Traitement |
|---|---|---|
| ~~Décrochage du taux maladie TNS~~ | ~~3 PASS contre 5 PASS~~ | **TRANCHÉE le 8 août 2026** sur l'art. D.621-1 CSS lu sur Légifrance. Le seuil est bien à 3 PASS, mais 6,50 % est un taux MARGINAL sur la seule fraction excédentaire : il n'existe aucune falaise. Voir la section « Corrections » ci-dessous. |
| Taux de retraite de base TNS | 17,87 % + 0,72 % (cinq sources) contre 17,15 % (un support) | 17,87 % + 0,72 % retenu |
| Prélèvements sociaux sur la rente PER déduite | Lecture littérale de L.136-8 contre régime des pensions appliqué en pratique | Aucun arbitrage capital/rente automatisé, point signalé |
| Trimestres requis pour le taux plein | Barème antérieur contre barème post-suspension de la réforme de 2023 | 172 par défaut, hypothèse affichée, alerte pour un dirigeant proche de la liquidation |
| Référence législative exacte de la hausse de CSG | LFSS 2026 selon la doctrine, loi du 25 juin 2026 selon la fiche Légifrance de L.136-8 | Le taux de 10,6 % est confirmé par toutes les sources ; la référence est à revérifier au JORF avant citation dans un document client |
| Abondement unilatéral « actionnariat salarié » | Plafond de 2 % du PASS cité par une seule source secondaire | Non implémenté |

## Points explicitement non retenus

- **PPV et PPVE** : réservées aux salariés. Exclues des scénarios du dirigeant.
- **Participation** : l'accès du dirigeant est limité à la fraction dérogatoire
  excédant la formule légale. Non modélisée dans cette version.
- **Versement mobilité** : dépend de la commune du siège, laissé à 0 et paramétrable.
- **Taux AT/MP** : notifié par la Carsat, valeur par défaut 1,20 % à remplacer.

## Corrections apportées le 8 août 2026 (référentiel 1.1.0)

Audit croisé du référentiel et des deux moteurs. Trois erreurs de barème ont été
identifiées et corrigées sur texte primaire.

| Règle | Valeur erronée | Valeur retenue | Fondement |
|---|---|---|---|
| SOCIAL_TNS_002 — maladie | 6,50 % appliqué à la TOTALITÉ de l'assiette au-delà de 3 PASS | 8,50 % sur la fraction ≤ 3 PASS, 6,50 % sur la fraction au-delà | Art. D.621-1 CSS |
| SOCIAL_TNS_002 — assiette minimale | Minimum de 40 % du PASS appliqué à la maladie | Supprimé : aucune cotisation minimale maladie depuis la LFSS 2017, le taux est nul sous 20 % du PASS | Art. D.621-2, 1° CSS |
| SOCIAL_AS_002 — Agirc-Arrco | Taux CONTRACTUELS 6,20 % (T1) et 17,00 % (T2) étiquetés « appelé » | Taux APPELÉS 7,87 % (3,15 / 4,72) et 21,59 % (8,64 / 12,95) | Chiffr'Agirc-Arrco 2026, taux d'appel 127 % |
| SOCIAL_TNS_003 — droits IJ | Plafond d'IJ de 1/730 de 3 PASS | 1/730 de 1 PASS, soit 65,84 €/jour | ameli.fr 2026 ; le plafond de 3 PASS ne vaut que pour les libéraux (L.640-1) |

### Conséquence sur la « falaise » à 3 PASS

Le référentiel 1.0.1 produisait une discontinuité descendante d'environ 2 900 € au
franchissement de 3 PASS : un dirigeant pouvait « gagner » plusieurs milliers
d'euros de net en augmentant son coût de quelques centaines. L'optimiseur, laissé
libre, s'y collait, et une alerte dédiée avait été ajoutée pour prévenir du risque.

Cette falaise n'existe pas. Elle était entièrement produite par l'erreur de mode
d'application. Le barème réel est **continu et strictement croissant** : l'alerte
`TNS_FALAISE_MALADIE` et la dégradation de robustesse associée ont été supprimées,
et remplacées par une information factuelle (`TNS_TAUX_MARGINAL_MALADIE`) signalant
que le taux marginal passe de 8,50 % à 6,50 % au-delà de 3 PASS, sans effet de
seuil. Deux tests de non-régression verrouillent désormais cette propriété :
monotonie de la cotisation sur tout le domaine, et monotonie du net du dirigeant
au franchissement du seuil.
