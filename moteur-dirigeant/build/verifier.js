/* Vérification croisée moteur Python / moteur JavaScript.
 * Rejoue la bibliothèque de cas côté JS et compare aux résultats Python.
 * Usage : node build/verifier.js
 */
const fs = require('fs');
const path = require('path');

const RACINE = path.dirname(__dirname);
const M = require(path.join(RACINE, 'ui', 'moteur.js'));

const params = JSON.parse(fs.readFileSync(path.join(RACINE, 'ui', 'params.json'), 'utf8'));
const cas = JSON.parse(fs.readFileSync(path.join(RACINE, 'build', 'cases.json'), 'utf8'));
const attendus = JSON.parse(fs.readFileSync(path.join(RACINE, 'build', 'attendus.json'), 'utf8'));

const OBJECTIFS = ['net_immediat', 'patrimoine_net', 'retraite', 'compromis',
  'impot_immediat', 'liquidite', 'patrimoine_personnel'];
const TOL = 0.01;   // euro

let comparaisons = 0, ecarts = [];

function compare(cle, scenario, py, js) {
  for (const champ of Object.keys(py)) {
    if (champ === 'droits' || champ === 'allocation') continue;
    const a = py[champ], b = js[champ];
    comparaisons++;
    if (typeof a === 'number') {
      if (Math.abs(a - (b || 0)) > TOL) {
        ecarts.push(`${cle}/${scenario}/${champ} : python=${a} js=${b}`);
      }
    } else if (a !== b) {
      ecarts.push(`${cle}/${scenario}/${champ} : python=${a} js=${b}`);
    }
  }
  for (const champ of Object.keys(py.droits)) {
    comparaisons++;
    if (Math.abs(py.droits[champ] - (js.droits[champ] || 0)) > TOL) {
      ecarts.push(`${cle}/${scenario}/droits.${champ} : python=${py.droits[champ]} js=${js.droits[champ]}`);
    }
  }
  if (py.allocation) {
    for (const champ of Object.keys(py.allocation)) {
      const a = py.allocation[champ], b = js.allocation[champ];
      comparaisons++;
      if (typeof a === 'number') {
        if (Math.abs(a - (b || 0)) > TOL) ecarts.push(`${cle}/${scenario}/allocation.${champ} : python=${a} js=${b}`);
      } else if (a !== b) {
        ecarts.push(`${cle}/${scenario}/allocation.${champ} : python=${a} js=${b}`);
      }
    }
  }
}

function resume(r) {
  const champs = ['cout_entreprise', 'resultat_fiscal', 'impot_societes', 'resultat_net_societe',
    'tresorerie_residuelle', 'cotisations_totales', 'remuneration_nette',
    'revenu_imposable_remuneration', 'dividendes_nets', 'prelevements_sociaux_capital',
    'impot_revenu', 'cehr', 'cdhr', 'net_immediat', 'epargne_bloquee', 'epargne_retraite',
    'valeur_patrimoniale', 'valeur_globale', 'robustesse', 'conformite'];
  const out = {};
  champs.forEach((c) => { out[c] = r[c]; });
  out.droits = {
    trimestres: r.droits.trimestres, points_rci: r.droits.points_rci,
    points_agirc_arrco: r.droits.points_agirc_arrco,
    rente_base_annuelle: r.droits.rente_base_annuelle,
    rente_complementaire_annuelle: r.droits.rente_complementaire_annuelle,
    valeur_actuelle_droits: r.droits.valeur_actuelle_droits,
  };
  out.allocation = r.allocation;
  return out;
}

for (const cle of Object.keys(cas).sort()) {
  M.setReferentiel(params);
  const ctx = cas[cle];
  compare(cle, 'actuel', attendus[cle].actuel, resume(M.scenarioActuel(ctx)));
  for (const o of OBJECTIFS) {
    M.setReferentiel(params);
    compare(cle, o, attendus[cle][o], resume(M.optimiser(ctx, o).resultat));
  }
  process.stdout.write('.');
}

console.log('\n');
console.log(`Comparaisons : ${comparaisons}`);
if (ecarts.length === 0) {
  console.log('OK — les deux moteurs produisent des résultats identiques (tolérance 0,01 €).');
  process.exit(0);
}
console.log(`ÉCARTS DÉTECTÉS : ${ecarts.length}`);
ecarts.slice(0, 40).forEach((e) => console.log('  ' + e));
process.exit(1);
