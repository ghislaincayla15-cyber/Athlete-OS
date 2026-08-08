"""Assemble le simulateur autonome : un seul fichier HTML, sans dépendance locale."""
import json, os, sys
RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

tpl = open(os.path.join(RACINE, "ui", "template.html"), encoding="utf-8").read()
params = open(os.path.join(RACINE, "ui", "params.json"), encoding="utf-8").read()
moteur = open(os.path.join(RACINE, "ui", "moteur.js"), encoding="utf-8").read()
cases = open(os.path.join(RACINE, "build", "cases.json"), encoding="utf-8").read()

tpl = tpl.replace("/*__PARAMS__*/", "window.__PARAMS__ = " + params + ";")
tpl = tpl.replace("/*__CASES__*/", "window.__CASES__ = " + cases + ";")
tpl = tpl.replace("/*__MOTEUR__*/", moteur)

dst = os.path.join(RACINE, "simulateur-dirigeant.html")
open(dst, "w", encoding="utf-8").write(tpl)
print("écrit", dst, round(len(tpl)/1024), "Ko")
