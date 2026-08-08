/* =============================================================================
 * Moteur d'optimisation patrimoniale du dirigeant — portage JavaScript
 * -----------------------------------------------------------------------------
 * Ce fichier est un PORTAGE FIDÈLE du moteur Python (engine/ + optimizer/).
 * Les deux implémentations partagent le même référentiel de paramètres
 * (rules/parameters/2026.yaml -> ui/params.json) et sont vérifiées ligne à ligne
 * par build/verifier.js sur l'ensemble de la bibliothèque de cas.
 * Toute modification ici doit être répercutée côté Python, et inversement.
 * ========================================================================== */
(function (global) {
  'use strict';

  const TOLERANCE = 0.51;
  let P = null;                     // référentiel chargé
  const ACCES = [];                 // chemins de règles consultés (journal)

  function setReferentiel(params) { P = params; ACCES.length = 0; }

  function get(chemin, defaut) {
    let n = P;
    for (const cle of chemin.split('.')) {
      if (n === null || typeof n !== 'object' || !(cle in n)) {
        if (defaut !== undefined) return defaut;
        throw new Error('Paramètre absent du référentiel : ' + chemin);
      }
      n = n[cle];
    }
    if (!ACCES.includes(chemin)) ACCES.push(chemin);
    return n;
  }

  const PASS = () => get('references.pass.valeurs')['2026'];
  const PASS_ANNEE = (a) => get('references.pass.valeurs')[String(a)];

  // ---------------------------------------------------------------------------
  // Utilitaires de barème
  // ---------------------------------------------------------------------------
  function baremeProgressifTauxUnique(assiette, bareme, pass_) {
    const ratio = pass_ ? assiette / pass_ : 0;
    for (const tr of bareme) {
      const haut = tr.a;
      if (haut === null || ratio <= haut) {
        if (haut === null || tr.taux_debut === tr.taux_fin) return tr.taux_fin;
        const largeur = haut - tr.de;
        if (largeur <= 0) return tr.taux_fin;
        const av = (ratio - tr.de) / largeur;
        return tr.taux_debut + av * (tr.taux_fin - tr.taux_debut);
      }
    }
    return bareme[bareme.length - 1].taux_fin;
  }

  function tranche(assiette, de, a) {
    const haut = (a === null || a === undefined) ? assiette : Math.min(assiette, a);
    return Math.max(0, haut - de);
  }

  function ligne(code, libelle, assiette, taux, montant, payeur, droits, caractere, note) {
    return { code, libelle, assiette, taux, montant, payeur, droits, caractere, note: note || '' };
  }

  // Cotisation maladie-maternité des indépendants (art. D.621-1 et D.621-2 CSS).
  // Deux étages : taux de base 8,50 % sur la fraction d'assiette n'excédant pas
  // 3 PASS et 6,50 % sur la seule fraction au-delà (taux MARGINAL, jamais appliqué
  // à la totalité). Sous 3 PASS, le taux de base subit une réduction dégressive
  // (D.621-2) et le taux réduit s'applique, lui, à la totalité de l'assiette.
  // La fonction est continue en 3 PASS et croissante partout : ce barème ne
  // comporte aucune « falaise ».
  function cotisationMaladie(assiette) {
    const pass_ = PASS();
    const tauxBase = get('social_tns.maladie_maternite.taux_base');
    const seuil = get('social_tns.maladie_maternite.seuil_fraction_superieure_pct_pass') * pass_;
    const tauxSup = get('social_tns.maladie_maternite.taux_fraction_superieure');
    const bareme = get('social_tns.maladie_maternite.bareme_reduction_pct_pass');
    const A = Math.max(0, assiette);
    let montant, taux, explication;
    if (A <= seuil) {
      taux = baremeProgressifTauxUnique(A, bareme, pass_);
      montant = A * taux;
      explication = 'Taux réduit de ' + (taux * 100).toFixed(2) + ' % appliqué à la totalité de '
        + 'l\'assiette (assiette inférieure à 3 PASS, réduction de l\'art. D.621-2 CSS).';
    } else {
      montant = seuil * tauxBase + (A - seuil) * tauxSup;
      taux = A ? montant / A : 0;
      explication = (tauxBase * 100).toFixed(2) + ' % sur la fraction jusqu\'à 3 PASS et '
        + (tauxSup * 100).toFixed(2) + ' % sur la fraction au-delà, soit un taux moyen de '
        + (taux * 100).toFixed(2) + ' %.';
    }
    return { montant, taux_moyen: taux, assiette: A, fraction_sous_seuil: Math.min(A, seuil),
             fraction_au_dela: Math.max(0, A - seuil), explication };
  }

  // ===========================================================================
  // SOCIAL — TRAVAILLEUR NON SALARIÉ
  // ===========================================================================
  function assietteUnique(revenuBrut) {
    const pass_ = PASS();
    const taux = get('social_tns.assiette.taux_abattement');
    const plancher = get('social_tns.assiette.plancher_abattement_pct_pass') * pass_;
    const plafond = get('social_tns.assiette.plafond_abattement_pct_pass') * pass_;
    const brut = Math.max(0, revenuBrut);
    const theorique = taux * brut;
    let abattement = Math.min(Math.max(theorique, plancher), plafond);
    abattement = Math.min(abattement, brut);
    return { revenu_brut: brut, abattement_theorique: theorique, abattement_retenu: abattement,
             assiette: brut - abattement, plancher, plafond };
  }

  function cotisationsTNS(revenuBrut, activite, appliquerMinimales) {
    if (appliquerMinimales === undefined) appliquerMinimales = true;
    activite = activite || 'commerciale';
    const pass_ = PASS();
    const a = assietteUnique(revenuBrut);
    const A = a.assiette;
    const lignes = [];

    // maladie-maternité : pas de cotisation minimale (supprimée par la LFSS 2017),
    // le taux est simplement nul sous 20 % du PASS (art. D.621-2, 1° CSS).
    const mal = cotisationMaladie(A);
    lignes.push(ligne('TNS_MAL', 'Maladie-maternité', A, mal.taux_moyen, mal.montant,
      'dirigeant', get('social_tns.maladie_maternite.droits_generes'),
      get('social_tns.maladie_maternite.caractere'),
      mal.explication));

    // indemnités journalières
    const plafIJ = get('social_tns.indemnites_journalieres.plafond_pct_pass') * pass_;
    const minIJ = get('social_tns.indemnites_journalieres.assiette_minimale_pct_pass') * pass_;
    const assietteIJ = Math.min(Math.max(A, appliquerMinimales ? minIJ : 0), plafIJ);
    const tauxIJ = get('social_tns.indemnites_journalieres.taux');
    let montantIJ = assietteIJ * tauxIJ;
    if (appliquerMinimales) montantIJ = Math.max(montantIJ, get('social_tns.indemnites_journalieres.cotisation_minimale_eur'));
    lignes.push(ligne('TNS_IJ', 'Indemnités journalières', assietteIJ, tauxIJ, montantIJ,
      'dirigeant', get('social_tns.indemnites_journalieres.droits_generes'),
      get('social_tns.indemnites_journalieres.caractere')));

    // retraite de base
    const tr = get('social_tns.retraite_base.tranches');
    const baseT1 = Math.min(A, pass_);
    let montantT1 = baseT1 * tr[0].taux;
    if (appliquerMinimales) montantT1 = Math.max(montantT1, get('social_tns.retraite_base.cotisation_minimale_eur'));
    lignes.push(ligne('TNS_RB1', 'Retraite de base — tranche plafonnée', baseT1, tr[0].taux, montantT1,
      'dirigeant', 'Trimestres et report au compte, dans la limite de 1 PASS', 'contributif'));
    lignes.push(ligne('TNS_RB2', 'Retraite de base — part déplafonnée', A, tr[1].taux, A * tr[1].taux,
      'dirigeant', 'Aucun droit proportionnel : contribution de solidarité', 'solidarite',
      'Part déplafonnée : cotisée sans contrepartie de droits.'));

    // retraite complémentaire RCI
    let cotRCI = 0;
    for (const t of get('social_tns.retraite_complementaire_rci.tranches')) {
      const de = t.de_pct_pass * pass_;
      const aa = t.a_pct_pass === null ? null : t.a_pct_pass * pass_;
      const base = tranche(A, de, aa);
      if (base <= 0 || t.taux === 0) continue;
      const m = base * t.taux;
      cotRCI += m;
      lignes.push(ligne('TNS_RCI_' + t.libelle, 'Retraite complémentaire RCI — ' + t.libelle,
        base, t.taux, m, 'dirigeant', 'Points RCI', 'contributif'));
    }

    // invalidité-décès
    const minID = get('social_tns.invalidite_deces.assiette_minimale_pct_pass') * pass_;
    const assietteID = Math.min(Math.max(A, appliquerMinimales ? minID : 0), pass_);
    const tauxID = get('social_tns.invalidite_deces.taux');
    lignes.push(ligne('TNS_ID', 'Invalidité-décès', assietteID, tauxID, assietteID * tauxID,
      'dirigeant', get('social_tns.invalidite_deces.droits_generes'),
      get('social_tns.invalidite_deces.caractere')));

    // allocations familiales
    const tauxAF = baremeProgressifTauxUnique(A, get('social_tns.allocations_familiales.bareme_pct_pass'), pass_);
    lignes.push(ligne('TNS_AF', 'Allocations familiales', A, tauxAF, A * tauxAF, 'dirigeant',
      'Aucun droit personnel proportionnel', 'solidarite'));

    // CSG / CRDS
    const tCSG = get('social_tns.csg_crds.taux_csg');
    const tCRDS = get('social_tns.csg_crds.taux_crds');
    lignes.push(ligne('TNS_CSG', 'CSG (dont 6,80 pts déductibles)', A, tCSG, A * tCSG, 'dirigeant', 'Aucun', 'solidarite'));
    lignes.push(ligne('TNS_CRDS', 'CRDS', A, tCRDS, A * tCRDS, 'dirigeant', 'Aucun', 'solidarite'));

    // formation professionnelle
    const cle = activite === 'artisanale' ? 'taux_artisan' : 'taux_commercant';
    const tauxCFP = get('social_tns.formation_professionnelle.' + cle);
    lignes.push(ligne('TNS_CFP', 'Contribution à la formation professionnelle', pass_, tauxCFP,
      pass_ * tauxCFP, 'dirigeant', 'Droit à la formation professionnelle', 'contributif_partiel'));

    const total = lignes.reduce((s, l) => s + l.montant, 0);
    const csgCrds = A * (tCSG + tCRDS);
    const csgDeductible = A * get('social_tns.csg_crds.part_csg_deductible');
    const cotisationsDeductibles = total - csgCrds;

    return {
      lignes, assiette: A, revenu_brut: a.revenu_brut, abattement: a.abattement_retenu,
      total, csg_crds: csgCrds, csg_deductible: csgDeductible,
      csg_non_deductible: csgCrds - csgDeductible,
      cotisations_hors_csg: cotisationsDeductibles,
      cotisations_deductibles_ir: cotisationsDeductibles + csgDeductible,
      cotisation_rci: cotRCI, cotisation_retraite_base_t1: montantT1,
      net_percu: revenuBrut - total,
      imposable_avant_abattement_10: Math.max(0, revenuBrut - (cotisationsDeductibles + csgDeductible)),
    };
  }

  // ===========================================================================
  // SOCIAL — ASSIMILÉ SALARIÉ
  // ===========================================================================
  function baseAS(brut, code, pass_) {
    if (code === 'TOT') return brut;
    if (code === 'T1') return Math.min(brut, pass_);
    if (code === 'T2') return tranche(brut, pass_, 8 * pass_);
    if (code === 'T1T2') return Math.min(brut, 8 * pass_);
    throw new Error('base inconnue ' + code);
  }

  function cotisationsASdepuisBrut(brut, tauxAtmp, cadre, effectif, tauxVM) {
    effectif = effectif || 0; tauxVM = tauxVM || 0;
    const pass_ = PASS();
    const lignes = [];
    let patronal = 0, salarial = 0, salarialDeductible = 0;

    for (const l of get('social_assimile_salarie.cotisations.lignes')) {
      const code = l.code;
      if (code === 'APEC' && !cadre) continue;
      if (code === 'CET' && brut <= pass_) continue;
      if ('effectif_min' in l && effectif < l.effectif_min) continue;
      if ('effectif_max' in l && effectif > l.effectif_max) continue;
      const base = baseAS(brut, l.base, pass_);
      if (base <= 0) continue;
      let tp = l.taux_patronal;
      if (code === 'ATMP' && tauxAtmp !== null && tauxAtmp !== undefined) tp = tauxAtmp;
      if (code === 'VM') { tp = tauxVM; if (tp <= 0) continue; }
      const ts = l.taux_salarial;
      if (tp) {
        const m = base * tp; patronal += m;
        lignes.push(ligne('AS_' + code + '_P', l.libelle + ' (part employeur)', base, tp, m,
          'societe', l.droits, l.caractere));
      }
      if (ts) {
        const m = base * ts; salarial += m; salarialDeductible += m;
        lignes.push(ligne('AS_' + code + '_S', l.libelle + ' (part salariale)', base, ts, m,
          'dirigeant', l.droits, l.caractere));
      }
    }

    const ab = get('social_assimile_salarie.csg_crds.abattement_frais_pro');
    const plafAb = get('social_assimile_salarie.csg_crds.plafond_abattement_pct_pass') * pass_;
    const assietteCsg = Math.min(brut, plafAb) * (1 - ab) + Math.max(0, brut - plafAb);
    const tD = get('social_assimile_salarie.csg_crds.taux_csg_deductible');
    const tND = get('social_assimile_salarie.csg_crds.taux_csg_non_deductible');
    const tCR = get('social_assimile_salarie.csg_crds.taux_crds');
    [['CSG déductible', tD, true], ['CSG non déductible', tND, false], ['CRDS', tCR, false]]
      .forEach(function (x) {
        const m = assietteCsg * x[1];
        salarial += m;
        if (x[2]) salarialDeductible += m;
        lignes.push(ligne(x[0].indexOf('CSG') >= 0 ? 'AS_CSG' : 'AS_CRDS', x[0], assietteCsg, x[1], m,
          'dirigeant', 'Aucun', 'solidarite'));
      });

    return {
      lignes, brut, patronal, salarial, salarial_deductible: salarialDeductible,
      cout_entreprise: brut + patronal, net_percu: brut - salarial,
      imposable_avant_abattement_10: Math.max(0, brut - salarialDeductible),
      assiette_csg: assietteCsg, csg_crds: assietteCsg * (tD + tND + tCR),
      total_cotisations: patronal + salarial, total: patronal + salarial,
    };
  }

  function brutDepuisCout(cout, tauxAtmp, cadre, effectif, tauxVM) {
    if (cout <= 0) return 0;
    let bas = 0, haut = cout;
    for (let i = 0; i < 200; i++) {
      const mid = (bas + haut) / 2;
      const r = cotisationsASdepuisBrut(mid, tauxAtmp, cadre, effectif, tauxVM);
      if (r.cout_entreprise > cout) haut = mid; else bas = mid;
      if (haut - bas < 1e-7) break;
    }
    return (bas + haut) / 2;
  }

  function netEtImposableAS(cout, tauxAtmp, cadre, effectif, tauxVM) {
    const brut = brutDepuisCout(cout, tauxAtmp, cadre, effectif, tauxVM);
    return cotisationsASdepuisBrut(brut, tauxAtmp, cadre, effectif, tauxVM);
  }

  // ===========================================================================
  // IMPÔT SUR LE REVENU
  // ===========================================================================
  function nbParts(foyer) {
    const base = foyer.situation === 'couple' ? 2 : 1;
    const n = foyer.nb_enfants || 0;
    let parts = 0.5 * Math.min(n, 2) + 1.0 * Math.max(0, n - 2);
    if (foyer.parent_isole && n > 0) parts += 0.5;
    return base + parts;
  }

  function abattement10(revenu) {
    if (revenu <= 0) return 0;
    const taux = get('impot_revenu.abattement_salaires.taux');
    const plancher = get('impot_revenu.abattement_salaires.plancher');
    const plafond = get('impot_revenu.abattement_salaires.plafond');
    return Math.min(Math.max(revenu * taux, Math.min(plancher, revenu)), plafond);
  }

  function baremeIR(revenuParPart) {
    let impot = 0, bas = 0;
    for (const tr of get('impot_revenu.bareme.tranches')) {
      const haut = tr.plafond;
      if (haut === null) { impot += Math.max(0, revenuParPart - bas) * tr.taux; break; }
      impot += Math.max(0, Math.min(revenuParPart, haut) - bas) * tr.taux;
      bas = haut;
      if (revenuParPart <= bas) break;
    }
    return impot;
  }

  function impotBrut(revenu, parts) { return baremeIR(revenu / parts) * parts; }

  function impotRevenu(revenuNetGlobal, foyer, revenusCapitalBareme) {
    revenusCapitalBareme = revenusCapitalBareme || 0;
    const base = Math.max(0, revenuNetGlobal + revenusCapitalBareme);
    const parts = nbParts(foyer);
    const partsBase = foyer.situation === 'couple' ? 2 : 1;
    const brutAvec = impotBrut(base, parts);
    const brutSans = impotBrut(base, partsBase);
    const plafondDemi = get('impot_revenu.quotient_familial.plafond_demi_part');
    const demiSup = (parts - partsBase) / 0.5;
    const avantage = brutSans - brutAvec;
    let avantageMax;
    if (foyer.parent_isole && (foyer.nb_enfants || 0) > 0) {
      // Part entière du premier enfant du parent isolé, plafonnée spécifiquement.
      const couvertes = get('impot_revenu.quotient_familial.demi_parts_couvertes_parent_isole');
      const plafondIsole = get('impot_revenu.quotient_familial.plafond_part_entiere_parent_isole');
      avantageMax = plafondIsole + plafondDemi * Math.max(0, demiSup - couvertes);
    } else {
      avantageMax = plafondDemi * demiSup;
    }
    const plafonnement = Math.max(0, avantage - avantageMax);
    const ib = brutAvec + plafonnement;
    const couple = foyer.situation === 'couple';
    const mont = get(couple ? 'impot_revenu.decote.montant_couple' : 'impot_revenu.decote.montant_celibataire');
    const seuil = get(couple ? 'impot_revenu.decote.seuil_impot_brut_couple' : 'impot_revenu.decote.seuil_impot_brut_celibataire');
    const tauxDecote = get('impot_revenu.decote.taux');
    const decote = ib < seuil ? Math.max(0, mont - tauxDecote * ib) : 0;
    const impot = Math.max(0, ib - decote);
    return { revenu_imposable: base, parts, impot_brut: ib, plafonnement_quotient: plafonnement,
             decote, impot, taux_moyen: base ? impot / base : 0 };
  }

  function tauxMarginalIR(revenuNetGlobal, foyer) {
    const a = impotRevenu(revenuNetGlobal, foyer).impot;
    const b = impotRevenu(revenuNetGlobal + 100, foyer).impot;
    return (b - a) / 100;
  }

  function cehr(rfr, foyer) {
    const cle = foyer.situation === 'couple' ? 'tranches_couple' : 'tranches_celibataire';
    let total = 0;
    for (const tr of get('impot_revenu.cehr.' + cle)) {
      const haut = tr.a === null ? rfr : Math.min(rfr, tr.a);
      total += Math.max(0, haut - tr.de) * tr.taux;
    }
    return total;
  }

  function cdhr(rfr, ir, cehrDu, prelevementsLiberatoires, foyer) {
    const couple = foyer.situation === 'couple';
    const seuil = get(couple ? 'impot_revenu.cdhr.seuil_couple' : 'impot_revenu.cdhr.seuil_celibataire');
    if (rfr <= seuil) return { cdhr: 0, seuil, applicable: false };
    const taux = get('impot_revenu.cdhr.taux_plancher');
    const abatPac = get('impot_revenu.cdhr.abattement_par_personne_a_charge') * (foyer.nb_enfants || 0);
    const abatCouple = couple ? get('impot_revenu.cdhr.abattement_imposition_commune') : 0;
    const deja = ir + cehrDu + prelevementsLiberatoires + abatPac + abatCouple;
    const contribution = Math.max(0, taux * rfr - deja);
    const plafondDecote = get(couple ? 'impot_revenu.cdhr.plafond_decote_couple' : 'impot_revenu.cdhr.plafond_decote_celibataire');
    let reduction = 0;
    if (rfr <= plafondDecote) {
      const lissage = get('impot_revenu.cdhr.coefficient_lissage');
      reduction = Math.max(0, taux * rfr - lissage * (rfr - seuil));
    }
    return { cdhr: Math.max(0, contribution - reduction), avant_decote: contribution,
             decote: reduction, seuil, applicable: true };
  }

  // ===========================================================================
  // ENTREPRISE
  // ===========================================================================
  function impotSocietes(resultatFiscal, e) {
    if (resultatFiscal <= 0) {
      return { is: 0, is_hors_contribution: 0, contribution_sociale: 0,
               taux_reduit_applicable: false, detail: [], resultat_fiscal: resultatFiscal, taux_effectif: 0 };
    }
    const tn = get('impot_societes.taux_normal');
    const tr = get('impot_societes.taux_reduit');
    const plafond = get('impot_societes.plafond_taux_reduit');
    const cond = get('impot_societes.conditions_taux_reduit');
    const eligible = e.ca_ht <= cond.ca_ht_max && e.capital_libere !== false
      && (e.detention_personnes_physiques === undefined ? 1 : e.detention_personnes_physiques) >= cond.detention_min_personnes_physiques;
    const detail = [];
    if (eligible) {
      const br = Math.min(resultatFiscal, plafond);
      const bn = Math.max(0, resultatFiscal - plafond);
      detail.push({ tranche: 'taux réduit', assiette: br, taux: tr, montant: br * tr });
      if (bn) detail.push({ tranche: 'taux normal', assiette: bn, taux: tn, montant: bn * tn });
    } else {
      detail.push({ tranche: 'taux normal', assiette: resultatFiscal, taux: tn, montant: resultatFiscal * tn });
    }
    const isDu = detail.reduce((s, d) => s + d.montant, 0);
    const cs = get('impot_societes.contribution_sociale');
    let contribution = 0;
    if (e.ca_ht > cs.seuil_ca_ht && isDu > cs.seuil_is_du) {
      contribution = Math.max(0, isDu - cs.abattement_sur_is) * cs.taux;
    }
    const total = isDu + contribution;
    return { is: total, is_hors_contribution: isDu, contribution_sociale: contribution,
             taux_reduit_applicable: eligible, detail, resultat_fiscal: resultatFiscal,
             taux_effectif: total / resultatFiscal };
  }

  function montantReferenceDividendes(e, detention) {
    return (e.capital_social + (e.primes_emission || 0)) * detention + (e.compte_courant_associe_moyen || 0);
  }

  // ===========================================================================
  // DIVIDENDES
  // ===========================================================================
  function repartitionSeuil10(dividendes, ctx) {
    const tauxSeuil = get('social_tns.dividendes_seuil_10.taux_seuil');
    const mr = montantReferenceDividendes(ctx.entreprise, ctx.dirigeant.detention);
    const seuil = tauxSeuil * mr;
    return { montant_reference: mr, seuil,
             fraction_capital: Math.min(dividendes, seuil),
             fraction_sociale: Math.max(0, dividendes - seuil) };
  }

  function fiscaliteDividendes(fractionCapital, fractionSociale, optionBareme) {
    const tauxPS = get('capital.prelevements_sociaux.taux_plein_2026');
    const tauxPFU = get('capital.pfu.taux_ir');
    const abattement = get('capital.pfu.option_bareme.abattement_dividendes');
    const csgDed = get('capital.pfu.option_bareme.csg_deductible');
    const ps = fractionCapital * tauxPS;
    if (optionBareme) {
      return { mode: 'bareme', prelevements_sociaux_capital: ps, ir_forfaitaire: 0,
               base_imposable_bareme: (fractionCapital + fractionSociale) * (1 - abattement),
               csg_deductible: fractionCapital * csgDed,
               abattement_40: (fractionCapital + fractionSociale) * abattement };
    }
    return { mode: 'pfu', prelevements_sociaux_capital: ps,
             ir_forfaitaire: (fractionCapital + fractionSociale) * tauxPFU,
             base_imposable_bareme: 0, csg_deductible: 0, abattement_40: 0 };
  }

  // ===========================================================================
  // PER
  // ===========================================================================
  function plafondPER(ctx, statut, revenuN, revenuN1) {
    const passN = PASS();
    const passN1 = PASS_ANNEE(ctx.millesime - 1);
    const tSal = get('per_individuel.plafond_salarie.taux');
    const pSal = get('per_individuel.plafond_salarie.plafond_pass');
    const tpSal = get('per_individuel.plafond_salarie.taux_plancher');
    const plafondSalarie = Math.max(tSal * Math.min(revenuN1, pSal * passN1), tpSal * passN1);
    const tBase = get('per_individuel.plafond_tns.taux_base');
    const tMaj = get('per_individuel.plafond_tns.taux_majore');
    const pTns = get('per_individuel.plafond_tns.plafond_pass');
    const tpTns = get('per_individuel.plafond_tns.taux_plancher');
    const benefice = Math.max(0, revenuN);
    const plafonne = Math.min(benefice, pTns * passN);
    const plafondTns = Math.max(tBase * plafonne + tMaj * Math.max(0, plafonne - passN), tpTns * passN);
    const retenu = statut === 'TNS' ? plafondTns : plafondSalarie;
    const f = ctx.foyer;
    const disponible = retenu + Math.max(0, f.plafond_per_reporte || 0) - Math.max(0, f.per_deja_verse || 0);
    get('per_individuel.plafond_tns.formule'); get('per_individuel.plafond_salarie.formule');
    return { plafond_salarie: plafondSalarie, plafond_tns: plafondTns, plafond_retenu: retenu,
             report_anterieur: Math.max(0, f.plafond_per_reporte || 0),
             deja_verse: Math.max(0, f.per_deja_verse || 0), disponible: Math.max(0, disponible) };
  }

  // Revenu professionnel imposable de N-1, base des plafonds assis sur N-1.
  // 1) revenu N-1 saisi par le conseiller ; 2) à défaut, la rémunération actuelle
  // (qui est un COÛT entreprise) convertie en revenu imposable ; 3) à défaut,
  // l'imposable du scénario simulé.
  function revenuProfessionnelN1(ctx, statut, imposableRemuBrut) {
    const d = ctx.dirigeant, e = ctx.entreprise;
    if (d.revenu_professionnel_n1 !== undefined && d.revenu_professionnel_n1 !== null) {
      return Math.max(0, d.revenu_professionnel_n1);
    }
    if (d.remuneration_actuelle > 0) {
      const base = (statut === 'TNS')
        ? cotisationsTNS(d.remuneration_actuelle, e.activite)
        : netEtImposableAS(d.remuneration_actuelle, d.taux_atmp, d.affiliation_cadre !== false, e.nb_salaries, 0);
      return Math.max(0, base.imposable_avant_abattement_10);
    }
    return Math.max(0, imposableRemuBrut);
  }

  // Seule la fraction DÉDUITE à l'entrée est imposée au barème à la sortie ; la
  // fraction versée au-delà du plafond ressort en franchise. Les plus-values
  // supportent le PFU. La valeur nette d'horizon est actualisée pour être
  // comparable au net immédiat : on ne peut pas débiter une fiscalité future
  // sans créditer les revenus futurs qui la produisent.
  function valorisationPER(capital, ctx, fractionDeductible) {
    const h = ctx.hypotheses;
    const n = Math.max(0, h.horizon_annees);
    const deductible = (fractionDeductible === undefined || fractionDeductible === null)
      ? capital : Math.max(0, Math.min(fractionDeductible, capital));
    const brut = capital * Math.pow(1 + h.rendement_epargne, n);
    const pv = Math.max(0, brut - capital);
    const tauxPfu = get('capital.pfu.taux_global');
    const tauxActu = get('retraite.hypotheses_valorisation.taux_actualisation_reel');
    const fiscalite = deductible * h.fiscalite_future_epargne_retraite + pv * tauxPfu;
    const net = brut - fiscalite;
    return { capital_verse: capital, fraction_deductible: deductible,
             fraction_non_deductible: capital - deductible,
             valeur_brute_horizon: brut, plus_values: pv,
             fiscalite_sortie_estimee: fiscalite, valeur_nette_horizon: net,
             valeur_actuelle: net / Math.pow(1 + tauxActu, n) };
  }

  // Symétrique du PER pour l'épargne salariale : exonérée d'IR, ses seules
  // plus-values supportent les prélèvements sociaux à la sortie.
  function valorisationEpargneSalariale(capital, ctx) {
    const h = ctx.hypotheses;
    const n = Math.max(0, h.horizon_annees);
    const tauxPs = get('epargne_salariale.prelevements_sociaux_sortie.taux_2026');
    const tauxActu = get('retraite.hypotheses_valorisation.taux_actualisation_reel');
    const brut = capital * Math.pow(1 + h.rendement_epargne, n);
    const pv = Math.max(0, brut - capital);
    const ps = pv * tauxPs;
    const net = brut - ps;
    return { capital, valeur_brute_horizon: brut, plus_values: pv,
             prelevements_sociaux_sortie: ps, valeur_nette_horizon: net,
             valeur_actuelle: net / Math.pow(1 + tauxActu, n) };
  }

  // ===========================================================================
  // ÉPARGNE SALARIALE
  // ===========================================================================
  function plafondsES(ctx, revenuN1) {
    const pass_ = PASS(), e = ctx.entreprise;
    const abPee = get('epargne_salariale.pee.abondement_plafond_pct_pass') * pass_;
    const abPereco = get('epargne_salariale.pereco.abondement_plafond_pct_pass') * pass_;
    const mult = get('epargne_salariale.pee.abondement_plafond_multiple_versement');
    const tauxVV = get('epargne_salariale.pee.taux_plafond_versement_volontaire');
    let plafondVersement = tauxVV * Math.max(revenuN1 || 0, 0);
    if (plafondVersement <= 0) plafondVersement = tauxVV * pass_;
    return {
      abondement_pee_max: abPee, abondement_pereco_max: abPereco,
      abondement_total_max: abPee + abPereco,
      multiple_versement_pee: Math.min(mult, Math.max(e.reglement_abondement_pee_pct, 0)),
      multiple_versement_pereco: Math.min(mult, Math.max(e.reglement_abondement_pereco_pct, 0)),
      versement_volontaire_max: plafondVersement,
      interessement_individuel_max: get('epargne_salariale.interessement.plafond_individuel_pct_pass') * pass_,
      interessement_taux_global: get('epargne_salariale.interessement.taux_plafond_global'),
    };
  }

  function enveloppeInteressementMax(ctx, remuneration) {
    return get('epargne_salariale.interessement.taux_plafond_global')
      * (ctx.entreprise.masse_salariale + Math.max(0, remuneration));
  }

  function partDirigeantInteressement(ctx, remuneration) {
    const total = ctx.entreprise.masse_salariale + Math.max(0, remuneration);
    return total > 0 ? Math.max(0, remuneration) / total : 0;
  }

  function coutEtValeurES(ctx, abPee, abPereco, interDirigeant, enveloppe) {
    const e = ctx.entreprise, effectif = e.nb_salaries;
    const fs = get('epargne_salariale.forfait_social');
    const tauxFsAb = effectif < fs.seuil_effectif_abondement_participation ? 0 : fs.taux_droit_commun;
    const tauxFsInt = effectif < fs.seuil_effectif_interessement ? 0 : fs.taux_droit_commun;
    const tauxCsg = get('epargne_salariale.csg_crds_sur_epargne_salariale.taux');
    const abTotal = abPee + abPereco;
    // Coût collectif : même règlement pour tous, formule continue (cf. moteur Python).
    const abSalaries = effectif * ctx.hypotheses.taux_adhesion_salaries * abTotal;
    const coutAb = (abTotal + abSalaries) * (1 + tauxFsAb);
    const coutInt = enveloppe * (1 + tauxFsInt);
    return {
      cout_entreprise: coutAb + coutInt,
      cout_abondement_dirigeant: abTotal * (1 + tauxFsAb),
      cout_abondement_salaries: abSalaries * (1 + tauxFsAb),
      cout_interessement_total: coutInt,
      interessement_salaries: Math.max(0, enveloppe - interDirigeant),
      forfait_social_abondement: (abTotal + abSalaries) * tauxFsAb,
      forfait_social_interessement: enveloppe * tauxFsInt,
      csg_crds: (abTotal + interDirigeant) * tauxCsg,
      epargne_bloquee_pee: (abPee + interDirigeant) * (1 - tauxCsg),
      epargne_bloquee_pereco: abPereco * (1 - tauxCsg),
      net_dirigeant: (abTotal + interDirigeant) * (1 - tauxCsg),
      taux_forfait_social_abondement: tauxFsAb,
      taux_forfait_social_interessement: tauxFsInt,
    };
  }

  function controlesES(ctx, vPee, abPee, vPereco, abPereco, interDir, enveloppe, revenuN1) {
    const p = plafondsES(ctx, revenuN1), out = [];
    const eur = (x) => Math.round(x).toLocaleString('fr-FR') + ' €';
    if (abPee > p.abondement_pee_max + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_PLAFOND_PEE', message: 'Abondement PEE de ' + eur(abPee) + ' supérieur au plafond légal de ' + eur(p.abondement_pee_max) + ' (8 % du PASS).' });
    if (abPee > vPee * p.multiple_versement_pee + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_MULTIPLE_PEE', message: 'Abondement PEE supérieur à ' + p.multiple_versement_pee + ' fois le versement volontaire (' + eur(vPee) + ').' });
    if (abPereco > p.abondement_pereco_max + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_PLAFOND_PERECO', message: 'Abondement PERECO de ' + eur(abPereco) + ' supérieur au plafond légal de ' + eur(p.abondement_pereco_max) + ' (16 % du PASS).' });
    if (abPereco > vPereco * p.multiple_versement_pereco + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_MULTIPLE_PERECO', message: 'Abondement PERECO supérieur au triple du versement volontaire.' });
    if (vPee + vPereco > p.versement_volontaire_max + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_PLAFOND_VERSEMENT', message: 'Versements volontaires supérieurs à 25 % du revenu professionnel de référence (' + eur(p.versement_volontaire_max) + ').' });
    if (interDir > p.interessement_individuel_max + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_PLAFOND_INT_INDIV', message: 'Intéressement du dirigeant supérieur au plafond individuel de ' + eur(p.interessement_individuel_max) + ' (75 % du PASS).' });
    const maxEnv = enveloppeInteressementMax(ctx, revenuN1);
    if (enveloppe > maxEnv + 1e-6)
      out.push({ niveau: 'erreur', code: 'ES_PLAFOND_INT_GLOBAL', message: 'Enveloppe d\'intéressement supérieure à 20 % des rémunérations (' + eur(maxEnv) + ').' });
    if (enveloppe > 0 && !ctx.entreprise.accord_interessement)
      out.push({ niveau: 'condition', code: 'ES_ACCORD_ABSENT', message: 'Aucun accord d\'intéressement en place : la stratégie est conditionnelle à la mise en place et au dépôt d\'un accord dans les délais légaux.' });
    return out;
  }

  // ===========================================================================
  // STATUT
  // ===========================================================================
  function qualifier(ctx) {
    const e = ctx.entreprise, d = ctx.dirigeant, forme = e.forme.toUpperCase();
    if (forme === 'EI') return { statut_social: 'TNS', regime_fiscal_remuneration: 'BIC_BNC',
      justification: 'Entrepreneur individuel : affiliation de plein droit au régime des travailleurs indépendants.',
      fondement: 'Art. L.611-1 CSS' };
    if (forme === 'SARL' || forme === 'EURL') {
      if (d.fonction === 'gerant_majoritaire' || d.detention > 0.5) {
        return { statut_social: 'TNS', regime_fiscal_remuneration: 'ART_62',
          justification: 'Gérant détenant ' + Math.round(d.detention * 100) + ' % des parts (majorité appréciée en tenant compte des parts du conjoint, du partenaire pacsé, des enfants mineurs et du collège de gérance) : travailleur non salarié.',
          fondement: 'Art. L.611-1 6° CSS ; art. 62 CGI pour l\'imposition de la rémunération' };
      }
      return { statut_social: 'ASSIMILE_SALARIE', regime_fiscal_remuneration: 'TRAITEMENTS_SALAIRES',
        justification: 'Gérant non majoritaire (' + Math.round(d.detention * 100) + ' %) : assimilé salarié au regard de la sécurité sociale.',
        fondement: 'Art. L.311-3 11° CSS' };
    }
    if (forme === 'SAS' || forme === 'SASU') {
      return { statut_social: 'ASSIMILE_SALARIE', regime_fiscal_remuneration: 'TRAITEMENTS_SALAIRES',
        justification: 'Président de société par actions simplifiée : assimilé salarié, quel que soit son niveau de détention.',
        fondement: 'Art. L.311-3 23° CSS' };
    }
    throw new Error('Forme juridique non prise en charge : ' + forme);
  }

  function accesEpargneSalariale(ctx) {
    const e = ctx.entreprise;
    const mini = get('epargne_salariale.acces_dirigeant.effectif_min_salaries');
    const maxi = get('epargne_salariale.acces_dirigeant.effectif_max_salaries');
    const fondement = 'Art. L.3312-3 et L.3332-2 du code du travail';
    if (e.nb_salaries < mini) return { eligible: false, conformite: 'impossible', fondement, reserves: [],
      motif: 'Aucun salarié dans l\'entreprise. Les dispositifs d\'épargne salariale sont réservés aux entreprises employant au moins un salarié autre que le dirigeant lui-même.' };
    if (e.nb_salaries > maxi) return { eligible: false, conformite: 'impossible', fondement, reserves: [],
      motif: 'Effectif de ' + e.nb_salaries + ' salariés : au-delà du plafond de ' + maxi + ' salariés ouvrant l\'accès du dirigeant.' };
    const reserves = [];
    let conformite = 'conforme';
    if (e.nb_salaries === 1 && e.conjoint_salarie) {
      conformite = 'conforme_sous_conditions';
      reserves.push('L\'unique salarié est le conjoint du dirigeant. La réalité du contrat de travail (fonctions effectives, rémunération cohérente avec l\'emploi, lien de subordination lorsqu\'il est requis, déclarations sociales) conditionne la validité du dispositif. L\'ancienneté du contrat ne suffit jamais à elle seule à sécuriser le montage.');
    }
    return { eligible: true, conformite, fondement, reserves,
      motif: 'Effectif de ' + e.nb_salaries + ' salarié(s) : dans la fourchette de ' + mini + ' à ' + maxi + '.' };
  }

  // ===========================================================================
  // RETRAITE
  // ===========================================================================
  function facteurRente() {
    const h = get('retraite.hypotheses_valorisation');
    const n = h.duree_service_rente_annees, i = h.taux_actualisation_reel;
    return i === 0 ? n : (1 - Math.pow(1 + i, -n)) / i;
  }

  function finaliserDroits(trimestres, pointsAA, pointsRCI, renteBase, renteComp) {
    const facteur = facteurRente();
    const tauxImpot = get('retraite.hypotheses_valorisation.taux_imposition_rente_a_la_retraite');
    return { trimestres, points_agirc_arrco: pointsAA, points_rci: pointsRCI,
             rente_base_annuelle: renteBase, rente_complementaire_annuelle: renteComp,
             valeur_actuelle_droits: (renteBase + renteComp) * facteur * (1 - tauxImpot),
             protection_sociale: {} };
  }

  function droitsTNS(assiette, cotRCI) {
    const pass_ = PASS();
    const seuil = get('references.trimestre_retraite.valeur_2026');
    const trimestres = seuil ? Math.min(4, Math.floor(assiette / seuil)) : 0;
    const tauxPlein = get('retraite.base_regime_general_et_independants.taux_plein');
    const nAnnees = get('retraite.base_regime_general_et_independants.nb_annees_salaire_annuel_moyen');
    const renteBase = Math.min(assiette, pass_) * tauxPlein / nAnnees;
    const va = get('retraite.rci.valeur_achat_point'), vs = get('retraite.rci.valeur_service_point');
    const points = va ? cotRCI / va : 0;
    return finaliserDroits(trimestres, 0, points, renteBase, points * vs);
  }

  function droitsAssimile(brut) {
    const pass_ = PASS();
    const seuil = get('references.trimestre_retraite.valeur_2026');
    const trimestres = seuil ? Math.min(4, Math.floor(brut / seuil)) : 0;
    const tauxPlein = get('retraite.base_regime_general_et_independants.taux_plein');
    const nAnnees = get('retraite.base_regime_general_et_independants.nb_annees_salaire_annuel_moyen');
    const renteBase = Math.min(brut, pass_) * tauxPlein / nAnnees;
    const va = get('retraite.agirc_arrco.valeur_achat_point'), vs = get('retraite.agirc_arrco.valeur_service_point');
    const t1 = get('retraite.agirc_arrco.taux_contractuel_t1'), t2 = get('retraite.agirc_arrco.taux_contractuel_t2');
    const cot = Math.min(brut, pass_) * t1 + tranche(brut, pass_, 8 * pass_) * t2;
    const points = va ? cot / va : 0;
    return finaliserDroits(trimestres, points, 0, renteBase, points * vs);
  }

  // ===========================================================================
  // ÉVALUATION D'UN SCÉNARIO
  // ===========================================================================
  const eurJS = (x) => Math.round(x).toLocaleString('fr-FR') + ' €';
  const ORDRE = ['A', 'B', 'C', 'D', 'E'];
  const degrader = (n, c) => ORDRE[Math.max(ORDRE.indexOf(n), ORDRE.indexOf(c))];

  function robustesse(ctx, alloc, acces, statut, rep) {
    let note = 'A';
    const motifs = [], e = ctx.entreprise;
    if (alloc.interessement_enveloppe > 0) {
      if (!e.accord_interessement) { note = degrader(note, 'C');
        motifs.push('Accord d\'intéressement à mettre en place et à déposer : la stratégie est conditionnelle.'); }
      if (e.nb_salaries <= 1) { note = degrader(note, 'D');
        motifs.push('Intéressement dans une entreprise à un seul salarié : la réalité de la collectivité de travail et le caractère aléatoire de la formule seront examinés. Risque de requalification.'); }
    }
    if ((alloc.abondement_pee + alloc.abondement_pereco) > 0) {
      if (e.nb_salaries === 1 && e.conjoint_salarie) { note = degrader(note, 'D');
        motifs.push('Le seul salarié est le conjoint du dirigeant. Le dispositif suppose un contrat de travail réel : fonctions effectives, rémunération cohérente, déclarations sociales. L\'ancienneté du contrat ne sécurise pas à elle seule le montage.'); }
      else if (e.nb_salaries < 2) { note = degrader(note, 'C');
        motifs.push('Effectif très réduit : vérifier le caractère collectif effectif du plan et l\'égalité de traitement.'); }
      if (!(e.pee_existant || e.pereco_existant)) { note = degrader(note, 'B');
        motifs.push('Plan à créer : règlement, teneur de compte et information des bénéficiaires à formaliser.'); }
    }
    if (statut === 'TNS' && (rep.fraction_sociale || 0) > 0) {
      note = degrader(note, 'B');
      motifs.push('Fraction de dividendes soumise aux cotisations TNS : le montant de référence doit être justifié (capital libéré, primes d\'émission, solde MOYEN annuel des comptes courants au dernier jour de l\'exercice précédent).');
    }
    if (alloc.versement_per_individuel > 0)
      motifs.push('Versement PER : dispositif de droit commun, sécurisé, sous réserve du plafond disponible.');
    if (!motifs.length)
      motifs.push('Rémunération et distribution de droit commun : aucune interprétation sensible mobilisée.');
    if (!acces.eligible && (alloc.abondement_pee + alloc.abondement_pereco + alloc.interessement_enveloppe) > 0) {
      note = 'E'; motifs.unshift(acces.motif);
    }
    return { note, motifs };
  }

  function evaluer(ctx, alloc, libelle) {
    const e = ctx.entreprise, d = ctx.dirigeant, f = ctx.foyer, h = ctx.hypotheses;
    const q = qualifier(ctx), statut = q.statut_social;
    const res = { libelle: libelle || 'scénario', allocation: Object.assign({}, alloc),
                  conformite: 'conforme', alertes: [], controles: [], detail: { qualification: q } };

    const acces = accesEpargneSalariale(ctx);
    res.detail.acces_epargne_salariale = acces;
    let utiliseES = (alloc.abondement_pee + alloc.abondement_pereco + alloc.interessement_enveloppe) > 0;
    if (utiliseES && !acces.eligible) {
      res.conformite = 'impossible';
      res.alertes.push({ niveau: 'bloquant', code: 'ES_INELIGIBLE', message: acces.motif });
      alloc = Object.assign({}, alloc, { abondement_pee: 0, abondement_pereco: 0,
        versement_pee: 0, versement_pereco: 0, interessement_enveloppe: 0 });
      res.allocation = Object.assign({}, alloc);
      utiliseES = false;
    }

    let coutRemu = Math.max(0, alloc.cout_remuneration);
    let lignes = [], baseRemu, netRemu, imposableRemuBrut, assietteSocialeRemu, brutSalarial = null;
    if (statut === 'TNS') {
      baseRemu = cotisationsTNS(coutRemu, e.activite);
      lignes = lignes.concat(baseRemu.lignes);
      netRemu = baseRemu.net_percu;
      imposableRemuBrut = baseRemu.imposable_avant_abattement_10;
      assietteSocialeRemu = baseRemu.assiette;
    } else {
      baseRemu = netEtImposableAS(coutRemu, d.taux_atmp, d.affiliation_cadre !== false, e.nb_salaries, 0);
      const ecartInversion = baseRemu.cout_entreprise - coutRemu;
      if (Math.abs(ecartInversion) > TOLERANCE) {
        res.controles.push({ niveau: 'condition', code: 'INVERSION_COUT_BRUT', ecart: ecartInversion,
          message: 'Aucun brut ne correspond exactement à ce coût (discontinuité de la CET au passage de 1 PASS). Coût réellement engagé : ' + eurJS(baseRemu.cout_entreprise) + '.' });
      }
      coutRemu = baseRemu.cout_entreprise;
      lignes = lignes.concat(baseRemu.lignes);
      netRemu = baseRemu.net_percu;
      imposableRemuBrut = baseRemu.imposable_avant_abattement_10;
      assietteSocialeRemu = baseRemu.brut;
      brutSalarial = baseRemu.brut;
    }

    const divBrut = Math.max(0, alloc.dividendes_bruts);
    let cotDividendes = 0, deductiblesDiv = 0, rep;
    if (statut === 'TNS' && divBrut > 0) {
      rep = repartitionSeuil10(divBrut, ctx);
      res.detail.seuil_10_dividendes = rep;
      if (rep.fraction_sociale > 0) {
        const total = cotisationsTNS(coutRemu + rep.fraction_sociale, e.activite);
        cotDividendes = total.total - baseRemu.total;
        deductiblesDiv = total.cotisations_deductibles_ir - baseRemu.cotisations_deductibles_ir;
        lignes.push(ligne('TNS_DIV', 'Cotisations TNS sur la fraction de dividendes excédant 10 %',
          rep.fraction_sociale, cotDividendes / rep.fraction_sociale, cotDividendes, 'dirigeant',
          'Droits retraite proportionnels comme la rémunération', 'contributif_partiel',
          'Fraction excédant 10 % du capital + primes d\'émission + solde moyen des comptes courants.'));
        res.alertes.push({ niveau: 'vigilance', code: 'DIV_SEUIL_10',
          message: Math.round(rep.fraction_sociale).toLocaleString('fr-FR') + ' € de dividendes dépassent le seuil de 10 % ('
            + Math.round(rep.seuil).toLocaleString('fr-FR') + ' €) et supportent les cotisations TNS.' });
      }
    } else {
      rep = { fraction_capital: divBrut, fraction_sociale: 0, seuil: null, montant_reference: null };
    }

    const fiscDiv = fiscaliteDividendes(rep.fraction_capital, rep.fraction_sociale, alloc.option_bareme_dividendes);
    res.detail.fiscalite_dividendes = fiscDiv;

    // Les plafonds assis sur N-1 doivent partir d'un revenu IMPOSABLE, jamais
    // d'un coût entreprise : la confusion surestimait les plafonds du poids des
    // cotisations. Priorité au revenu N-1 déclaré ; à défaut, reconstitution.
    const revenuProN1 = revenuProfessionnelN1(ctx, statut, imposableRemuBrut);
    const partDir = partDirigeantInteressement(ctx, imposableRemuBrut);
    const interDirigeant = alloc.interessement_enveloppe * partDir;
    const es = coutEtValeurES(ctx, alloc.abondement_pee, alloc.abondement_pereco, interDirigeant, alloc.interessement_enveloppe);
    res.detail.epargne_salariale = Object.assign({}, es, { part_dirigeant_interessement: partDir, interessement_dirigeant: interDirigeant });
    res.controles = res.controles.concat(controlesES(ctx, alloc.versement_pee, alloc.abondement_pee,
      alloc.versement_pereco, alloc.abondement_pereco, interDirigeant, alloc.interessement_enveloppe, revenuProN1));

    const chargesDeductibles = coutRemu + es.cout_entreprise;
    const resultatFiscal = e.resultat_avant_remuneration - chargesDeductibles;
    const calcIS = impotSocietes(resultatFiscal, e);
    const resultatNet = resultatFiscal - calcIS.is;
    const distribuable = Math.max(0, resultatNet) + Math.max(0, e.reserves_distribuables || 0);
    if (divBrut > distribuable + TOLERANCE) {
      res.conformite = 'impossible';
      res.controles.push({ niveau: 'erreur', code: 'DIV_SUP_DISTRIBUABLE',
        message: 'Dividendes supérieurs au bénéfice distribuable.' });
    }
    const tresorerieFlux = resultatNet - divBrut;

    const plafPer = plafondPER(ctx, statut, imposableRemuBrut, revenuProN1);
    const versementPer = Math.max(0, alloc.versement_per_individuel);
    const perDeductible = Math.min(versementPer, plafPer.disponible);
    const perNonDeductible = versementPer - perDeductible;
    if (perNonDeductible > 1e-6) {
      res.alertes.push({ niveau: 'vigilance', code: 'PER_HORS_PLAFOND',
        message: Math.round(perNonDeductible).toLocaleString('fr-FR') + ' € du versement PER excèdent le plafond de déduction disponible. Le versement reste possible mais cette fraction n\'est pas déductible ; elle ouvre en contrepartie une sortie en capital non imposée sur cette part.' });
    }

    // Art. 200 A, 2 CGI : l'option pour le barème est GLOBALE et irrévocable pour
    // l'ensemble des revenus de capitaux mobiliers et des plus-values de l'année.
    // Elle ne peut pas être retenue pour les dividendes du scénario en laissant
    // les autres revenus du capital du foyer au PFU : les deux suivent l'option.
    const capitalExterne = Math.max(0, f.revenus_capital_hors_scenario || 0);
    const psCapitalExterne = capitalExterne * get('capital.prelevements_sociaux.taux_plein_2026');
    let irCapitalExterne = 0, baseBaremeExterne = 0, csgDeductibleExterne = 0;
    if (alloc.option_bareme_dividendes) {
      // Pas d'abattement de 40 % : la nature de ces revenus n'est pas connue du
      // moteur (intérêts, plus-values, dividendes). Hypothèse prudente.
      baseBaremeExterne = capitalExterne;
      csgDeductibleExterne = capitalExterne * get('capital.pfu.option_bareme.csg_deductible');
    } else {
      irCapitalExterne = capitalExterne * get('capital.pfu.taux_ir');
    }

    const imposableRemu = Math.max(0, imposableRemuBrut - deductiblesDiv);
    const netCategorielDirigeant = imposableRemu - abattement10(imposableRemu);
    const netCategorielConjoint = f.autres_revenus_salaires - abattement10(f.autres_revenus_salaires);
    const csgDeductibleCapital = (fiscDiv.csg_deductible || 0) + csgDeductibleExterne;
    const revenuNetGlobal = Math.max(0, netCategorielDirigeant + netCategorielConjoint
      + f.autres_revenus_imposables - perDeductible - csgDeductibleCapital);

    const calcIR = impotRevenu(revenuNetGlobal, f, fiscDiv.base_imposable_bareme + baseBaremeExterne);
    const irDu = calcIR.impot;
    // La CSG déductible du capital ne doit pas minorer le RFR (art. 1417 IV CGI).
    let rfr = calcIR.revenu_imposable + fiscDiv.abattement_40 + csgDeductibleCapital;
    if (fiscDiv.mode === 'pfu') rfr += rep.fraction_capital + rep.fraction_sociale + capitalExterne;
    const cehrDu = cehr(rfr, f);
    const calcCdhr = cdhr(rfr, irDu, cehrDu, fiscDiv.ir_forfaitaire + irCapitalExterne, f);

    let droits;
    if (statut === 'TNS') {
      const at = assietteUnique(coutRemu + rep.fraction_sociale).assiette;
      const recap = cotisationsTNS(coutRemu + rep.fraction_sociale, e.activite);
      droits = droitsTNS(at, recap.cotisation_rci);
      droits.protection_sociale = { indemnites_journalieres: 'oui, plafonnées', invalidite_deces: 'oui',
        chomage: 'non', accidents_du_travail: 'non (couverture volontaire à souscrire)' };
    } else {
      droits = droitsAssimile(brutSalarial || 0);
      droits.protection_sociale = { indemnites_journalieres: 'oui, régime général', invalidite_deces: 'oui, régime général',
        chomage: 'non (mandataire social)', accidents_du_travail: 'oui' };
    }

    const divNet = divBrut - fiscDiv.prelevements_sociaux_capital - fiscDiv.ir_forfaitaire - cotDividendes;
    const versementsPerso = versementPer + alloc.versement_pee + alloc.versement_pereco;
    const impotsPersonnels = irDu + cehrDu + calcCdhr.cdhr;
    const revenusHorsScenario = (f.autres_revenus_salaires || 0) + (f.autres_revenus_imposables || 0)
      + capitalExterne - psCapitalExterne - irCapitalExterne;
    const netImmediat = netRemu + divNet + revenusHorsScenario - versementsPerso - impotsPersonnels;

    const epargnePee = es.epargne_bloquee_pee + alloc.versement_pee;
    const epargnePereco = es.epargne_bloquee_pereco + alloc.versement_pereco;
    const epargneRetraite = versementPer + epargnePereco;
    // Valorisation SYMÉTRIQUE de l'épargne : on ne peut pas débiter une fiscalité
    // de sortie calculée sur des gains projetés sans créditer ces gains. Chaque
    // poche est capitalisée, nette de sa fiscalité de sortie, puis ramenée en
    // valeur d'aujourd'hui pour être comparable au net immédiat.
    const valoPer = valorisationPER(versementPer, ctx, perDeductible);
    const valoEs = valorisationEpargneSalariale(epargnePee + epargnePereco, ctx);
    const coutIlliquidite = (epargnePee + epargnePereco + versementPer) * h.cout_illiquidite_annuel * Math.min(5, h.horizon_annees);
    const fiscaliteDifferee = valoPer.fiscalite_sortie_estimee;
    const psSortieES = valoEs.prelevements_sociaux_sortie;
    const valeurHorsDroits = netImmediat + valoEs.valeur_actuelle + valoPer.valeur_actuelle - coutIlliquidite;
    const valeurPatrimoniale = valeurHorsDroits + droits.valeur_actuelle_droits;

    // Conservation : les contrôles partent de la décomposition LIGNE À LIGNE des
    // cotisations, et non des agrégats qui ont servi à la produire — une ligne
    // oubliée ou mal attribuée les fait donc réellement échouer.
    const lignesRemuControle = baseRemu.lignes.reduce((a, l) => a + l.montant, 0);
    const totalSociete = lignesRemuControle + netRemu + es.cout_entreprise + calcIS.is + divBrut + tresorerieFlux;
    const ecartSociete = e.resultat_avant_remuneration - totalSociete;
    res.controles.push({ niveau: Math.abs(ecartSociete) > TOLERANCE ? 'erreur' : 'ok',
      code: 'CONSERVATION_SOCIETE', ecart: ecartSociete,
      message: 'Conservation société : écart de ' + ecartSociete.toFixed(2) + ' €.' });
    const netRemuReconstitue = coutRemu - lignesRemuControle;
    const entrees = netRemuReconstitue + divBrut - fiscDiv.prelevements_sociaux_capital - fiscDiv.ir_forfaitaire
      - cotDividendes + revenusHorsScenario;
    const ecartDirigeant = (entrees - versementsPerso - impotsPersonnels) - netImmediat;
    res.controles.push({ niveau: Math.abs(ecartDirigeant) > TOLERANCE ? 'erreur' : 'ok',
      code: 'CONSERVATION_DIRIGEANT', ecart: ecartDirigeant,
      message: 'Conservation dirigeant : écart de ' + ecartDirigeant.toFixed(2) + ' €.' });
    if (netImmediat < -TOLERANCE) {
      res.controles.push({ niveau: 'condition', code: 'NET_NEGATIF',
        message: 'Le net immédiat est négatif : les versements personnels et les impôts excèdent les revenus perçus. Le scénario suppose un financement sur l\'épargne existante du dirigeant.' });
    }

    const lignesRemu = baseRemu.lignes.reduce((a, l) => a + l.montant, 0);
    const ecartLignes = coutRemu - (lignesRemu + netRemu);
    res.controles.push({ niveau: Math.abs(ecartLignes) > TOLERANCE ? 'erreur' : 'ok',
      code: 'DECOMPOSITION_REMUNERATION', ecart: ecartLignes,
      message: 'Décomposition de la rémunération : coût ' + eurJS(coutRemu) + ' = cotisations ' + eurJS(lignesRemu)
        + ' + net perçu ' + eurJS(netRemu) + '.' });
    if (tresorerieFlux < -TOLERANCE) {
      const depassement = -tresorerieFlux - Math.max(0, e.reserves_distribuables || 0);
      res.controles.push({ niveau: depassement > TOLERANCE ? 'erreur' : 'condition',
        code: 'PRELEVEMENT_SUR_RESERVES', ecart: Math.min(0, tresorerieFlux),
        message: 'La distribution excède le résultat de l\'exercice de ' + eurJS(-tresorerieFlux)
          + ' : elle prélève sur les réserves. Une distribution de réserves n\'est pas reproductible d\'une année sur l\'autre.' });
    }

    // Il n'existe AUCUNE discontinuité du barème maladie à 3 PASS : le taux de
    // 6,50 % de l'art. D.621-1 CSS est marginal sur la seule fraction excédant
    // 3 PASS, et la cotisation reste continue et croissante en tout point. La
    // « falaise » signalée par les versions antérieures était un artefact du
    // référentiel, qui appliquait ce taux à la totalité de l'assiette.
    const rob = robustesse(ctx, alloc, acces, statut, rep);
    if (res.controles.some((c) => c.niveau === 'erreur')) res.conformite = 'impossible';
    else if (res.controles.some((c) => c.niveau === 'condition')) res.conformite = 'conforme_sous_conditions';
    else if (acces.conformite === 'conforme_sous_conditions' && utiliseES) res.conformite = 'conforme_sous_conditions';

    Object.assign(res, {
      cout_entreprise: chargesDeductibles,
      cout_collectif_salaries: es.cout_abondement_salaries + es.interessement_salaries,
      resultat_fiscal: resultatFiscal, impot_societes: calcIS.is, resultat_net_societe: resultatNet,
      tresorerie_residuelle: tresorerieFlux, cotisations: lignes,
      cotisations_totales: baseRemu.total + cotDividendes,
      csg_crds_activite: baseRemu.csg_crds || 0,
      remuneration_nette: netRemu, revenu_imposable_remuneration: imposableRemu,
      dividendes_nets: divNet, prelevements_sociaux_capital: fiscDiv.prelevements_sociaux_capital,
      // L'IR affiché doit couvrir tout ce que le net immédiat déduit, y compris
      // le prélèvement forfaitaire des revenus du capital hors scénario.
      impot_revenu: irDu + fiscDiv.ir_forfaitaire + irCapitalExterne, cehr: cehrDu, cdhr: calcCdhr.cdhr,
      net_immediat: netImmediat, epargne_bloquee: epargnePee, epargne_retraite: epargneRetraite,
      droits, valeur_patrimoniale: valeurPatrimoniale, valeur_patrimoniale_hors_droits: valeurHorsDroits,
      valeur_globale: valeurPatrimoniale + Math.max(0, tresorerieFlux) * h.coef_valeur_tresorerie_societe,
      efficacite_marginale: chargesDeductibles ? valeurPatrimoniale / chargesDeductibles : 0,
      robustesse: rob.note, motifs_robustesse: rob.motifs,
    });
    Object.assign(res.detail, {
      plafond_per: plafPer, per_deductible: perDeductible, per_non_deductible: perNonDeductible,
      impot_revenu_detail: calcIR, cdhr_detail: calcCdhr, rfr, is_detail: calcIS,
      valorisation_per: valoPer, valorisation_epargne_salariale: valoEs,
      cout_illiquidite: coutIlliquidite, fiscalite_differee: fiscaliteDifferee,
      ps_sortie_epargne_salariale: psSortieES,
      capital_externe: { brut: capitalExterne, prelevements_sociaux: psCapitalExterne, ir_forfaitaire: irCapitalExterne },
      taux_marginal_ir: tauxMarginalIR(revenuNetGlobal, f),
      distribuable, assiette_sociale_remuneration: assietteSocialeRemu, brut_salarial: brutSalarial,
    });
    return res;
  }

  // ===========================================================================
  // OPTIMISEUR
  // ===========================================================================
  const LEVIERS = ['remuneration', 'abondement_pee', 'abondement_pereco', 'interessement', 'dividendes', 'tresorerie'];
  const ATTR = { remuneration: 'remuneration', abondement_pee: 'abondement_pee',
    abondement_pereco: 'abondement_pereco', interessement: 'interessement',
    dividendes: 'e_dividendes', tresorerie: 'e_tresorerie' };

  function scoreMulticritere(r, ctx) {
    const o = ctx.objectifs, h = ctx.hypotheses;
    const poids = { liquidite: o.liquidite, retraite: o.retraite, protection: o.protection,
      fiscalite: o.fiscalite, capitalisation: o.capitalisation, simplicite: o.simplicite, robustesse: o.robustesse };
    const somme = Object.values(poids).reduce((a, b) => a + b, 0) || 1;
    const treso = Math.max(0, r.tresorerie_residuelle) * h.coef_valeur_tresorerie_societe;
    const vg = r.valeur_globale || (r.valeur_patrimoniale + treso);
    const pen = { A: 0, B: 0.02, C: 0.06, D: 0.15, E: 1.0 }[r.robustesse];
    let complexite = 0;
    if (r.allocation) {
      complexite += r.allocation.interessement_enveloppe > 0 ? 0.02 : 0;
      complexite += (r.allocation.abondement_pee + r.allocation.abondement_pereco) > 0 ? 0.01 : 0;
    }
    const c = {
      liquidite: r.net_immediat,   // la trésorerie de la société n'est pas de la liquidité personnelle
      retraite: r.epargne_retraite + r.droits.valeur_actuelle_droits,
      protection: r.droits.valeur_actuelle_droits,
      fiscalite: vg,
      capitalisation: r.epargne_bloquee + r.epargne_retraite + treso,
      simplicite: vg * (1 - complexite),
      robustesse: vg * (1 - pen),
    };
    return Object.keys(poids).reduce((s, k) => s + poids[k] * c[k], 0) / somme;
  }

  function fonctionObjectif(nom) {
    const t = {
      net_immediat: (r) => r.net_immediat,
      patrimoine_net: (r) => r.valeur_globale,
      patrimoine_personnel: (r) => r.valeur_patrimoniale,
      patrimoine_hors_droits: (r) => r.valeur_patrimoniale_hors_droits,
      cout_entreprise: (r) => -r.cout_entreprise,
      retraite: (r) => r.epargne_retraite + r.droits.valeur_actuelle_droits,
      impot_immediat: (r) => -(r.impot_revenu + r.cehr + r.cdhr + r.impot_societes),
      liquidite: (r) => r.net_immediat + r.tresorerie_residuelle,
      compromis: scoreMulticritere,
    };
    return t[nom] || scoreMulticritere;
  }

  function etatVide() {
    return { remuneration: 0, abondement_pee: 0, abondement_pereco: 0, interessement: 0,
             e_dividendes: 0, e_tresorerie: 0 };
  }

  function allocationDepuisEtat(etat, ctx, versementPer, optionBareme) {
    const p = plafondsES(ctx, 0);
    const mp = Math.max(p.multiple_versement_pee, 1e-9), mr = Math.max(p.multiple_versement_pereco, 1e-9);
    return {
      cout_remuneration: etat.remuneration,
      abondement_pee: etat.abondement_pee,
      versement_pee: etat.abondement_pee ? etat.abondement_pee / mp : 0,
      abondement_pereco: etat.abondement_pereco,
      versement_pereco: etat.abondement_pereco ? etat.abondement_pereco / mr : 0,
      interessement_enveloppe: etat.interessement,
      interessement_affecte_plan: true,
      versement_per_individuel: versementPer || 0,
      dividendes_bruts: 0,
      option_bareme_dividendes: !!optionBareme,
    };
  }

  function evaluerEtat(etat, ctx, versementPer, optionBareme, dividendesForces) {
    const alloc = allocationDepuisEtat(etat, ctx, versementPer, optionBareme);
    const partDir = partDirigeantInteressement(ctx, etat.remuneration);
    const es = coutEtValeurES(ctx, alloc.abondement_pee, alloc.abondement_pereco,
      etat.interessement * partDir, etat.interessement);
    const charges = etat.remuneration + es.cout_entreprise;
    const rf = ctx.entreprise.resultat_avant_remuneration - charges;
    const netSociete = rf - impotSocietes(rf, ctx.entreprise).is;
    const totalApresIS = etat.e_dividendes + etat.e_tresorerie;
    const ratio = totalApresIS > 0 ? etat.e_dividendes / totalApresIS : 0;
    if (dividendesForces !== undefined && dividendesForces !== null) {
      alloc.dividendes_bruts = dividendesForces;
    } else {
      const baseDistribuable = Math.max(0, netSociete) + Math.max(0, ctx.entreprise.reserves_distribuables || 0);
      alloc.dividendes_bruts = baseDistribuable * ratio;
    }
    return evaluer(ctx, alloc);
  }

  // `versementPer` et `optionBareme` permettent de greffer sur la situation
  // actuelle les deux leviers qui ne consomment pas l'enveloppe de l'entreprise,
  // lorsque le garde-fou a écarté toute réorganisation.
  function scenarioActuel(ctx, versementPer, optionBareme) {
    const etat = etatVide();
    etat.remuneration = ctx.dirigeant.remuneration_actuelle;
    const reste = Math.max(0, ctx.entreprise.resultat_avant_remuneration - ctx.dirigeant.remuneration_actuelle);
    etat.e_dividendes = reste; etat.e_tresorerie = 0;
    const prov = evaluerEtat(etat, ctx, 0, false, 0);
    const distribuable = Math.max(0, prov.resultat_net_societe) + Math.max(0, ctx.entreprise.reserves_distribuables || 0);
    const dividendes = Math.min(Math.max(0, ctx.dirigeant.dividendes_actuels), distribuable);
    const r = evaluerEtat(etat, ctx, versementPer || 0, !!optionBareme, dividendes);
    r.libelle = 'Situation actuelle';
    return r;
  }

  function optimiser(ctx, objectifNom, pas) {
    const objNom = objectifNom || ctx.objectifs.objectif_principal;
    const fobj = fonctionObjectif(objNom);
    pas = pas || ctx.hypotheses.pas_optimisation;
    const enveloppe = ctx.entreprise.resultat_avant_remuneration;
    const acces = accesEpargneSalariale(ctx);
    const q = qualifier(ctx);
    const p = plafondsES(ctx, 0);
    const plafPee = acces.eligible ? p.abondement_pee_max : 0;
    const plafPereco = acces.eligible ? p.abondement_pereco_max : 0;

    let etat = etatVide();
    etat.e_tresorerie = enveloppe;
    let courant = evaluerEtat(etat, ctx);
    const trace = [], exclus = [];
    if (!acces.eligible) exclus.push({ levier: 'epargne_salariale', motif: acces.motif,
      fondement: acces.fondement, classement: 'impossible' });

    const nBlocs = Math.floor(enveloppe / pas);
    let restant = enveloppe;
    for (let i = 0; i < nBlocs; i++) {
      if (restant < pas) break;
      let meilleur = null, meilleurScore = fobj(courant, ctx), meilleurNom = null;
      for (const levier of LEVIERS) {
        const c = Object.assign({}, etat);
        if (levier === 'remuneration') c.remuneration += pas;
        else if (levier === 'abondement_pee') { if (c.abondement_pee + pas > plafPee) continue; c.abondement_pee += pas; }
        else if (levier === 'abondement_pereco') { if (c.abondement_pereco + pas > plafPereco) continue; c.abondement_pereco += pas; }
        else if (levier === 'interessement') {
          if (!acces.eligible) continue;
          if (c.interessement + pas > enveloppeInteressementMax(ctx, c.remuneration)) continue;
          c.interessement += pas;
        } else if (levier === 'dividendes') c.e_dividendes += pas;
        else c.e_tresorerie += pas;
        c.e_tresorerie -= pas;
        if (c.e_tresorerie < -1e-9) continue;
        const r = evaluerEtat(c, ctx);
        if (r.conformite === 'impossible') continue;
        // versements personnels finançables : cf. commentaire du moteur Python
        if (r.net_immediat < -1e-6 && r.net_immediat < courant.net_immediat - 1e-6) continue;
        const s = fobj(r, ctx);
        if (meilleur === null || s > meilleurScore + 1e-9) { meilleur = c; meilleurScore = s; meilleurNom = levier; }
      }
      if (meilleur === null) break;
      etat = meilleur;
      courant = evaluerEtat(etat, ctx);
      restant -= pas;
      trace.push({ bloc: i + 1, de: Math.round(i * pas), a: Math.round((i + 1) * pas), levier: meilleurNom,
        score: Math.round(meilleurScore * 100) / 100, net_immediat: Math.round(courant.net_immediat * 100) / 100,
        valeur_patrimoniale: Math.round(courant.valeur_patrimoniale * 100) / 100 });
    }

    // raffinement local
    let ameliore = true, tours = 0;
    while (ameliore && tours < 40) {
      ameliore = false; tours += 1;
      let baseScore = fobj(courant, ctx);
      for (const source of LEVIERS) {
        if (etat[ATTR[source]] < pas - 1e-9) continue;
        for (const cible of LEVIERS) {
          if (cible === source) continue;
          const c = Object.assign({}, etat);
          c[ATTR[source]] -= pas;
          const nouvelle = c[ATTR[cible]] + pas;
          if (cible === 'abondement_pee' && nouvelle > plafPee) continue;
          if (cible === 'abondement_pereco' && nouvelle > plafPereco) continue;
          if (cible === 'interessement' && (!acces.eligible || nouvelle > enveloppeInteressementMax(ctx, c.remuneration))) continue;
          c[ATTR[cible]] = nouvelle;
          const r = evaluerEtat(c, ctx);
          if (r.conformite === 'impossible') continue;
          if (r.net_immediat < -1e-6 && r.net_immediat < courant.net_immediat - 1e-6) continue;
          const s = fobj(r, ctx);
          if (s > baseScore + 1e-6) { etat = c; courant = r; baseScore = s; ameliore = true; }
        }
      }
    }

    // Lorsque le garde-fou se déclenche, l'allocation optimisée est ÉCARTÉE. Les
    // affinages suivants doivent donc repartir de la situation actuelle : les
    // greffer sur l'état rejeté réintroduisait par la bande l'allocation que ce
    // garde-fou venait d'écarter, et comparait un plafond PER calculé sur une
    // rémunération à un scénario qui en retenait une autre.
    const actuelRef = scenarioActuel(ctx);
    const gardeFouActif = fobj(actuelRef, ctx) > fobj(courant, ctx) + 1e-6;
    if (gardeFouActif) {
      courant = actuelRef;
      trace.push({ bloc: 'GARDE-FOU', levier: 'situation_actuelle',
        commentaire: 'Aucune réorganisation testée ne fait mieux que l\'organisation existante.' });
    }
    const base = (vPer, optBar) => (gardeFouActif
      ? scenarioActuel(ctx, vPer || 0, !!optBar)
      : evaluerEtat(etat, ctx, vPer || 0, !!optBar));

    let meilleurPer = 0, meilleurScore = fobj(courant, ctx);
    const borne = Math.min(courant.detail.plafond_per.disponible, Math.max(0, courant.net_immediat));
    for (let v = pas; v <= borne + 1e-9; v += pas) {
      const r = base(v, false);
      if (r.net_immediat < -1e-6) break;
      const s = fobj(r, ctx);
      if (s > meilleurScore + 1e-9) { meilleurScore = s; meilleurPer = v; }
    }
    if (meilleurPer > 0) {
      courant = base(meilleurPer, false);
      trace.push({ bloc: 'PER', levier: 'per_individuel', montant: meilleurPer, score: Math.round(meilleurScore * 100) / 100 });
    }

    // L'option est globale (art. 200 A) : elle emporte aussi les revenus du
    // capital du foyer extérieurs au scénario, ce que l'évaluation intègre.
    if (courant.allocation && courant.allocation.dividendes_bruts > 0) {
      const alt = base(meilleurPer, true);
      if (fobj(alt, ctx) > fobj(courant, ctx) + 1e-9) {
        courant = alt;
        trace.push({ bloc: 'OPTION', levier: 'bareme_dividendes', score: Math.round(fobj(alt, ctx) * 100) / 100 });
      }
    }

    courant.libelle = 'Optimisé — ' + objNom;
    return { resultat: courant, objectif: objNom, qualification: q, pas, trace,
             scenarios_exclus: exclus, etat };
  }

  // ===========================================================================
  // JOURNAL / RÈGLES UTILISÉES
  // ===========================================================================
  function reglesUtilisees() {
    const vus = new Set(), sortie = [];
    for (const chemin of ACCES) {
      const m = chemin.split('.');
      for (let prof = m.length; prof > 0; prof--) {
        let n = P, ok = true;
        for (const cle of m.slice(0, prof)) {
          if (n === null || typeof n !== 'object' || !(cle in n)) { ok = false; break; }
          n = n[cle];
        }
        if (ok && n && typeof n === 'object' && 'rule_id' in n) {
          if (!vus.has(n.rule_id)) {
            vus.add(n.rule_id);
            sortie.push({ rule_id: n.rule_id, title: n.title || '', confidence: n.confidence || 'n/a',
              source: n.source_reference || '', last_verified: n.last_verified || '', note: n.note || '' });
          }
          break;
        }
      }
    }
    return sortie.sort((a, b) => a.rule_id.localeCompare(b.rule_id));
  }

  // ===========================================================================
  // DÉTECTION PROACTIVE DES OPTIMISATIONS
  // ===========================================================================
  const eur = eurJS;

  function detecterAlertes(ctx, actuel, optimise) {
    optimise = optimise || actuel;
    const e = ctx.entreprise, d = ctx.dirigeant;
    const q = qualifier(ctx), acces = accesEpargneSalariale(ctx), pass_ = PASS();
    const out = [];

    const plaf = actuel.detail.plafond_per;
    if (plaf.disponible > get('politique_cabinet.materialite.plafond_per_inutilise_signalable_eur')) out.push({ code: 'PER_PLAFOND_INUTILISE', niveau: 'opportunite',
      titre: 'Plafond de déduction PER non utilisé',
      message: eur(plaf.disponible) + ' de plafond de déduction restent disponibles (plafond de l\'année '
        + eur(plaf.plafond_retenu) + ' + report ' + eur(plaf.report_anterieur) + ').',
      justification: 'Art. 163 quatervicies CGI et, pour le TNS, art. 154 bis CGI.',
      reserve: 'Un versement PER produit un report d\'imposition, pas un gain sec : la fiscalité de sortie doit être comparée au taux marginal du moment.' });

    if (acces.eligible && !(e.pee_existant || e.pereco_existant)) {
      const p = plafondsES(ctx, actuel.revenu_imposable_remuneration);
      out.push({ code: 'ES_ABSENTE', niveau: 'opportunite', titre: 'Aucun plan d\'épargne salariale en place',
        message: 'L\'effectif de ' + e.nb_salaries + ' salarié(s) ouvre l\'accès du dirigeant aux dispositifs. Capacité d\'abondement théorique : '
          + eur(p.abondement_pee_max) + ' sur le PEE et ' + eur(p.abondement_pereco_max) + ' sur le PERECO, soit '
          + eur(p.abondement_total_max) + ' par an et par bénéficiaire.',
        justification: 'Art. L.3332-2 et L.3334-6 du code du travail.',
        reserve: 'Coût collectif à chiffrer : le règlement s\'applique à tous les bénéficiaires.' });
    } else if (!acces.eligible) {
      out.push({ code: 'ES_INACCESSIBLE', niveau: 'information', titre: 'Épargne salariale inaccessible en l\'état',
        message: acces.motif, justification: acces.fondement,
        reserve: 'L\'embauche d\'un salarié pour ouvrir un dispositif ne doit jamais être motivée par le seul avantage social : le caractère artificiel de l\'emploi est un motif de requalification.' });
    }

    if ((e.pee_existant || e.pereco_existant) && acces.eligible) {
      const p = plafondsES(ctx, actuel.revenu_imposable_remuneration);
      const utilise = actuel.allocation ? actuel.allocation.abondement_pee + actuel.allocation.abondement_pereco : 0;
      if (utilise < p.abondement_total_max - 100) out.push({ code: 'ES_ABONDEMENT_NON_MAXIMISE',
        niveau: 'opportunite', titre: 'Abondement non maximisé',
        message: eur(p.abondement_total_max - utilise) + ' d\'abondement restent mobilisables.',
        justification: 'Plafonds de 8 % et 16 % du PASS, dans la limite du triple des versements.' });
    }

    if (q.statut_social === 'TNS') {
      const assiette = Math.max(actuel.detail.assiette_sociale_remuneration || 0,
                                optimise.detail.assiette_sociale_remuneration || 0);
      if (assiette > 3 * pass_) out.push({ code: 'TNS_TAUX_MARGINAL_MALADIE', niveau: 'information',
        titre: 'Taux marginal maladie réduit au-delà de 3 PASS',
        message: 'L\'assiette sociale (' + eur(assiette) + ') dépasse 3 PASS (' + eur(3 * pass_) + ') : la fraction excédentaire est cotisée à 6,50 % au lieu de 8,50 %. Le coût marginal d\'un euro de rémunération supplémentaire est donc légèrement plus faible au-delà de ce seuil.',
        justification: 'Art. D.621-1 CSS : 8,50 % sur la fraction jusqu\'à 3 PASS, 6,50 % au-delà.',
        reserve: 'Il s\'agit d\'un taux marginal sur la seule fraction excédentaire : la cotisation totale reste continue et croissante. Franchir 3 PASS ne procure aucun gain de seuil.' });
      if (assiette > 4 * pass_) out.push({ code: 'TNS_AU_DELA_RCI', niveau: 'information',
        titre: 'Rémunération au-delà du plafond de la retraite complémentaire',
        message: 'Au-delà de 4 PASS (' + eur(4 * pass_) + '), la cotisation RCI cesse et la rémunération supplémentaire ne génère plus de points de retraite complémentaire.',
        justification: 'Barème RCI : tranche 2 limitée à 4 PASS.' });

      // Le taux vient du référentiel, comme dans le calcul principal : le
      // dupliquer en dur ferait diverger l'alerte du montant réellement cotisé.
      const mr = montantReferenceDividendes(e, d.detention);
      const seuil = get('social_tns.dividendes_seuil_10.taux_seuil') * mr;
      if (d.dividendes_actuels > seuil && seuil > 0) out.push({ code: 'DIV_AU_DESSUS_SEUIL', niveau: 'vigilance',
        titre: 'Dividendes au-dessus du seuil social',
        message: eur(d.dividendes_actuels - seuil) + ' de dividendes dépassent le seuil de 10 % du montant de référence (' + eur(seuil) + ') et supportent les cotisations TNS.',
        justification: 'Art. L.136-3 II 2° CSS.',
        reserve: 'Le compte courant est retenu pour son solde MOYEN annuel, apprécié au dernier jour de l\'exercice précédent.' });
      else if (mr > 0 && d.dividendes_actuels < seuil * 0.8) out.push({ code: 'DIV_MARGE_SOUS_SEUIL',
        niveau: 'opportunite', titre: 'Marge de distribution sous le seuil social',
        message: eur(seuil - d.dividendes_actuels) + ' peuvent encore être distribués sous le seuil de 10 %, sans cotisations TNS.',
        justification: 'Art. L.136-3 II 2° CSS.' });
    }

    if (e.tresorerie > 0 && (e.masse_salariale + actuel.cout_entreprise) > 0) {
      const mois = e.tresorerie / Math.max(1, (e.masse_salariale + actuel.cout_entreprise) / 12);
      if (mois > 18) out.push({ code: 'TRESORERIE_EXCEDENTAIRE', niveau: 'opportunite',
        titre: 'Trésorerie excédentaire',
        message: 'La trésorerie représente environ ' + Math.round(mois) + ' mois de charges de personnel.',
        justification: 'Indicateur de gestion, non réglementaire.',
        reserve: 'Une trésorerie durablement excédentaire peut affecter la qualification de biens professionnels pour l\'IFI et le régime Dutreil.' });
    }

    if (actuel.droits.trimestres < 4) out.push({ code: 'TRIMESTRES_INCOMPLETS', niveau: 'alerte',
      titre: 'Année incomplète pour la retraite',
      message: 'La rémunération actuelle ne valide que ' + actuel.droits.trimestres + ' trimestre(s). Il faut '
        + eur(get('references.trimestre_retraite.valeur_2026')) + ' d\'assiette pour un trimestre.',
      justification: '150 SMIC horaires par trimestre (art. R.351-9 CSS).' });

    if (actuel.cehr > 0 || actuel.cdhr > 0) out.push({ code: 'HAUTS_REVENUS', niveau: 'vigilance',
      titre: 'Foyer soumis aux contributions sur les hauts revenus',
      message: 'CEHR : ' + eur(actuel.cehr) + ' — CDHR : ' + eur(actuel.cdhr) + '. Le lissage pluriannuel des revenus exceptionnels et le calendrier des distributions deviennent des leviers à part entière.',
      justification: 'Art. 223 sexies et 224 CGI.' });

    if (e.conjoint_salarie) out.push({ code: 'CONJOINT_SALARIE', niveau: 'vigilance',
      titre: 'Conjoint salarié : robustesse à documenter',
      message: 'La présence d\'un conjoint salarié ouvre les dispositifs collectifs mais impose de documenter la réalité de l\'emploi : fonctions effectives, rémunération cohérente avec le poste, temps de travail, déclarations sociales.',
      justification: 'Conditions de fond du contrat de travail ; art. L.3312-3 et L.3332-2 du code du travail.',
      reserve: 'Attendre un an avant de faire bénéficier le dirigeant du plan ne sécurise rien à soi seul.' });

    if (['SARL', 'EURL'].includes(e.forme.toUpperCase()) && (actuel.detail.assiette_sociale_remuneration || 0) > 1.5 * pass_)
      out.push({ code: 'COMPARER_STRUCTURE', niveau: 'opportunite', titre: 'Comparaison SARL / SAS à simuler',
        message: 'Le niveau de rémunération justifie de comparer le régime TNS au régime assimilé salarié, en intégrant les coûts de transformation et un horizon pluriannuel.',
        justification: '§ 27 du cahier des charges.' });

    return out;
  }

  function chronologie(optimise) {
    const a = optimise.allocation, etapes = [];
    const push = (action, responsable, doc, preuve) =>
      etapes.push({ ordre: String(etapes.length + 1), action, responsable, document: doc, preuve });
    if (a && a.interessement_enveloppe > 0) {
      push('Vérifier l\'éligibilité : au moins un salarié, moins de 250, et un salarié distinct du dirigeant.', 'Conseiller', 'Registre du personnel, DSN', 'Copie du registre');
      push('Rédiger l\'accord d\'intéressement : formule aléatoire, période de calcul, règle de répartition, durée de 1 à 5 ans.', 'Conseil / expert-comptable', 'Projet d\'accord', 'Accord signé');
      push('Déposer l\'accord sur TéléAccords dans le délai légal — l\'exonération sociale est conditionnée au dépôt.', 'Entreprise', 'Récépissé de dépôt', 'Récépissé');
    }
    if (a && (a.abondement_pee > 0 || a.abondement_pereco > 0)) {
      push('Mettre en place le règlement de plan (PEE et/ou PERECO) et choisir le teneur de compte.', 'Entreprise', 'Règlement de plan', 'Règlement daté et déposé');
      push('Informer l\'ensemble des bénéficiaires — le caractère collectif est une condition de fond.', 'Entreprise', 'Note d\'information', 'Accusé de réception');
      push('Effectuer les versements volontaires (' + eur(a.versement_pee + a.versement_pereco) + ') puis déclencher l\'abondement.', 'Dirigeant', 'Bulletins de versement', 'Relevés du teneur de compte');
    }
    if (a && a.versement_per_individuel > 0)
      push('Verser ' + eur(a.versement_per_individuel) + ' sur le PER individuel avant le 31 décembre.', 'Dirigeant', 'Bulletin de versement', 'Attestation fiscale de l\'assureur');
    if (a && a.dividendes_bruts > 0)
      push('Faire approuver la distribution de ' + eur(a.dividendes_bruts) + ' en assemblée, après approbation des comptes.', 'Associés', 'PV d\'assemblée générale', 'PV enregistré');
    push('Archiver l\'ensemble des justificatifs et la présente simulation dans le dossier client.', 'Conseiller', 'Journal de décision', 'Export horodaté');
    return etapes;
  }

  function niveauClient(actuel, optimise, objectifNom) {
    const libelles = { net_immediat: 'maximiser le revenu disponible immédiat',
      patrimoine_net: 'maximiser le patrimoine à horizon',
      retraite: 'maximiser les droits et l\'épargne retraite',
      compromis: 'obtenir le meilleur compromis entre revenu, retraite, fiscalité et robustesse',
      impot_immediat: 'limiter l\'impôt immédiat', liquidite: 'conserver de la liquidité' };
    const a = optimise.allocation, actions = [];
    if (a) {
      const remuActuelle = actuel.allocation ? actuel.allocation.cout_remuneration : 0;
      if (Math.abs(a.cout_remuneration - remuActuelle) > 500)
        actions.push('Porter le coût de la rémunération à ' + eur(a.cout_remuneration) + ' par an.');
      if (a.abondement_pee > 0) actions.push('Verser ' + eur(a.versement_pee) + ' sur le PEE pour déclencher ' + eur(a.abondement_pee) + ' d\'abondement.');
      if (a.abondement_pereco > 0) actions.push('Verser ' + eur(a.versement_pereco) + ' sur le PERECO pour déclencher ' + eur(a.abondement_pereco) + ' d\'abondement.');
      if (a.interessement_enveloppe > 0) actions.push('Mettre en place un intéressement, enveloppe de ' + eur(a.interessement_enveloppe) + '.');
      if (a.versement_per_individuel > 0) actions.push('Verser ' + eur(a.versement_per_individuel) + ' sur le PER individuel.');
      if (a.dividendes_bruts > 0) actions.push('Distribuer ' + eur(a.dividendes_bruts) + ' de dividendes.');
      if (optimise.tresorerie_residuelle > 0) actions.push('Conserver ' + eur(optimise.tresorerie_residuelle) + ' de trésorerie dans la société.');
    }
    return {
      recommandation: optimise.libelle,
      objectif: 'Stratégie optimale pour ' + (libelles[objectifNom] || objectifNom) + '.',
      gain_net_immediat: optimise.net_immediat - actuel.net_immediat,
      gain_valeur_patrimoniale: optimise.valeur_globale - actuel.valeur_globale,
      phrase: (optimise.valeur_globale - actuel.valeur_globale) >= 0
        ? ('À enveloppe économique identique, cette organisation crée ' + eur(optimise.valeur_globale - actuel.valeur_globale)
           + ' de valeur globale supplémentaire par an. Le revenu immédiatement disponible passe de '
           + eur(actuel.net_immediat) + ' à ' + eur(optimise.net_immediat) + '.')
        : ('Cette organisation ne crée pas de valeur globale supplémentaire par rapport à l\'organisation actuelle (écart de '
           + eur(optimise.valeur_globale - actuel.valeur_globale) + '). Elle réoriente la répartition entre revenu immédiat, épargne et trésorerie conformément à l\'objectif retenu : le revenu immédiatement disponible passe de '
           + eur(actuel.net_immediat) + ' à ' + eur(optimise.net_immediat) + '.'),
      robustesse: optimise.robustesse, actions,
    };
  }

  function moteurIncertitude(r) {
    const limites = reglesUtilisees().filter((x) => x.confidence !== 'high' && x.confidence !== 'n/a');
    const bloquants = limites.filter((x) => x.confidence === 'low');
    // Seuils de matérialité : convention de cabinet, pas règle de droit. Ils
    // vivent au référentiel (section politique_cabinet) pour rester auditables.
    const materiel = r.cout_entreprise > get('politique_cabinet.materialite.ecart_valeur_significatif_eur')
      || Math.abs(r.valeur_patrimoniale) > get('politique_cabinet.materialite.ecart_valeur_majeur_eur');
    const doitBloquer = bloquants.length > 0 && materiel;
    const motifs = [];
    if (materiel) bloquants.forEach((b) => motifs.push('Règle ' + b.rule_id + ' de confiance faible mobilisée sur un montant matériellement important.'));
    if (r.conformite === 'impossible') motifs.push('Scénario juridiquement impossible en l\'état.');
    if (['D', 'E'].includes(r.robustesse)) motifs.push('Score de robustesse D ou E : ne pas automatiser, validation humaine requise.');
    return {
      conclusion_automatique_possible: !doitBloquer && r.conformite !== 'impossible' && ['A', 'B', 'C'].includes(r.robustesse),
      regles_a_confirmer: limites, motifs,
      message: doitBloquer ? 'Le moteur ne peut pas conclure automatiquement : validation humaine requise.'
                           : 'Le moteur peut conclure sous réserve des points de vigilance listés.',
    };
  }

  const API = {
    setReferentiel, get, PASS, evaluer, optimiser, scenarioActuel, qualifier,
    detecterAlertes, chronologie, niveauClient, moteurIncertitude, montantReferenceDividendes,
    accesEpargneSalariale, plafondsES, plafondPER, cotisationsTNS, cotisationsASdepuisBrut,
    netEtImposableAS, impotRevenu, impotSocietes, cehr, cdhr, abattement10, baremeIR,
    assietteUnique, repartitionSeuil10, fiscaliteDividendes, droitsTNS, droitsAssimile,
    fonctionObjectif, reglesUtilisees, nbParts, enveloppeInteressementMax, tauxMarginalIR,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  global.MoteurDirigeant = API;
})(typeof globalThis !== 'undefined' ? globalThis : this);
