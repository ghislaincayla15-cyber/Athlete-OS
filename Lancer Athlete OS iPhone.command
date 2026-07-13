#!/bin/zsh
cd "$(dirname "$0")"

clear
echo "Athlete OS v4.1.1 - installation iPhone"
echo ""

IP="$(ipconfig getifaddr en0 2>/dev/null)"
if [ -z "$IP" ]; then
  IP="$(ipconfig getifaddr en1 2>/dev/null)"
fi

if [ -z "$IP" ]; then
  echo "Je n'arrive pas a trouver automatiquement l'adresse IP du Mac."
  echo "Verifie que ton Mac est connecte au meme Wi-Fi que ton iPhone."
  echo ""
  read "pause?Appuie sur Entree pour fermer."
  exit 1
fi

echo "1. Garde cette fenetre ouverte."
echo "2. Sur ton iPhone, ouvre Safari."
echo "3. Va a cette adresse :"
echo ""
echo "   http://$IP:8765/index.html?v=4.1.1"
echo ""
echo "4. Dans Safari : bouton Partager > Ajouter a l'ecran d'accueil."
echo ""
echo "Si Safari affiche une ancienne page, recharge ou retape bien l'adresse complete ci-dessus."
echo ""
python3 -m http.server 8765 --bind 0.0.0.0
