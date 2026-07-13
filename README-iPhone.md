# Athlete OS sur iPhone

Cette application est une PWA privee : elle peut etre utilisee comme une app personnelle sur iPhone, sans App Store.

## Installation rapide

1. Heberger le dossier `athlete-os` sur une adresse accessible par l'iPhone.
2. Ouvrir l'adresse dans Safari sur l'iPhone.
3. Appuyer sur Partager.
4. Choisir Ajouter a l'ecran d'accueil.
5. Ouvrir Athlete OS depuis l'icone ajoutee.

## Test local depuis le Mac

Depuis le dossier `athlete-os` :

```bash
python3 -m http.server 8080 --bind 0.0.0.0
```

Puis ouvrir sur l'iPhone :

```text
http://ADRESSE-IP-DU-MAC:8080
```

Le Mac et l'iPhone doivent etre sur le meme Wi-Fi.

## Compatibilite iOS

- Interface mobile-first.
- Navigation basse adaptee a l'iPhone.
- Respect des safe areas.
- Icône iOS incluse.
- Manifest PWA inclus.
- Service worker inclus pour le cache lorsque l'app est servie depuis une origine compatible.
- Donnees stockees localement dans Safari/PWA via `localStorage`.

Pour un comportement PWA complet avec cache offline fiable sur iOS, utiliser une adresse HTTPS.

## Nouveautés de cette version

