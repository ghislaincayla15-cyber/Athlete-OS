# Athlete OS — espace personnel

Base : dépôt ghislaincayla15-cyber/Athlete-OS, commit f3d0f6f (9.5.1).

La nouvelle entrée `index.html` propose une semaine, des séances libres, des objectifs et un compte. `legacy.html` conserve l’interface historique avec ses fichiers app.js/styles.css et son stockage d’origine. Aucune migration automatique de l’historique ni des essais vers les comptes.

## État de livraison

- L’essai local est fonctionnel. Son stockage est distinct : athlete-personal-trial-v1.
- Connexion par lien e-mail et sauvegarde Supabase implémentées, mais non activées tant que config.js est vide.
- La sauvegarde distante utilise une ligne par utilisateur, RLS et numéro de révision pour refuser l’écrasement d’une version plus récente.
- Un échec de lecture distante bloque les modifications. Un échec d’enregistrement laisse la saisie ouverte et affiche une erreur. Aucune sauvegarde distante hors ligne ni synchronisation en temps réel : recharger pour lire les changements d’un autre appareil.
- L’espace connecté ne copie pas ses données dans le stockage de l’essai. Le jeton de connexion est géré par le client Supabase.
- Bibliothèque, imports santé et ancien programme restent dans le suivi historique. Les séances personnelles ont une charge et un nombre de répétitions communs aux séries de chaque exercice ; les variations par série et les mesures de course se notent dans les notes.

---
## À faire de votre côté — activation des comptes, environ 20 minutes hors configuration du domaine e-mail

1. Dans [Supabase](https://supabase.com/dashboard), ouvrez votre projet dédié Athlete OS, ou utilisez « New project » pour le créer. Choisissez votre organisation et une région adaptée. Le tableau de bord du projet doit s’ouvrir.

2. Ouvrez « SQL Editor », puis « New query ». Copiez tout le fichier `supabase/schema.sql` dans l’éditeur et cliquez sur « Run ». Le résultat doit indiquer que l’exécution a réussi. Ce script est prévu pour une première installation ; ne le relancez pas sur des politiques déjà créées.

3. Ouvrez « Table Editor » et sélectionnez « athlete_spaces ». La table doit exister avec RLS activé. Elle reste vide jusqu’à la création du premier profil dans l’application.

4. Ouvrez « Connect » et récupérez « Project URL » et « Publishable key ». Renseignez uniquement ces deux valeurs publiques dans `config.js` :

   ```javascript
   window.ATHLETE_CONFIG = {
     supabaseUrl: 'https://VOTRE-PROJET.supabase.co',
     supabasePublishableKey: 'VOTRE-CLE-PUBLIQUE'
   };
   ```

   Aucune clé « secret » ou « service_role » ne doit figurer dans ce fichier. Les clés publiques servent à identifier le projet ; les politiques RLS protègent les données. [Documentation des clés](https://supabase.com/docs/guides/getting-started/api-keys).

5. Ouvrez « Authentication » → « URL Configuration ». Renseignez « Site URL » avec l’adresse publique réelle de l’application. Si GitHub Pages utilise l’adresse standard du dépôt, ce sera l’adresse ci-dessous ; vérifiez-la d’abord dans GitHub → « Settings » → « Pages ».

   ```text
   https://ghislaincayla15-cyber.github.io/Athlete-OS/
   ```

6. Dans « Redirect URLs », ajoutez l’adresse exacte de retour, puis enregistrez :

   ```text
   https://ghislaincayla15-cyber.github.io/Athlete-OS/index.html
   ```

   Adaptez les deux adresses si vous utilisez un domaine personnalisé. [Configuration des URL](https://supabase.com/docs/guides/auth/redirect-urls).

7. Ouvrez « Authentication » et les paramètres du fournisseur « Email ». Vérifiez que la connexion e-mail et les nouvelles inscriptions sont autorisées. Conservez la confirmation de l’adresse. Le parcours utilise le lien de confirmation des modèles standards, pas un code à recopier.

8. Dans « Authentication », ouvrez les paramètres « SMTP » et configurez « Custom SMTP » avec votre fournisseur d’envoi et un expéditeur vérifié. Les identifiants SMTP restent dans Supabase. Sans SMTP personnalisé, les e-mails sont limités aux adresses autorisées de l’équipe du projet : ce n’est pas suffisant pour partager l’application à des proches. [Documentation SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

9. Après publication de cette version, ouvrez l’application et cliquez sur « Créer mon compte ». Saisissez une adresse de test puis cliquez sur « Recevoir mon lien de connexion ». Le message « Consultez votre messagerie » doit apparaître. Ouvrez le lien reçu : vous devez arriver sur « Commençons par vous ».

### Comment vérifier que ça a marché

1. Créez un premier compte A et une séance intitulée « Test compte A ».
2. Ouvrez une fenêtre privée et créez un compte B avec une autre adresse. La semaine doit être vide ; « Test compte A » ne doit jamais y apparaître.
3. Créez « Test compte B », déconnectez-vous et reconnectez A : seule sa propre séance doit apparaître.
4. Connectez A sur un autre appareil : sa séance doit être retrouvée.
5. Ouvrez A dans deux onglets. Enregistrez une modification dans le premier puis, sans recharger le second, tentez d’y modifier une séance : l’application doit refuser l’écrasement et conserver la saisie dans le formulaire.
6. Coupez le réseau avant un enregistrement connecté : une erreur doit s’afficher, sans message « Enregistré ».

## Vérifications effectuées localement

Le 8 septembre 2026 : création du profil, création d’une séance avec exercice et charge, passage à « Terminée », compteur hebdomadaire, duplication en « Prévue » à une autre date, objectif 5/10 = 50 %, conservation après rechargement, rendu ordinateur et mobile 390 px sans débordement horizontal. Contrôle syntaxique de personal.js et service-worker.js. app.js historique identique au dépôt initial.

Les tests de connexion réelle, délivrabilité e-mail et isolation entre deux comptes sur le serveur restent à exécuter une fois le projet configuré. Ne pas présenter cette intégration comme activée avant ces tests.
