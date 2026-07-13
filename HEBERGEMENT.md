# Héberger Athlete OS en HTTPS

## Pourquoi

Aujourd'hui l'app est servie par ton Mac en HTTP sur le Wi-Fi local. Conséquences :

- iOS exige du HTTPS pour le service worker → **pas de mode hors ligne fiable** : l'iPhone doit joindre le Mac à chaque ouverture.
- Le Mac doit être allumé et sur le même réseau.

Hébergée sur une URL HTTPS, l'app s'installe une fois, fonctionne hors ligne, se met à jour toute seule (service worker network-first), et le Mac ne sert plus à rien.

## Confidentialité

L'hébergement ne sert **que le code** (HTML/CSS/JS). Tes données (check-ins, séances, poids...) restent stockées localement dans le Safari de ton iPhone et ne sont envoyées nulle part. Tu peux même mettre le site en accès privé si tu veux que personne ne voie l'app elle-même.

## Option recommandée : GitHub Pages (gratuit)

1. Crée un compte sur github.com si besoin.
2. Crée un dépôt (par ex. `athlete-os`), coche « Private » si tu préfères — attention : GitHub Pages sur dépôt privé nécessite un compte payant ; en gratuit, mets le dépôt en public (le code ne contient aucune donnée personnelle).
3. Téléverse tout le contenu du dossier `athlete-os` (interface web : « Add file → Upload files »).
4. Dans le dépôt : Settings → Pages → Source : « Deploy from a branch » → branche `main`, dossier `/ (root)` → Save.
5. Après ~1 minute, ton app est sur `https://TON-PSEUDO.github.io/athlete-os/`.
6. Ouvre cette adresse dans Safari sur l'iPhone → Partager → Ajouter à l'écran d'accueil.

Mises à jour : remplace les fichiers dans le dépôt, l'app se met à jour au prochain lancement.

## Alternative : Cloudflare Pages

Même principe (pages.cloudflare.com, glisser-déposer le dossier), URL en `*.pages.dev`, dépôt facultatif. Fonctionne aussi très bien.

## Migrer tes données existantes

Le stockage local est lié à l'adresse : la version hébergée démarre vide. Pour transférer :

1. Sur l'ancienne version (adresse du Mac) : Paramètres → **Exporter la sauvegarde** → enregistre le fichier dans Fichiers/iCloud Drive.
2. Sur la nouvelle version (URL HTTPS) : Paramètres → **Restaurer** → choisis le fichier.

Tout revient : journal, décisions, séances, thème.