- **Journal jour par jour** : chaque check-in du matin, bilan du soir, saisie nutrition et poids est enregistré à sa date (plus d'écrasement de la veille). Les anciennes saisies sont migrées automatiquement au premier lancement.
- **Tendances réelles** : le Readiness est comparé à ta vraie moyenne 7 jours, le poids est suivi en moyenne glissante 7 jours, et l'adhérence (7 j / 28 j) est calculée sur tes bilans du soir réels.
- **Nouvelle vue Historique** dans l'onglet Aujourd'hui : les 14 derniers jours avec readiness, décision du coach, statut de séance et poids.
- **Poids du jour** : champ facultatif dans le check-in du matin.
- **Mode démo enrichi** : 3 semaines d'historique fictif pour prévisualiser les tendances.
- **PWA corrigée** : icônes générées (l'installation sur l'écran d'accueil affiche maintenant une vraie icône), service worker aligné et passé en network-first (les mises à jour de l'app arrivent immédiatement, le cache ne sert qu'en secours hors ligne).

## Mise à jour : coach intelligent (v3.1)

- **Signaux du bloc** : le coach surveille en continu 7 tendances multi-jours calculées sur ton journal réel — readiness en baisse durable (3 j vs les 7 précédents), fatigue ressentie élevée, douleurs récurrentes, RPE en hausse à programme constant, motivation en baisse, adhérence en chute, séances manquées consécutives. Jamais de conclusion sur un indicateur isolé.
- **Deload à confirmation** : proposé uniquement quand au moins 3 signaux concordent (et au moins 5 jours de journal). Tu acceptes ou tu reportes ; accepté, il adapte la décision quotidienne pendant 7 jours (volume -40 %, RPE ≤ 6, aucun échec). Cooldown de 5 jours après un refus, 7 jours après une fin de deload.
- **Historique des décisions réel** (onglet Coach) : chaque adaptation confirmée, deload accepté/refusé/terminé est tracé avec justification, données utilisées, confiance — et le **résultat observé** est évalué automatiquement (readiness moyen des 3 jours suivants vs précédents).
- **Mode démo** : bouton « Simuler une semaine difficile » dans les paramètres pour voir les signaux et le flux deload.

## Mise à jour : saisie manuelle des séances (v3.2)

- **Journal des séances** (Aujourd'hui → Séance) : muscu (exercice, charge, reps, séries, RPE de la meilleure série) ou course (km, durée, FC, type). Saisie en quelques secondes, suppression possible, tout est daté dans le journal.
- **Onglet Performances réel** : dès la première séance saisie — dernière et meilleure perf par exercice, 1RM estimé (Epley), tendance en %, sparkline, stats running hebdo (km, allure, FC, volume 8 semaines).
- **Détection de stagnation** : signalée quand un exercice ne progresse pas sur 3 séances consécutives (1RM estimé stable à ±2 %), avec les leviers recommandés (plage de reps, tempo, pause, variante, RPE) — jamais d'augmentation brutale du volume.
- **Correctif important** : la clé de stockage passe proprement en v3 avec migration automatique de tes anciennes saisies v2 (thème, check-in, bilan, nutrition).

## Mise à jour : sauvegarde & hébergement (v3.3)

- **Exporter la sauvegarde** (Paramètres) : télécharge un fichier JSON daté avec tout ton journal, tes décisions et réglages. À faire régulièrement — c'est ta seule protection contre une suppression de l'app ou des données Safari.
- **Restaurer** (Paramètres) : recharge une sauvegarde sur n'importe quel appareil. Un fichier invalide est refusé sans rien toucher.
- **HEBERGEMENT.md** : guide pour mettre l'app sur une URL HTTPS gratuite (GitHub Pages / Cloudflare Pages) → mode hors ligne réel sur iPhone, plus besoin du Mac allumé, et migration des données via export/restauration.

## Mise à jour : refonte visuelle (v4)

- **Nouveau design sombre sportif premium par défaut** : fond quasi noir, accent « volt » (#C0F04A) validé contraste/daltonisme, gros chiffres tabulaires, donuts lumineux, cartes en relief subtil.
- **Interface allégée** : badges redondants supprimés, statuts en point coloré + texte, mentions légales en note discrète, sous-titres masqués sur mobile.
- **Thème clair** conservé en secondaire (bouton soleil/lune). Le sombre est appliqué par défaut une seule fois à la mise à jour ; ton choix est ensuite mémorisé.
- Couleurs de la barre iOS et du manifest alignées sur le nouveau fond.

## Mise à jour : Bloc 1 intégré à l'app (v4.1.0)

- **Programme réel** : le vrai Bloc 1 (10 semaines, recomposition & base) remplace la démo dans l'onglet Programme dès que la date de départ est renseignée — séances muscu/course/repos, phases, deload semaine 6, calendrier de la semaine, statistiques de complétion.
- **Coach programme-aware** : la décision du jour, la carte de séance et le chat référencent la vraie séance planifiée (plus de texte générique).
- **Démarrage anticipé possible** depuis le bouton « Commencer dès cette semaine ».

## Correctif : temps de repos manquants (v4.1.1)

- Les 18 exercices du Bloc 1 affichaient des séries/reps/RPE mais pas toujours le temps de repos : corrigé, chaque exercice précise maintenant son repos.

## Mise à jour : calendrier cliquable & import Apple Santé fiabilisé (v4.2.0)

- **Calendrier de la semaine cliquable** : touche n'importe quel jour à venir pour voir le détail des exercices avant le jour J, plus besoin de découvrir la séance le matin même.
- **Import Apple Santé réécrit en streaming** : l'ancien import chargeait tout le fichier `export.xml` en mémoire et pouvait échouer silencieusement sur les gros fichiers (export réel de plusieurs centaines de Mo). Le nouvel import lit le fichier par tranches de 6 Mo avec barre de progression, gère le format de date Apple, et remonte des erreurs explicites au lieu d'un échec silencieux. Le poids importé alimente automatiquement les jours du journal qui n'ont pas de pesée manuelle.
- **Correctif** : `RUN_KINDS` mal placé provoquait une erreur bloquante au chargement dans certains cas ; corrigé.

## Mise à jour : structure phasée du Bloc 1 — durée, volume, qualités athlétiques (v4.3.0)

Pourquoi ce changement : le Bloc 1 avait 5 exercices par séance muscu avec des repos longs (3 min sur les mouvements lourds) pour respecter le RPE cible sans compromettre la technique — un choix volontaire pour les semaines de calibration (S1-S2). Une fois cette phase passée, et la disponibilité en temps confirmée, il devenait pertinent d'ajouter du volume et un vrai travail de qualités athlétiques (priorité 3, jusque-là peu servie par le bloc).

- **S1-S2 (calibration)** : séances inchangées, 60 min, pour garder une calibration de charge propre.
- **S3-S5 et S7-S9 (accumulation / intensification)** : 6ᵉ exercice accessoire ajouté sur chaque séance muscu (extension lombaire, curl biceps, abduction de hanche, élévations Y selon le jour) ; séances Haut A (mardi) et Haut B (vendredi) enrichies d'un circuit qualités athlétiques (bondissements latéraux amplitude faible, départs sprint courts, lancers de médecine-ball) — jours haut du corps choisis pour épargner le mollet, avec rappel explicite de la règle d'arrêt (douleur > 3/10). Durée : 70 min (jours bas du corps), 80 min (jours haut du corps).
- **S1-S2, en parallèle** : version légère du circuit athlétique (médecine-ball, gainage dynamique, mobilité, sans impact) déjà active sur Haut A/Haut B, pour démarrer le travail de qualités athlétiques sans attendre S3.
- **S6 (deload)** : aucun ajout, séances resserrées à 40 min, conformément au volume -40 % déjà prévu.
- **S10 (évaluation)** : conserve la structure enrichie (accessoire + circuit), les top sets et le test course restent pilotés par le RPE/la charge, pas par la liste d'exercices.
