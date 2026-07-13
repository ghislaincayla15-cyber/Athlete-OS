(function () {
  const APP_VERSION = "4.1.0";
  const STORAGE_KEY = "athlete-os-v3";
  const LEGACY_KEY = "athlete-os-v2";

  const tabs = [
    { id: "today", label: "Aujourd’hui", icon: "activity" },
    { id: "program", label: "Programme", icon: "calendar" },
    { id: "performance", label: "Performances", icon: "chart" },
    { id: "health", label: "Santé", icon: "heart" },
    { id: "coach", label: "Coach", icon: "message" },
  ];

  const pageCopy = {
    today: {
      title: "Aujourd’hui",
      subtitle: "La décision du jour, la récupération, la séance prévue et les check-ins rapides.",
    },
    program: {
      title: "Bloc d’entraînement",
      subtitle: "Un bloc fixe de 10 semaines avec calendrier, deload, adhérence et historique des adaptations.",
    },
    performance: {
      title: "Performances",
      subtitle: "Progression musculation, running, stagnations et score de performance du bloc.",
    },
    health: {
      title: "Santé & forme",
      subtitle: "Tendances de moyen terme, Health & Athletic Index et estimations secondaires isolées.",
    },
    coach: {
      title: "Coach IA",
      subtitle: "Actions rapides, historique des décisions et discussion intégrée au suivi.",
    },
  };

  const readinessWeights = [
    { key: "hrv", label: "HRV relative", weight: 30 },
    { key: "sleep", label: "Sommeil", weight: 25 },
    { key: "rhr", label: "FC repos", weight: 15 },
    { key: "load", label: "Charge récente", weight: 15 },
    { key: "subjective", label: "Ressenti", weight: 15 },
  ];

  const todayViews = [
    { id: "summary", label: "Synthèse" },
    { id: "checkin", label: "Check-in" },
    { id: "workout", label: "Séance" },
    { id: "evening", label: "Bilan" },
    { id: "history", label: "Historique" },
    { id: "data", label: "Données" },
  ];

  const demo = {
    athlete: {
      height: "1,71 m",
      startWeight: 82,
      level: "Intermédiaire",
      priority: "Maintenir la masse musculaire et réduire progressivement la masse grasse",
    },
    recovery: {
      sleepMinutes: 454,
      sleepTrend: "+18 min vs moyenne 7 jours",
      sleepScore: 82,
      hrvLabel: "Stable",
      hrvDelta: "+2 %",
      hrvScore: 82,
      rhr: 55,
      rhrTrend: "-1 bpm vs habituel",
      rhrScore: 84,
      loadLabel: "Maîtrisée",
      loadTrend: "Charge 7 jours coherente",
      loadScore: 78,
    },
    workout: {
      type: "Haut du corps force & hypertrophie",
      objective: "Conserver l’intensité, progresser sans forcer l’échec",
      duration: 70,
      athleticQuality: "Force relative, gainage scapulaire, volume contrôlé",
      rpe: 7.5,
      volume: "18 series utiles",
      intensity: "Moderee a elevee",
      muscles: ["Pectoraux", "Dos", "Epaules", "Triceps"],
      exercises: [
        { name: "Développé couché", detail: "4 x 5 à 7 reps, RPE 7-8" },
        { name: "Tractions pronation", detail: "4 x 6 a 8 reps" },
        { name: "Rowing barre", detail: "3 x 8 a 10 reps" },
        { name: "Développé militaire", detail: "3 x 6 à 8 reps" },
        { name: "Face pull + gainage", detail: "3 blocs techniques" },
      ],
    },
    block: {
      goal: "Hypertrophie maîtrisée, maintien force, base cardio zone 2",
      week: 4,
      totalWeeks: 10,
      completion: 38,
      done: 17,
      remaining: 28,
      deloadWeek: 7,
      weeklyGoal: "Stabiliser le RPE et ajouter une répétition sur les mouvements principaux",
      adherenceWeek: 88,
      adherenceBlock: 84,
    },
    performanceScore: 79,
    healthIndex: 83,
    body: {
      weight: 82,
      weightTrend: "Moyenne 7 jours stable",
      waist: "Légère baisse",
      vo2: 48,
      sleepRegularity: 82,
      activityRegularity: 87,
      relativeStrength: "1,12 x poids de corps au developpe couche estime",
    },
  };

  const dayDefaults = {
    weight: null,
    workouts: [],
    readinessScore: null,
    readinessConfidence: "",
    decisionLabel: "",
    decisionTone: "",
    workoutStarted: false,
    adaptationPending: false,
    adaptationConfirmed: false,
    morning: {
      completed: false,
      fatigue: 3,
      motivation: 3,
      energy: "moyen",
      pain: "aucune",
      muscleQuality: "normale",
      sleepQuality: "moyenne",
    },
    evening: {
      touched: false,
      completion: "none",
      duration: "",
      rpe: 5,
      pain: "aucune",
      satisfaction: 3,
      reason: "",
      comment: "",
    },
    nutrition: {
      touched: false,
      meals: "",
      proteinMeals: "",
      plants: "aucun",
      diet: "correcte",
      hunger: "normal",
      dayEnergy: "moyen",
      digestion: "moyenne",
      alcohol: "aucun",
      foods: "",
    },
  };

  const defaultState = {
    dataMode: "blank",
    activeTab: "today",
    activeTodayView: "summary",
    theme: "dark",
    uiVersion: 2,
    settingsOpen: false,
    journal: {},
    program: {
      blockId: "bloc-1",
      startDate: "2026-07-20",
    },
    workoutDraft: {
      mode: "muscu",
      exercises: [{ name: "", weight: "", reps: "", sets: "", rpe: "" }],
      course: { km: "", duration: "", hr: "", kind: "zone2" },
    },
    decisions: [],
    deload: {
      activeUntil: null,
      startedAt: null,
      declinedAt: null,
    },
    chat: [
      {
        role: "coach",
        text:
          "Bienvenue. L’app est vide : complète ton check-in, puis importe Apple Santé ou ajoute ton programme pour obtenir des recommandations personnelles.",
      },
    ],
    sources: {
      garmin: "none",
      hevy: "none",
      apple: "none",
      nutrition: "manual",
      photos: "none",
      garminSync: "none",
      lab: "disconnected",
      import: "none",
    },
    imports: {
      health: null,
      error: "",
    },
  };

  // ---- Journal : une entrée par date locale (YYYY-MM-DD) ----

  function dateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function keyOffset(daysAgo) {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    return dateKey(d);
  }

  function blankDay() {
    return structuredClone(dayDefaults);
  }

  function normalizeDay(entry) {
    const base = blankDay();
    if (!entry || typeof entry !== "object") return base;
    return {
      ...base,
      ...entry,
      workouts: Array.isArray(entry.workouts) ? entry.workouts : [],
      morning: { ...base.morning, ...(entry.morning || {}) },
      evening: { ...base.evening, ...(entry.evening || {}) },
      nutrition: { ...base.nutrition, ...(entry.nutrition || {}) },
    };
  }

  function day(key = dateKey()) {
    if (!state.journal[key]) state.journal[key] = blankDay();
    return state.journal[key];
  }

  function journalEntry(key) {
    return state.journal[key] || null;
  }

  function morning() {
    return day().morning;
  }

  function evening() {
    return day().evening;
  }

  function nutrition() {
    return day().nutrition;
  }

  function scopeTarget(scope) {
    if (scope === "morning") return morning();
    if (scope === "evening") return evening();
    if (scope === "nutrition") return nutrition();
    if (scope === "day") return day();
    return state[scope];
  }

  function journalKeysDesc(limit = 30) {
    return Object.keys(state.journal)
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .sort()
      .reverse()
      .slice(0, limit);
  }

  // ---- Données de démonstration : ~3 semaines d'historique fictif ----

  function seedDemoJournal() {
    const journal = {};
    const completions = ["complete", "complete", "adaptee", "rest", "complete", "partial", "complete"];
    for (let i = 21; i >= 1; i--) {
      const wave = Math.sin(i * 1.7);
      const dip = i % 6 === 0 ? -9 : 0;
      const score = clamp(Math.round(79 + wave * 6 + dip), 55, 92);
      const completion = completions[i % completions.length];
      const entry = blankDay();
      entry.weight = Math.round((82.7 - (21 - i) * 0.035 + wave * 0.18) * 10) / 10;
      entry.readinessScore = score;
      entry.readinessConfidence = "Eleve";
      entry.decisionLabel = score >= 75 ? "Séance maintenue" : score >= 62 ? "Séance adaptée" : "Récupération active";
      entry.decisionTone = score >= 75 ? "good" : "watch";
      entry.morning = {
        ...entry.morning,
        completed: true,
        fatigue: score >= 78 ? 2 : 3,
        motivation: score >= 70 ? 4 : 3,
        energy: score >= 78 ? "eleve" : "moyen",
        pain: i % 9 === 0 ? "legere" : "aucune",
        muscleQuality: score >= 78 ? "normale" : "lourde",
        sleepQuality: score >= 80 ? "bonne" : "moyenne",
      };
      entry.evening = {
        ...entry.evening,
        touched: true,
        completion,
        duration: completion === "rest" ? "" : 60 + (i % 3) * 8,
        rpe: completion === "rest" ? 3 : 6 + (i % 3),
        pain: "aucune",
        satisfaction: completion === "partial" ? 3 : 4,
        reason: completion === "partial" ? "Agenda serré" : "",
        comment: "",
      };
      entry.nutrition = {
        ...entry.nutrition,
        touched: true,
        meals: 3,
        proteinMeals: i % 5 === 0 ? 2 : 3,
        plants: i % 4 === 0 ? "un" : "deux",
        diet: i % 7 === 0 ? "irreguliere" : "correcte",
        dayEnergy: score >= 75 ? "bon" : "moyen",
        digestion: "bonne",
        alcohol: i % 10 === 0 ? "modere" : "aucun",
      };
      journal[keyOffset(i)] = entry;
    }

    const today = blankDay();
    today.weight = 82;
    today.morning = {
      completed: true,
      fatigue: 2,
      motivation: 4,
      energy: "eleve",
      pain: "aucune",
      muscleQuality: "normale",
      sleepQuality: "bonne",
    };
    today.evening = {
      touched: true,
      completion: "adaptee",
      duration: 68,
      rpe: 7,
      pain: "aucune",
      satisfaction: 4,
      reason: "",
      comment: "Bonne qualité d’exécution, pas d’échec musculaire.",
    };
    today.nutrition = {
      touched: true,
      meals: 3,
      proteinMeals: 3,
      plants: "deux",
      diet: "correcte",
      hunger: "normal",
      dayEnergy: "bon",
      digestion: "bonne",
      alcohol: "aucun",
      foods: "Poulet, riz, légumes, yaourt, fruits.",
    };
    journal[dateKey()] = today;
    return journal;
  }

  function seedDemoDecisions() {
    return [
      {
        id: "demo-1",
        date: keyOffset(2),
        type: "adaptation",
        label: "Volume dos réduit de 2 séries",
        reason: "Tension au coude signalée au check-in et RPE en hausse sur les tirages",
        dataUsed: "Check-in (douleurs), RPE des bilans du soir",
        confidence: "Moyen",
      },
      {
        id: "demo-2",
        date: keyOffset(5),
        type: "seance",
        label: "Fractionné remplacé par zone 2",
        reason: "Sommeil court et readiness sous ta moyenne 7 jours",
        dataUsed: "Readiness, sommeil, charge récente",
        confidence: "Eleve",
      },
      {
        id: "demo-3",
        date: keyOffset(9),
        type: "progression",
        label: "Progression +1 répétition sur tractions",
        reason: "Readiness stable et RPE maîtrisé sur deux semaines",
        dataUsed: "Readiness 14 j, RPE, adhérence",
        confidence: "Eleve",
      },
    ];
  }

  function createDemoState(overrides = {}) {
    return {
      ...structuredClone(defaultState),
      ...overrides,
      dataMode: "demo",
      settingsOpen: false,
      journal: seedDemoJournal(),
      decisions: seedDemoDecisions(),
      chat: [
        {
          role: "coach",
          text:
            "Mode démo chargé. Ces données sont fictives (3 semaines d'historique simulé) et servent uniquement à prévisualiser l’interface complète.",
        },
      ],
      sources: {
        garmin: "connected",
        hevy: "partial",
        apple: "connected",
        nutrition: "manual",
        photos: "none",
        garminSync: "old",
        lab: "disconnected",
        import: "error",
      },
      imports: {
        health: null,
        error: "",
      },
    };
  }

  const app = document.getElementById("app");
  let state = loadState();

  function loadState() {
    try {
      let saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");

      // Migration depuis l'ancienne version (check-ins non datés).
      if (!saved) {
        const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
        if (legacy) {
          saved = {
            ...legacy,
            journal: {},
          };
          const migrated = blankDay();
          if (legacy.morning) migrated.morning = { ...migrated.morning, ...legacy.morning };
          if (legacy.evening) migrated.evening = { ...migrated.evening, ...legacy.evening, touched: true };
          if (legacy.nutrition) migrated.nutrition = { ...migrated.nutrition, ...legacy.nutrition, touched: true };
          migrated.workoutStarted = Boolean(legacy.workoutStarted);
          migrated.adaptationConfirmed = Boolean(legacy.adaptationConfirmed);
          if (legacy.morning?.completed || legacy.evening || legacy.nutrition) {
            saved.journal[dateKey()] = migrated;
          }
        }
      }

      if (!saved) return structuredClone(defaultState);

      const journal = {};
      Object.entries(saved.journal || {}).forEach(([key, entry]) => {
        if (/^\d{4}-\d{2}-\d{2}$/.test(key)) journal[key] = normalizeDay(entry);
      });

      return {
        ...structuredClone(defaultState),
        ...saved,
        dataMode: saved.dataMode === "demo" ? "demo" : saved.dataMode || "blank",
        journal,
        decisions: Array.isArray(saved.decisions) ? saved.decisions.slice(0, 40) : [],
        deload: { ...structuredClone(defaultState.deload), ...(saved.deload || {}) },
        program: { ...structuredClone(defaultState.program), ...(saved.program || {}) },
        workoutDraft: {
          ...structuredClone(defaultState.workoutDraft),
          ...(saved.workoutDraft || {}),
          exercises:
            Array.isArray(saved.workoutDraft?.exercises) && saved.workoutDraft.exercises.length
              ? saved.workoutDraft.exercises
              : structuredClone(defaultState.workoutDraft.exercises),
          course: { ...structuredClone(defaultState.workoutDraft.course), ...(saved.workoutDraft?.course || {}) },
        },
        sources: { ...defaultState.sources, ...(saved.sources || {}) },
        imports: { ...defaultState.imports, ...(saved.imports || {}) },
        chat: Array.isArray(saved.chat) && saved.chat.length ? saved.chat : structuredClone(defaultState.chat),
        settingsOpen: false,
        // Refonte visuelle : le sombre devient le thème par défaut, une seule fois.
        theme: saved.uiVersion >= 2 ? saved.theme || "dark" : "dark",
        uiVersion: 2,
      };
    } catch (error) {
      return structuredClone(defaultState);
    }
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Stockage plein ou indisponible : l'app continue en mémoire.
    }
  }

  function hasTrainingData() {
    return state.dataMode === "demo";
  }

  function hasImportedHealth() {
    return Boolean(state.imports?.health?.records);
  }

  function resetToBlank() {
    const theme = state.theme;
    state = { ...structuredClone(defaultState), theme };
    localStorage.removeItem("athlete-os-v1");
    localStorage.removeItem(LEGACY_KEY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---- Tendances calculées depuis le journal ----

  function readinessHistory(daysBack = 7, startOffset = 1) {
    const scores = [];
    for (let i = startOffset; i < startOffset + daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      if (entry && typeof entry.readinessScore === "number") scores.push(entry.readinessScore);
    }
    return scores;
  }

  function readinessSeries(daysBack = 14) {
    const values = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const entry = journalEntry(keyOffset(i));
      if (entry && typeof entry.readinessScore === "number") values.push(entry.readinessScore);
    }
    return values;
  }

  function readinessTrendText(score) {
    const past = readinessHistory(7);
    if (past.length < 3) {
      return past.length ? `Historique court : ${past.length} j de comparaison` : "Premier jour d'historique";
    }
    const avg = past.reduce((sum, value) => sum + value, 0) / past.length;
    const delta = Math.round(score - avg);
    if (delta === 0) return `Stable vs moyenne ${past.length} j`;
    return `${delta > 0 ? "+" : ""}${delta} pts vs moyenne ${past.length} j`;
  }

  function weightSeries(daysBack = 28) {
    const values = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const entry = journalEntry(keyOffset(i));
      const weight = Number(entry?.weight);
      if (Number.isFinite(weight) && weight > 0) values.push(weight);
    }
    return values;
  }

  function weightSummary() {
    const collect = (start, span) => {
      const values = [];
      for (let i = start; i < start + span; i++) {
        const entry = journalEntry(keyOffset(i));
        const weight = Number(entry?.weight);
        if (Number.isFinite(weight) && weight > 0) values.push(weight);
      }
      return values;
    };
    const recent = collect(0, 7);
    const previous = collect(7, 7);
    const avg = (list) => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null);
    const avg7 = avg(recent);
    const prevAvg7 = avg(previous);
    return {
      last: recent.length ? recent[0] : null,
      count7: recent.length,
      avg7: avg7 === null ? null : Math.round(avg7 * 10) / 10,
      delta: avg7 !== null && prevAvg7 !== null ? Math.round((avg7 - prevAvg7) * 10) / 10 : null,
    };
  }

  function formatKg(value) {
    return `${String(value).replace(".", ",")} kg`;
  }

  function adherenceStats(daysBack = 7) {
    let conforming = 0;
    let denom = 0;
    let checkins = 0;
    let reviews = 0;
    for (let i = 0; i < daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      if (!entry) continue;
      if (entry.morning?.completed) checkins += 1;
      if (entry.evening?.touched) {
        reviews += 1;
        const completion = entry.evening.completion;
        if (completion === "rest") continue; // repos planifié : jamais pénalisé
        denom += 1;
        if (completion === "complete" || completion === "adaptee") conforming += 1;
        else if (completion === "partial") conforming += 0.5;
      }
    }
    return {
      pct: denom ? Math.round((conforming / denom) * 100) : null,
      denom,
      checkins,
      reviews,
      daysBack,
    };
  }

  function subjectiveSeries(daysBack = 7) {
    const values = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const entry = journalEntry(keyOffset(i));
      if (entry?.morning?.completed) values.push(subjectiveScore(entry.morning));
    }
    return values;
  }

  // ---- Moteur de signaux du coach : uniquement des tendances multi-jours ----

  function avgOf(list) {
    return list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : null;
  }

  function collectMorning(field, daysBack, startOffset = 0) {
    const values = [];
    for (let i = startOffset; i < startOffset + daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      if (entry?.morning?.completed) {
        const value = Number(entry.morning[field]);
        if (Number.isFinite(value)) values.push(value);
      }
    }
    return values;
  }

  function collectSessionRpe(daysBack, startOffset = 0) {
    const values = [];
    for (let i = startOffset; i < startOffset + daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      if (!entry?.evening?.touched) continue;
      const completion = entry.evening.completion;
      if (completion === "rest" || completion === "none") continue;
      const rpe = Number(entry.evening.rpe);
      if (Number.isFinite(rpe)) values.push(rpe);
    }
    return values;
  }

  function painDays(daysBack = 7) {
    let count = 0;
    for (let i = 0; i < daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      const morningPain = entry?.morning?.completed ? entry.morning.pain : "aucune";
      const eveningPain = entry?.evening?.touched ? entry.evening.pain : "aucune";
      if (["moderee", "forte"].includes(morningPain) || ["moderee", "forte"].includes(eveningPain)) count += 1;
    }
    return count;
  }

  function missedStreak() {
    let streak = 0;
    for (let i = 0; i < 14; i++) {
      const entry = journalEntry(keyOffset(i));
      if (!entry?.evening?.touched) break;
      const completion = entry.evening.completion;
      if (completion === "rest") continue;
      if (completion === "none") streak += 1;
      else break;
    }
    return streak;
  }

  function journalDepth() {
    let depth = 0;
    for (let i = 0; i < 28; i++) {
      const entry = journalEntry(keyOffset(i));
      if (entry && (entry.morning?.completed || entry.evening?.touched)) depth += 1;
    }
    return depth;
  }

  function computeCoachSignals() {
    const signals = [];
    const depth = journalDepth();
    if (depth < 3) return { signals, depth, ready: false };

    // 1. Readiness en baisse durable (3 derniers jours vs les 7 précédents)
    const recentReadiness = readinessHistory(3, 0);
    const baselineReadiness = readinessHistory(7, 3);
    const recentAvg = avgOf(recentReadiness);
    const baselineAvg = avgOf(baselineReadiness);
    if (recentAvg !== null && baselineAvg !== null && recentReadiness.length >= 2) {
      const delta = Math.round(recentAvg - baselineAvg);
      if (delta <= -8) {
        signals.push({
          key: "readiness",
          label: "Readiness en baisse durable",
          severity: delta <= -14 ? "bad" : "watch",
          detail: `${delta} pts sur 3 jours vs ta moyenne des 7 jours précédents.`,
        });
      }
    }

    // 2. Fatigue subjective élevée sur la semaine
    const fatigue7 = collectMorning("fatigue", 7);
    const fatigueAvg = avgOf(fatigue7);
    if (fatigueAvg !== null && fatigue7.length >= 3 && fatigueAvg >= 3.5) {
      signals.push({
        key: "fatigue",
        label: "Fatigue ressentie élevée",
        severity: fatigueAvg >= 4.2 ? "bad" : "watch",
        detail: `Moyenne ${String(Math.round(fatigueAvg * 10) / 10).replace(".", ",")}/5 sur ${fatigue7.length} check-ins.`,
      });
    }

    // 3. Douleurs récurrentes
    const pains = painDays(7);
    if (pains >= 3) {
      signals.push({
        key: "pain",
        label: "Douleurs récurrentes",
        severity: pains >= 5 ? "bad" : "watch",
        detail: `Douleur modérée ou forte signalée ${pains} jours sur 7. À ne pas masquer par une adaptation automatique.`,
      });
    }

    // 4. RPE en hausse à programme constant
    const rpeRecent = avgOf(collectSessionRpe(7));
    const rpePrevious = avgOf(collectSessionRpe(7, 7));
    if (rpeRecent !== null && rpePrevious !== null && rpeRecent - rpePrevious >= 1) {
      signals.push({
        key: "rpe",
        label: "RPE anormalement élevé",
        severity: rpeRecent - rpePrevious >= 1.8 ? "bad" : "watch",
        detail: `RPE moyen ${String(Math.round(rpeRecent * 10) / 10).replace(".", ",")} vs ${String(Math.round(rpePrevious * 10) / 10).replace(".", ",")} la semaine précédente : le même travail coûte plus cher.`,
      });
    }

    // 5. Motivation en baisse
    const motivation7 = collectMorning("motivation", 7);
    const motivationAvg = avgOf(motivation7);
    if (motivationAvg !== null && motivation7.length >= 3 && motivationAvg < 3) {
      signals.push({
        key: "motivation",
        label: "Motivation en baisse",
        severity: "watch",
        detail: `Moyenne ${String(Math.round(motivationAvg * 10) / 10).replace(".", ",")}/5 sur la semaine.`,
      });
    }

    // 6. Adhérence en chute vs le bloc
    const week = adherenceStats(7);
    const block = adherenceStats(28);
    if (week.pct !== null && block.pct !== null && block.denom >= 6 && week.pct <= block.pct - 20) {
      signals.push({
        key: "adherence",
        label: "Adhérence en chute",
        severity: "watch",
        detail: `${week.pct} % cette semaine contre ${block.pct} % sur le bloc.`,
      });
    }

    // 7. Séances manquées consécutives
    const missed = missedStreak();
    if (missed >= 2) {
      signals.push({
        key: "missed",
        label: "Séances manquées consécutives",
        severity: missed >= 3 ? "bad" : "watch",
        detail: `${missed} séances prévues non réalisées d'affilée.`,
      });
    }

    return { signals, depth, ready: true };
  }

  // ---- Deload : proposé seulement quand plusieurs signaux concordent ----

  function isDeloadActive() {
    return Boolean(state.deload.activeUntil && dateKey() <= state.deload.activeUntil);
  }

  function deloadDaysLeft() {
    if (!isDeloadActive()) return 0;
    const end = new Date(`${state.deload.activeUntil}T12:00:00`);
    const now = new Date(`${dateKey()}T12:00:00`);
    return Math.max(0, Math.round((end - now) / 86400000)) + 1;
  }

  function deloadOnCooldown() {
    if (!state.deload.declinedAt) return false;
    const declined = new Date(`${state.deload.declinedAt}T12:00:00`);
    const now = new Date(`${dateKey()}T12:00:00`);
    return (now - declined) / 86400000 < 5;
  }

  function recentDeloadEnded() {
    if (!state.deload.activeUntil || isDeloadActive()) return false;
    const end = new Date(`${state.deload.activeUntil}T12:00:00`);
    const now = new Date(`${dateKey()}T12:00:00`);
    return (now - end) / 86400000 < 7;
  }

  function deloadProposal(signalsResult) {
    if (isDeloadActive() || deloadOnCooldown() || recentDeloadEnded()) return null;
    if (!signalsResult.ready || signalsResult.depth < 5) return null;
    const meaningful = signalsResult.signals.filter((signal) => ["watch", "bad"].includes(signal.severity));
    if (meaningful.length < 3) return null;
    return {
      signals: meaningful,
      reason: `${meaningful.length} signaux concordants sur plusieurs jours : ${meaningful.map((signal) => signal.label.toLowerCase()).join(", ")}.`,
      confidence: meaningful.some((signal) => signal.severity === "bad") ? "Eleve" : "Moyen",
    };
  }

  // ---- Historique des décisions du coach ----

  function logDecision(type, label, reason, dataUsed, confidence) {
    state.decisions = [
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        date: dateKey(),
        type,
        label,
        reason,
        dataUsed,
        confidence,
      },
      ...state.decisions,
    ].slice(0, 40);
  }

  function observedOutcome(decision) {
    const then = new Date(`${decision.date}T12:00:00`);
    const now = new Date(`${dateKey()}T12:00:00`);
    const diff = Math.round((now - then) / 86400000);
    if (diff < 3) return "Résultat à observer sur les prochains jours.";
    const collect = (fromOffset, toOffset) => {
      const values = [];
      for (let i = fromOffset; i <= toOffset; i++) {
        const entry = journalEntry(keyOffset(i));
        if (entry && typeof entry.readinessScore === "number") values.push(entry.readinessScore);
      }
      return values;
    };
    const after = avgOf(collect(diff - 3, diff - 1));
    const before = avgOf(collect(diff + 1, diff + 3));
    if (after === null || before === null) return "Pas assez de check-ins pour mesurer l'effet.";
    const delta = Math.round(after - before);
    if (delta >= 3) return `Readiness +${delta} pts en moyenne sur les 3 jours suivants.`;
    if (delta <= -3) return `Readiness ${delta} pts sur les 3 jours suivants : effet non atteint, à réévaluer.`;
    return "Readiness stable sur les 3 jours suivants.";
  }

  // ---- Séances saisies manuellement : agrégats et stagnations ----

  const MAJOR_LIFTS = [
    "Développé couché",
    "Squat",
    "Soulevé de terre",
    "Tractions",
    "Rowing barre",
    "Développé militaire",
    "Développé incliné haltères",
    "Presse à cuisses",
    "Hip thrust",
    "Dips",
  ];

  function epley(weight, reps) {
    const w = Number(weight);
    const r = Number(reps);
    if (!Number.isFinite(w) || !Number.isFinite(r) || r <= 0) return 0;
    if (r === 1) return w;
    return w * (1 + r / 30);
  }

  function workoutsByDate(daysBack = 84) {
    const list = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const key = keyOffset(i);
      const entry = journalEntry(key);
      (entry?.workouts || []).forEach((workout) => list.push({ date: key, offset: i, workout }));
    }
    return list;
  }

  function liftHistories() {
    const map = new Map();
    workoutsByDate().forEach(({ date, workout }) => {
      if (workout.type !== "muscu") return;
      (workout.exercises || []).forEach((exercise) => {
        const name = String(exercise.name || "").trim();
        if (!name) return;
        if (!map.has(name)) map.set(name, []);
        map.get(name).push({ date, ...exercise, e1rm: epley(exercise.weight, exercise.reps) });
      });
    });
    return map;
  }

  function liftStatsList() {
    return [...liftHistories().entries()]
      .map(([name, sessions]) => {
        const last = sessions[sessions.length - 1];
        const best = sessions.reduce((a, b) => (b.e1rm > a.e1rm ? b : a));
        const points = sessions.slice(-8).map((s) => Math.round(s.e1rm));
        let trend = "Nouveau";
        let trendTone = "info";
        if (sessions.length >= 2) {
          const reference = sessions[Math.max(0, sessions.length - 4)];
          const pct = reference.e1rm ? Math.round(((last.e1rm - reference.e1rm) / reference.e1rm) * 100) : 0;
          if (pct > 1) {
            trend = `+${pct} %`;
            trendTone = "good";
          } else if (pct < -1) {
            trend = `${pct} %`;
            trendTone = "watch";
          } else {
            trend = "Stable";
            trendTone = "info";
          }
        }
        let stagnant = false;
        if (sessions.length >= 3) {
          const last3 = sessions.slice(-3).map((s) => s.e1rm);
          const maxV = Math.max(...last3);
          stagnant = maxV > 0 && (maxV - Math.min(...last3)) / maxV <= 0.02 && last3[2] <= Math.max(last3[0], last3[1]);
        }
        return { name, last, best, points, trend, trendTone, stagnant, count: sessions.length };
      })
      .sort((a, b) => b.count - a.count || b.last.e1rm - a.last.e1rm);
  }

  function formatPace(minutesPerKm) {
    if (!Number.isFinite(minutesPerKm) || minutesPerKm <= 0) return "—";
    const minutes = Math.floor(minutesPerKm);
    const seconds = Math.round((minutesPerKm - minutes) * 60);
    return `${minutes}'${String(seconds).padStart(2, "0")}/km`;
  }

  function runningSummary() {
    const runs = workoutsByDate(56).filter(({ workout }) => workout.type === "course");
    const week = runs.filter(({ offset }) => offset < 7);
    const sum = (list, pick) => list.reduce((total, item) => total + (Number(pick(item)) || 0), 0);
    const kmWeek = Math.round(sum(week, (r) => r.workout.km) * 10) / 10;
    const durationWeek = sum(week, (r) => r.workout.duration);
    const hrValues = week.map((r) => Number(r.workout.hr)).filter((v) => Number.isFinite(v) && v > 0);
    const weeklyKm = [0, 0, 0, 0, 0, 0, 0, 0];
    runs.forEach(({ offset, workout }) => {
      const bucket = Math.floor(offset / 7);
      if (bucket < 8) weeklyKm[7 - bucket] += Number(workout.km) || 0;
    });
    return {
      total: runs.length,
      kmWeek,
      sessionsWeek: week.length,
      avgPace: kmWeek > 0 && durationWeek > 0 ? formatPace(durationWeek / kmWeek) : "—",
      avgHr: hrValues.length ? Math.round(avgOf(hrValues)) : null,
      weeklyKm: weeklyKm.map((v) => Math.round(v * 10) / 10),
    };
  }

  function hasRealPerformances() {
    return liftHistories().size > 0 || runningSummary().total > 0;
  }

  // ---- Bloc 1 : programme réel de l'athlète (validé le 13/07/2026, départ 20/07/2026) ----

  const BLOC1 = {
    id: "bloc-1",
    name: "Bloc 1 — Recomposition & Base",
    goal: "Maintenir le muscle en déficit léger, réduire le tour de taille et consolider la base aérobie, sans réveiller le mollet.",
    totalWeeks: 10,
    deloadWeek: 6,
    phases: [
      { from: 1, to: 2, label: "Prise de repères", weeklyGoal: "RPE 7 partout : calibrer les charges, filmer squat, couché et soulevé de terre." },
      { from: 3, to: 5, label: "Accumulation", weeklyGoal: "RPE 8, double progression active. Lignes droites en fin de course 2 dès S4 si mollet muet." },
      { from: 6, to: 6, label: "Deload planifié", weeklyGoal: "Volume -40 %, RPE ≤ 6, courses 30 min faciles. La surcompensation se joue cette semaine." },
      { from: 7, to: 9, label: "Intensification", weeklyGoal: "Charges au plus haut, volume stable. Fractionné doux optionnel si zéro alerte mollet." },
      { from: 10, to: 10, label: "Évaluation", weeklyGoal: "Top sets RPE 8 sur les 6 mouvements clés + 30 min de course à FC fixe. Les résultats calibrent le Bloc 2." },
    ],
    // getDay() : 0 = dimanche, 1 = lundi...
    days: {
      1: {
        kind: "muscu",
        title: "Bas A — Force",
        focus: "Dominante squat · protocole mollet (debout)",
        duration: 60,
        rpe: "7 à 8",
        exercises: [
          { name: "Squat", detail: "4 × 4-6 · RPE 7-8 · repos 3 min" },
          { name: "Presse ou fentes marchées", detail: "3 × 8-10 · RPE 7" },
          { name: "Leg curl", detail: "3 × 8-12 · RPE 8" },
          { name: "Mollets debout", detail: "3 × 10-12 · descente 3 s · protocole mollet" },
          { name: "Gainage lesté", detail: "3 séries" },
        ],
      },
      2: {
        kind: "muscu",
        title: "Haut A — Force",
        focus: "Développé couché + tractions, bases de force",
        duration: 60,
        rpe: "7 à 8",
        exercises: [
          { name: "Développé couché", detail: "4 × 4-6 · RPE 7-8 · repos 3 min" },
          { name: "Tractions (lestées si > 8)", detail: "4 × 5-8 · RPE 8" },
          { name: "Développé militaire", detail: "3 × 6-8 · RPE 7,5" },
          { name: "Rowing haltère unilatéral", detail: "3 × 8-10 · RPE 8" },
          { name: "Face pull", detail: "3 × 12-15 · RPE 8" },
        ],
      },
      3: {
        kind: "course",
        title: "Course 1 — Zone 2",
        focus: "Base aérobie stricte : conversation possible du début à la fin",
        duration: 45,
        rpe: "Zone 2",
        exercises: [
          { name: "Échauffement", detail: "5 min marche rapide + 5 min trot très lent" },
          { name: "Corps de séance", detail: "30-35 min zone 2, allure conversationnelle" },
          { name: "Règle mollet", detail: "Douleur > 3/10 → stop, marche, et note-le au bilan du soir" },
        ],
      },
      4: {
        kind: "muscu",
        title: "Bas B — Hinge & unilatéral",
        focus: "Chaîne postérieure · protocole mollet (soléaire)",
        duration: 60,
        rpe: "7 à 8",
        exercises: [
          { name: "Soulevé de terre roumain", detail: "4 × 6-8 · RPE 7 · repos 3 min" },
          { name: "Squat bulgare", detail: "3 × 8-10 / jambe · RPE 8" },
          { name: "Hip thrust", detail: "3 × 8-12 · RPE 8" },
          { name: "Mollets assis (soléaire)", detail: "3 × 12-15 · tempo contrôlé · protocole mollet" },
          { name: "Gainage anti-rotation", detail: "3 séries (Pallof, portés)" },
        ],
      },
      5: {
        kind: "muscu",
        title: "Haut B — Hypertrophie",
        focus: "Volume épaules, dos, bras — RPE maîtrisé",
        duration: 60,
        rpe: "8",
        exercises: [
          { name: "Développé incliné haltères", detail: "4 × 8-10 · RPE 8" },
          { name: "Tirage vertical prise neutre", detail: "3 × 8-12 · RPE 8" },
          { name: "Élévations latérales", detail: "4 × 12-15 · RPE 8-9" },
          { name: "Rowing câble assis", detail: "3 × 10-12 · RPE 8" },
          { name: "Curl incliné + triceps corde", detail: "superset 3 × 10-12" },
        ],
      },
      6: {
        kind: "course",
        title: "Course 2 — Zone 2 longue",
        focus: "Volume aérobie · lignes droites en fin de séance dès S4 (si mollet OK)",
        duration: 60,
        rpe: "Zone 2",
        exercises: [
          { name: "Échauffement", detail: "5 min marche rapide + 5 min trot très lent" },
          { name: "Corps de séance", detail: "40-50 min zone 2" },
          { name: "Dès S4", detail: "6 lignes droites de 15-20 s à ~85 %, récup marche 45 s" },
        ],
      },
      0: {
        kind: "repos",
        title: "Repos complet",
        focus: "Marche libre, rien d'imposé — la progression se construit ici",
        duration: 0,
        rpe: "—",
        exercises: [],
      },
    },
  };

  function programStartDate() {
    return state.program?.startDate || null;
  }

  function programWeek(key = dateKey()) {
    const start = programStartDate();
    if (!start) return null;
    const startDay = new Date(`${start}T12:00:00`);
    const now = new Date(`${key}T12:00:00`);
    const diff = Math.floor((now - startDay) / 86400000);
    if (diff < 0) return 0; // bloc programmé, pas encore démarré
    return Math.min(BLOC1.totalWeeks + 1, Math.floor(diff / 7) + 1);
  }

  function programActive() {
    const week = programWeek();
    return week !== null && week >= 1 && week <= BLOC1.totalWeeks;
  }

  function programUpcoming() {
    return programWeek() === 0;
  }

  function daysUntilBlockStart() {
    const start = programStartDate();
    if (!start) return null;
    const diff = Math.round((new Date(`${start}T12:00:00`) - new Date(`${dateKey()}T12:00:00`)) / 86400000);
    return Math.max(0, diff);
  }

  function programPhase(week = programWeek()) {
    if (!week || week < 1) return null;
    return BLOC1.phases.find((phase) => week >= phase.from && week <= phase.to) || null;
  }

  function programSessionFor(key = dateKey()) {
    const weekday = new Date(`${key}T12:00:00`).getDay();
    return BLOC1.days[weekday] || null;
  }

  function formatFrDate(key) {
    const date = new Date(`${key}T12:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    return date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  }

  function mondayOfWeek(key = dateKey()) {
    const date = new Date(`${key}T12:00:00`);
    const delta = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - delta);
    return dateKey(date);
  }

  function addDaysKey(key, days) {
    const date = new Date(`${key}T12:00:00`);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }

  function programStats() {
    const start = programStartDate();
    if (!start || !programActive()) return { planned: 0, done: 0, completion: 0, totalPlanned: 60 };
    let planned = 0;
    let done = 0;
    let cursor = start;
    const today = dateKey();
    while (cursor <= today) {
      const session = programSessionFor(cursor);
      if (session && session.kind !== "repos") {
        planned += 1;
        const entry = journalEntry(cursor);
        const completion = entry?.evening?.touched ? entry.evening.completion : null;
        if (completion === "complete" || completion === "adaptee") done += 1;
        else if (completion === "partial") done += 0.5;
        else if (!completion && (entry?.workouts || []).length) done += 1;
      }
      cursor = addDaysKey(cursor, 1);
    }
    const totalPlanned = BLOC1.totalWeeks * 6;
    return {
      planned,
      done: Math.round(done * 2) / 2,
      completion: totalPlanned ? Math.round((done / totalPlanned) * 100) : 0,
      totalPlanned,
    };
  }

  function realProgressReply() {
    const lifts = liftStatsList();
    if (!lifts.length) return null;
    const stagnant = lifts.filter((lift) => lift.stagnant);
    const progressing = lifts.filter((lift) => lift.trendTone === "good" && !lift.stagnant);
    const parts = [];
    if (progressing.length) {
      parts.push(`en progression : ${progressing.map((lift) => `${lift.name} (${lift.trend})`).join(", ")}`);
    }
    if (stagnant.length) {
      parts.push(
        `en stagnation sur 3 séances : ${stagnant.map((lift) => lift.name).join(", ")} — je propose de changer la plage de reps, le tempo ou la variante avant d'ajouter du volume`
      );
    }
    if (!parts.length) parts.push(`${lifts.length} exercice(s) suivi(s), tendances stables pour l'instant`);
    return `Sur tes séances saisies : ${parts.join(" ; ")}.`;
  }

  function initPlatform() {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
    document.body.classList.toggle("is-standalone", Boolean(isStandalone));

    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // L'app reste pleinement utilisable sans service worker, notamment en fichier local.
      });
    }
  }

  function updateDocumentChrome() {
    const themeColor = state.theme === "dark" ? "#0a0b0e" : "#f6f6f4";
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", themeColor);
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rounded(value) {
    return Math.round(value);
  }

  function formatMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return `${hours} h ${String(rest).padStart(2, "0")}`;
  }

  function icon(name) {
    const paths = {
      activity:
        '<path d="M3 12h4l3-8 4 16 3-8h4"/><path d="M2 18h20"/>',
      calendar:
        '<path d="M8 2v4M16 2v4M3 9h18"/><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
      chart:
        '<path d="M4 19V5"/><path d="M4 19h16"/><path d="M7 15l4-4 3 3 5-7"/>',
      heart:
        '<path d="M20.4 5.6a5.1 5.1 0 0 0-7.2 0L12 6.8l-1.2-1.2a5.1 5.1 0 1 0-7.2 7.2L12 21l8.4-8.2a5.1 5.1 0 0 0 0-7.2Z"/>',
      message:
        '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/>',
      moon:
        '<path d="M21 13.4A8.7 8.7 0 0 1 10.6 3 8.7 8.7 0 1 0 21 13.4Z"/>',
      sun:
        '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
      settings:
        '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 20 7.1l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.8.8Z"/>',
      play: '<path d="M8 5v14l11-7-11-7Z"/>',
      tune: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
      send: '<path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7Z"/>',
      check: '<path d="m20 6-11 11-5-5"/>',
      alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 2.3 18a2 2 0 0 0 1.7 3h16a2 2 0 0 0 1.7-3l-8-14.1a2 2 0 0 0-3.4 0Z"/>',
    };
    return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.activity}</svg>`;
  }

  function statusClass(status) {
    if (["Excellent", "Bon", "Bonne disponibilite", "Eleve", "Connectee", "Disponible"].includes(status)) return "good";
    if (["A surveiller", "Moyen", "Partielle", "Ancienne", "Manuelle"].includes(status)) return "watch";
    if (["Degrade", "Faible", "Deconnectee", "Erreur", "Aucune donnee"].includes(status)) return "bad";
    return "info";
  }

  function StatusBadge(label, tone) {
    return `<span class="badge ${tone || statusClass(label)}">${escapeHtml(label)}</span>`;
  }

  function ConfidenceBadge(level) {
    const label = { Eleve: "Élevée", Moyen: "Moyenne", Faible: "Faible" }[level] || level;
    return StatusBadge(`Confiance ${label}`, level === "Eleve" ? "good" : level === "Moyen" ? "watch" : "bad");
  }

  function categoryFromScore(score) {
    if (score >= 88) return { label: "Excellent", tone: "good", accent: "var(--green)" };
    if (score >= 72) return { label: "Bon", tone: "good", accent: "var(--green)" };
    if (score >= 56) return { label: "À surveiller", tone: "watch", accent: "var(--orange)" };
    return { label: "Dégradé", tone: "bad", accent: "var(--red)" };
  }

  function readinessLabel(score) {
    if (score >= 88) return "Excellente disponibilité";
    if (score >= 72) return "Bonne disponibilité";
    if (score >= 56) return "Disponibilité à surveiller";
    return "Disponibilité dégradée";
  }

  function mapValue(map, key, fallback) {
    return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : fallback;
  }

  function subjectiveScore(morning) {
    const fatigue = ((6 - Number(morning.fatigue || 3)) / 5) * 100;
    const motivation = (Number(morning.motivation || 3) / 5) * 100;
    const energy = mapValue({ faible: 48, moyen: 70, eleve: 90 }, morning.energy, 70);
    const pain = mapValue({ aucune: 96, legere: 76, moderee: 48, forte: 18 }, morning.pain, 76);
    const muscle = mapValue({ fraiche: 92, normale: 80, lourde: 52 }, morning.muscleQuality, 76);
    const sleep = mapValue({ mauvaise: 42, moyenne: 66, bonne: 82, excellente: 94 }, morning.sleepQuality, 74);
    return rounded((fatigue * 0.22 + motivation * 0.18 + energy * 0.16 + pain * 0.2 + muscle * 0.12 + sleep * 0.12));
  }

  function sleepAdjustedScore() {
    if (!hasTrainingData() && !hasImportedHealth()) return null;
    if (!hasTrainingData() && hasImportedHealth()) return scoreSleepMinutes(state.imports.health.sleepMinutes);
    const subjective = mapValue({ mauvaise: -12, moyenne: -4, bonne: 0, excellente: 5 }, morning().sleepQuality, 0);
    return clamp(demo.recovery.sleepScore + subjective, 0, 100);
  }

  function availableGarmin() {
    return hasTrainingData() && ["connected", "partial", "old"].includes(state.sources.garmin);
  }

  function scoreSleepMinutes(minutes) {
    if (!minutes) return null;
    if (minutes >= 450) return 88;
    if (minutes >= 420) return 82;
    if (minutes >= 360) return 68;
    if (minutes >= 300) return 52;
    return 36;
  }

  function scoreRestingHeartRate(value) {
    if (!value) return null;
    if (value <= 56) return 86;
    if (value <= 62) return 78;
    if (value <= 70) return 64;
    return 48;
  }

  function scoreHrv(value) {
    if (!value) return null;
    if (value >= 65) return 84;
    if (value >= 45) return 74;
    if (value >= 30) return 62;
    return 48;
  }

  function formatShortDate(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
  }

  function calculateReadiness() {
    const importedHealth = !hasTrainingData() ? state.imports.health : null;

    if (!hasTrainingData() && !hasImportedHealth() && !morning().completed) {
      return {
        score: 0,
        category: "À compléter",
        tone: "watch",
        accent: "var(--orange)",
        trend: "Aucune donnée personnelle enregistrée",
        confidence: "Faible",
        factors: [],
        missing: readinessWeights.length,
        empty: true,
      };
    }

    const factorMap = {
      hrv: hasTrainingData()
        ? {
            key: "hrv",
            label: "HRV",
            value: demo.recovery.hrvLabel,
            score: demo.recovery.hrvScore,
            trend: `${demo.recovery.hrvDelta} vs 28 jours`,
            status: "Stable",
            influence: "Soutient le maintien de la séance",
            points: [76, 77, 81, 80, 83, 82, 84],
          }
        : importedHealth?.hrvMs
          ? {
              key: "hrv",
              label: "HRV",
              value: `${rounded(importedHealth.hrvMs)} ms`,
              score: scoreHrv(importedHealth.hrvMs),
              trend: `Dernière mesure importée ${formatShortDate(importedHealth.latestDates?.hrv)}`,
              status: "Importée",
              influence: "Utilisée avec prudence faute de tendance personnelle longue",
              points: [scoreHrv(importedHealth.hrvMs) - 3, scoreHrv(importedHealth.hrvMs) - 1, scoreHrv(importedHealth.hrvMs)],
            }
          : null,
      sleep: hasTrainingData()
        ? {
            key: "sleep",
            label: "Sommeil",
            value: formatMinutes(demo.recovery.sleepMinutes),
            score: sleepAdjustedScore(),
            trend: demo.recovery.sleepTrend,
            status: morning().sleepQuality === "mauvaise" ? "A surveiller" : "Suffisant",
            influence: "Base correcte pour supporter l’intensité",
            points: [68, 74, 70, 78, 80, 83, sleepAdjustedScore()],
          }
        : importedHealth?.sleepMinutes
          ? {
              key: "sleep",
              label: "Sommeil",
              value: formatMinutes(rounded(importedHealth.sleepMinutes)),
              score: scoreSleepMinutes(importedHealth.sleepMinutes),
              trend: `Dernière nuit importée ${formatShortDate(importedHealth.latestDates?.sleep)}`,
              status: scoreSleepMinutes(importedHealth.sleepMinutes) >= 72 ? "Suffisant" : "A surveiller",
              influence: "Influence la recommandation du jour",
              points: [scoreSleepMinutes(importedHealth.sleepMinutes) - 4, scoreSleepMinutes(importedHealth.sleepMinutes) - 2, scoreSleepMinutes(importedHealth.sleepMinutes)],
            }
          : null,
      rhr: hasTrainingData()
        ? {
            key: "rhr",
            label: "FC repos",
            value: `${demo.recovery.rhr} bpm`,
            score: demo.recovery.rhrScore,
            trend: demo.recovery.rhrTrend,
            status: "Normale",
            influence: "Pas de signal de stress inhabituel",
            points: [78, 80, 82, 81, 83, 84, 84],
          }
        : importedHealth?.rhr
          ? {
              key: "rhr",
              label: "FC repos",
              value: `${rounded(importedHealth.rhr)} bpm`,
              score: scoreRestingHeartRate(importedHealth.rhr),
              trend: `Dernière mesure importée ${formatShortDate(importedHealth.latestDates?.rhr)}`,
              status: scoreRestingHeartRate(importedHealth.rhr) >= 72 ? "Normale" : "A surveiller",
              influence: "Signal de charge interne à interpréter avec ton historique",
              points: [scoreRestingHeartRate(importedHealth.rhr) - 2, scoreRestingHeartRate(importedHealth.rhr), scoreRestingHeartRate(importedHealth.rhr)],
            }
          : null,
      load: hasTrainingData()
        ? {
            key: "load",
            label: "Charge récente",
            value: demo.recovery.loadLabel,
            score: demo.recovery.loadScore,
            trend: demo.recovery.loadTrend,
            status: "Maîtrisée",
            influence: "Volume récent compatible avec la séance",
            points: [70, 72, 78, 82, 80, 79, 78],
          }
        : null,
      subjective: morning().completed
        ? {
            key: "subjective",
            label: "Ressenti",
            value: `Fatigue ${morning().fatigue}/5`,
            score: subjectiveScore(morning()),
            trend: `Motivation ${morning().motivation}/5, douleurs ${labelFor("pain", morning().pain)}`,
            status: subjectiveScore(morning()) >= 75 ? "Favorable" : "A surveiller",
            influence: "Ajuste la recommandation sans remplacer les données objectives",
            points: subjectiveSeries(),
          }
        : null,
    };

    let totalWeight = 0;
    let weighted = 0;
    let missing = 0;

    readinessWeights.forEach((item) => {
      const factor = factorMap[item.key];
      if (!factor || typeof factor.score !== "number") {
        missing += 1;
        return;
      }
      totalWeight += item.weight;
      weighted += factor.score * item.weight;
    });

    const score = totalWeight ? rounded(weighted / totalWeight) : 0;
    let confidence = "Eleve";
    if (missing >= 3 || (!morning().completed && !hasImportedHealth())) confidence = "Faible";
    else if (missing > 0 || state.sources.hevy !== "connected") confidence = "Moyen";
    if (availableGarmin() && morning().completed && state.sources.hevy === "partial") confidence = "Eleve";

    // Snapshot du jour : alimente l'historique et les tendances personnelles.
    if (totalWeight) {
      const today = day();
      today.readinessScore = score;
      today.readinessConfidence = confidence;
    }

    return {
      score,
      category: readinessLabel(score),
      tone: categoryFromScore(score).tone,
      accent: categoryFromScore(score).accent,
      trend: totalWeight ? readinessTrendText(score) : "Calculé avec les données disponibles",
      confidence,
      factors: Object.values(factorMap).filter(Boolean),
      missing,
      empty: false,
    };
  }

  function makeCoachDecision(readiness) {
    const session = programActive() ? programSessionFor() : null;
    const plannedTitle = session
      ? session.title
      : hasTrainingData()
        ? demo.workout.type
        : programUpcoming()
          ? `Bloc 1 — départ ${formatFrDate(programStartDate())}`
          : "Aucune séance planifiée";

    if (isDeloadActive()) {
      return {
        label: "Deload en cours",
        tone: "info",
        planned: plannedTitle,
        intensity: "RPE 6 maximum",
        adjustment: `Volume réduit de 40 %, aucune série à l'échec — ${deloadDaysLeft()} jour(s) restant(s)`,
        reason:
          "Semaine de décharge validée par toi après plusieurs signaux concordants. Objectif : dissiper la fatigue accumulée sans perdre les acquis techniques.",
        confidence: readiness.confidence,
        next24: "Séance légère et technique ou récupération active. Le bloc reprend à pleine charge à la fin du deload.",
        nutrition: "Maintenir les apports protéinés : pas de restriction supplémentaire pendant la décharge.",
        recovery: "Priorité au sommeil : c'est la semaine où la surcompensation se joue.",
      };
    }

    if (session && session.kind === "repos") {
      return {
        label: "Repos planifié",
        tone: "info",
        planned: session.title,
        intensity: "Aucune",
        adjustment: "Marche libre et mobilité si tu en as envie, rien d'imposé",
        reason:
          "Jour de repos prévu par le bloc. La progression se construit pendant la récupération : le respecter n'est pas une option, c'est le programme.",
        confidence: readiness.confidence,
        next24: "Sommeil prioritaire, marche libre, et check-in demain matin avant la séance.",
        nutrition: "Protéines maintenues même sans entraînement.",
        recovery: "Journée idéale pour prendre le tour de taille ou les photos mensuelles.",
      };
    }

    if (session && !hasTrainingData() && !morning().completed && !hasImportedHealth()) {
      return {
        label: "À compléter",
        tone: "watch",
        planned: session.title,
        intensity: session.rpe === "—" ? "Non définie" : `RPE ${session.rpe}`,
        adjustment: "Complète le check-in du matin pour valider la séance",
        reason:
          `Le bloc prévoit « ${session.title} » aujourd'hui (${session.focus}). Il me manque ton ressenti du jour pour confirmer, adapter ou alléger.`,
        confidence: "Faible",
        next24: "Check-in (20 secondes), puis exécute la séance prévue si tout est vert.",
        nutrition: "Glucides autour de la séance si elle est intense.",
        recovery: "Le readiness s'affinera avec quelques jours d'historique.",
      };
    }

    if (!hasTrainingData() && !session) {
      if (hasImportedHealth() && !morning().completed) {
        return {
          label: "Données importées",
          tone: "info",
          planned: plannedTitle,
          intensity: "Non définie",
          adjustment: "Complète le check-in pour affiner la recommandation",
          reason:
            "Apple Santé est importé. L’app peut lire certains signaux de récupération, mais il manque encore ton ressenti du jour et ton programme.",
          confidence: readiness.confidence,
          next24: "Complète le check-in, puis ajoute ton programme d’entraînement.",
          nutrition: "Tu peux suivre tes repas sans comptage calorique précis.",
          recovery: "Les tendances seront plus fiables après plusieurs imports ou une synchronisation régulière.",
        };
      }

      if (!morning().completed) {
        return {
          label: "À compléter",
          tone: "watch",
          planned: plannedTitle,
          intensity: "Non définie",
          adjustment: "Complète le check-in du matin",
          reason:
            "Athlete OS ne contient pas encore tes données. Aucune recommandation d’entraînement ne doit être inventée à partir d’un historique vide.",
          confidence: "Faible",
          next24: "Commence par le check-in, puis ajoute ton programme ou importe tes données santé.",
          nutrition: "Renseigne seulement les habitudes simples si tu veux suivre la régularité.",
          recovery: "Les tendances de récupération apparaîtront après plusieurs jours de données.",
        };
      }

      if (morning().pain === "forte") {
        return {
          label: "Repos recommandé",
          tone: "bad",
          planned: plannedTitle,
          intensity: "Très basse",
          adjustment: "Ne pas lancer de séance intense",
          reason:
            "Ton check-in signale une douleur forte. Sans historique fiable, le coach privilégie la prudence.",
          confidence: "Faible",
          next24: "Repos, marche facile si indolore, et avis professionnel si la douleur persiste ou s’aggrave.",
          nutrition: "Repas simples et hydratation normale.",
          recovery: "Surveille l’évolution de la douleur avant toute intensité.",
        };
      }

      return {
        label: "Check-in enregistré",
        tone: "info",
        planned: plannedTitle,
        intensity: "Non définie",
        adjustment: "Ajoute ton programme pour obtenir la séance du jour",
        reason:
          "Le ressenti du jour est enregistré, mais l’app n’a pas encore d’historique Apple Santé, Garmin, Hevy ou programme d’entraînement.",
        confidence: readiness.confidence,
        next24: "Ajoute ton programme ou importe tes données pour transformer ce check-in en recommandation.",
        nutrition: "Tu peux déjà suivre repas, protéines, énergie et digestion.",
        recovery: "Les tendances HRV, sommeil et FC repos apparaîtront après import.",
      };
    }

    const pain = morning().pain;
    const fatigue = Number(morning().fatigue);
    const sleepBad = morning().sleepQuality === "mauvaise";
    const highPain = pain === "forte";
    const moderatePain = pain === "moderee";

    if (highPain || readiness.score < 50) {
      return {
        label: "Repos recommandé",
        tone: "bad",
        planned: plannedTitle,
        intensity: "Tres basse",
        adjustment: "Annuler la séance intense et vérifier la douleur",
        reason:
          "Plusieurs signaux ne permettent pas de valider une séance exigeante. La douleur persistante ou inhabituelle doit être traitée avec prudence.",
        confidence: readiness.confidence,
        next24: "Repos, marche facile, hydratation et avis professionnel si la douleur persiste ou s’aggrave.",
        nutrition: "Conserver des repas protéinés, sans restriction agressive.",
        recovery: "Sommeil prioritaire et aucune série lourde aujourd’hui.",
      };
    }

    if (readiness.score < 62 || moderatePain) {
      return {
        label: "Récupération active",
        tone: "watch",
        planned: plannedTitle,
        intensity: "Basse",
        adjustment: "Remplacer par 30 à 40 min de zone 2 facile + mobilité",
        reason:
          "La disponibilité est insuffisante pour charger lourd. Le coach privilégie la récupération et la prévention articulaire.",
        confidence: readiness.confidence,
        next24: "Zone 2 facile, mobilité et réévaluation demain matin.",
        nutrition: "Repas simples et protéines réparties sur la journée.",
        recovery: "Reduire la charge nerveuse et surveiller les douleurs.",
      };
    }

    if (readiness.score < 75 || fatigue >= 4 || sleepBad) {
      return {
        label: "Séance adaptée",
        tone: "watch",
        planned: plannedTitle,
        intensity: "Moderee",
        adjustment: "Retirer 30 % du volume, RPE cible 6,5 à 7",
        reason:
          "La séance reste utile, mais le ratio bénéfice/risque est meilleur avec moins de volume et aucune série à l’échec.",
        confidence: readiness.confidence,
        next24: "Exécuter proprement, arrêter si la douleur augmente, puis bilan du soir.",
        nutrition: "Ajouter une source de glucides autour de la séance si énergie basse.",
        recovery: "Coucher régulier et pas de surcharge additionnelle aujourd’hui.",
      };
    }

    return {
      label: "Séance maintenue",
      tone: "good",
      planned: plannedTitle,
      intensity: session && session.rpe !== "—" ? `RPE ${session.rpe}` : "RPE 7 a 7,5",
      adjustment: day().adaptationConfirmed
        ? "Adaptation confirmée : pas d’échec, repos +30 s sur les mouvements lourds"
        : "Progression prudente autorisée",
      reason:
        "Bonne récupération générale. HRV stable, sommeil suffisant, fréquence cardiaque au repos normale et charge récente maîtrisée.",
      confidence: readiness.confidence,
      next24: "Maintenir la séance, garder une répétition en réserve et compléter le bilan du soir.",
      nutrition: "Assurer 3 repas protéinés et des glucides avant ou après la séance.",
      recovery: "Priorité à la qualité d’exécution et au sommeil ce soir.",
    };
  }

  function labelFor(group, value) {
    const maps = {
      energy: { faible: "Faible", moyen: "Moyen", eleve: "Élevé" },
      pain: { aucune: "Aucune", legere: "Légère", moderee: "Modérée", forte: "Forte" },
      muscleQuality: { fraiche: "Fraîche", normale: "Normale", lourde: "Lourde" },
      sleepQuality: { mauvaise: "Mauvaise", moyenne: "Moyenne", bonne: "Bonne", excellente: "Excellente" },
      completion: {
        complete: "Oui, intégralement",
        adaptee: "Oui, avec adaptations",
        partial: "Partiellement",
        none: "Non",
        rest: "Repos prevu",
      },
      plants: { aucun: "Aucun", un: "Une portion", deux: "Deux portions", trois: "Trois portions ou plus" },
      diet: {
        maitrisee: "Maitrisee",
        correcte: "Globalement correcte",
        irreguliere: "Irreguliere",
        eloignee: "Tres eloignee de l'objectif",
      },
      hunger: { faible: "Faible", normal: "Normal", eleve: "Eleve", tres: "Tres eleve" },
      dayEnergy: { faible: "Faible", moyen: "Moyen", bon: "Bon" },
      digestion: { bonne: "Bonne", moyenne: "Moyenne", mauvaise: "Mauvaise" },
      alcohol: { aucun: "Aucun", modere: "Consommation moderee", important: "Consommation importante" },
    };
    return maps[group]?.[value] || value;
  }

  function selectOptions(group, selected, values) {
    return values
      .map(
        (value) =>
          `<button type="button" class="segmented-button ${value === selected ? "active" : ""}" data-segment-scope="${group.scope}" data-segment-key="${group.key}" data-segment-value="${value}">${escapeHtml(labelFor(group.key, value))}</button>`
      )
      .join("");
  }

  function ScoreDonut({ score, label, trend, confidence, size = "", accent }) {
    const safeScore = clamp(Number(score) || 0, 0, 100);
    return `
      <section class="score-card">
        <div class="donut ${size}" style="--score:${safeScore}; --accent:${accent || categoryFromScore(safeScore).accent}">
          <div class="donut-value">
            <strong>${safeScore}</strong>
            <span>/100</span>
          </div>
        </div>
        <div class="score-caption">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(trend)}</span>
          <div class="badge-row">${ConfidenceBadge(confidence)}</div>
        </div>
      </section>
    `;
  }

  function MiniDonut(score, tone) {
    return `
      <div class="donut small" style="--score:${clamp(score, 0, 100)}; --accent:${categoryFromScore(score).accent}">
        <div class="donut-value"><strong>${rounded(score)}</strong></div>
      </div>
    `;
  }

  function TrendChart(values, accent = "var(--indigo)") {
    const list = values && values.length ? values : [50, 50, 50];
    const min = Math.min(...list);
    const max = Math.max(...list);
    const spread = max - min || 1;
    const width = 180;
    const height = 48;
    const points = list
      .map((value, index) => {
        const x = (index / (list.length - 1 || 1)) * width;
        const y = height - ((value - min) / spread) * 36 - 6;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
    const area = `0,48 ${points} ${width},48`;
    return `
      <svg class="sparkline" style="--accent:${accent}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tendance">
        <path d="M ${area.replaceAll(" ", " L ")} Z"></path>
        <polyline points="${points}"></polyline>
      </svg>
    `;
  }

  function MetricCard(metric) {
    const tone = metric.score >= 72 ? "good" : metric.score >= 56 ? "watch" : "bad";
    return `
      <article class="metric-card">
        <div class="metric-head">
          <div>
            <h3>${escapeHtml(metric.label)}</h3>
            <div class="metric-value">${escapeHtml(metric.value)}</div>
          </div>
          ${MiniDonut(metric.score, tone)}
        </div>
        <p class="metric-copy"><span class="status-dot ${tone}"></span>${
          String(metric.status).toLowerCase() === String(metric.value).toLowerCase()
            ? escapeHtml(metric.trend)
            : `${escapeHtml(metric.status)} · ${escapeHtml(metric.trend)}`
        }</p>
        <p class="metric-copy fineprint">${escapeHtml(metric.influence)}</p>
        ${TrendChart(metric.points, categoryFromScore(metric.score).accent)}
      </article>
    `;
  }

  function CoachDecisionCard(decision) {
    return `
      <section class="decision-card tone-${decision.tone}">
        <div class="decision-head">
          <div>
            <p class="eyebrow">Décision du coach</p>
            <h2 class="decision-title">${escapeHtml(decision.label)}</h2>
          </div>
          ${ConfidenceBadge(decision.confidence)}
        </div>
        <p class="decision-copy">${escapeHtml(decision.reason)}</p>
        <div class="decision-meta">
          <div class="meta-tile"><span>Séance prévue</span><strong>${escapeHtml(decision.planned)}</strong></div>
          <div class="meta-tile"><span>Intensite</span><strong>${escapeHtml(decision.intensity)}</strong></div>
          <div class="meta-tile"><span>Ajustement</span><strong>${escapeHtml(decision.adjustment)}</strong></div>
        </div>
        <p class="fineprint">Basé sur tes données personnelles · Ceci n'est pas un diagnostic médical</p>
      </section>
    `;
  }

  function WorkoutCard(decision) {
    const session = programActive() ? programSessionFor() : null;

    if (session) {
      const week = programWeek();
      const isDeloadWeek = week === BLOC1.deloadWeek;
      return `
        <section class="workout-card">
          <div class="workout-head">
            <div>
              <p class="eyebrow">Séance du jour · ${escapeHtml(BLOC1.name)}</p>
              <h2 class="workout-title">${escapeHtml(session.title)}</h2>
              <p class="workout-subtitle">${escapeHtml(session.focus)}</p>
            </div>
            ${StatusBadge(day().workoutStarted ? "En cours" : session.kind === "repos" ? "Repos" : "Prévue", day().workoutStarted ? "info" : decision.tone)}
          </div>
          <div class="stat-grid">
            <div class="stat-tile"><span>Semaine</span><strong>${week} / ${BLOC1.totalWeeks}</strong></div>
            <div class="stat-tile"><span>Durée</span><strong>${session.duration ? `${session.duration} min` : "—"}</strong></div>
            <div class="stat-tile"><span>RPE cible</span><strong>${escapeHtml(isDeloadWeek && session.kind !== "repos" ? "≤ 6 (deload)" : session.rpe)}</strong></div>
            <div class="stat-tile"><span>Phase</span><strong>${escapeHtml(programPhase(week)?.label || "—")}</strong></div>
          </div>
          ${
            session.exercises.length
              ? `<div class="exercise-list">
                  ${session.exercises
                    .map((item) => `<div class="exercise-row"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail)}</span></div>`)
                    .join("")}
                </div>`
              : ""
          }
          ${
            isDeloadWeek && session.kind !== "repos"
              ? `<div class="notice"><strong>Semaine de deload planifiée</strong><p>Volume réduit de 40 % (2 séries par exercice), RPE plafonné à 6, aucune série à l'échec. Courses : 30 min faciles.</p></div>`
              : ""
          }
          ${
            session.kind !== "repos"
              ? `<div class="button-row">
                  <button type="button" class="primary-button" data-action="start-workout">${icon("play")}Démarrer la séance</button>
                  <button type="button" class="secondary-button" data-action="request-adaptation">${icon("tune")}Adapter la séance</button>
                </div>`
              : ""
          }
          ${
            day().adaptationPending
              ? `<div class="notice">
                  <strong>Confirmation requise</strong>
                  <p>Proposition : retirer une série d’assistance, ajouter 30 s de repos sur les mouvements lourds et garder 2 répétitions en réserve.</p>
                  <div class="button-row">
                    <button type="button" class="primary-button" data-action="confirm-adaptation">${icon("check")}Confirmer</button>
                    <button type="button" class="secondary-button" data-action="cancel-adaptation">Garder le plan</button>
                  </div>
                </div>`
              : ""
          }
        </section>
      `;
    }

    if (!hasTrainingData()) {
      if (programUpcoming()) {
        return `
          <section class="workout-card">
            <div class="workout-head">
              <div>
                <p class="eyebrow">Séance du jour</p>
                <h2 class="workout-title">Bloc 1 programmé</h2>
                <p class="workout-subtitle">${escapeHtml(BLOC1.goal)}</p>
              </div>
              ${StatusBadge(`J-${daysUntilBlockStart()}`, "info")}
            </div>
            <div class="empty-state">
              <strong>Départ le ${escapeHtml(formatFrDate(programStartDate()))}</strong>
              <p>4 séances de musculation (Upper/Lower), 2 courses zone 2 et 1 repos complet par semaine, deload en semaine ${BLOC1.deloadWeek}. D'ici là : check-ins quotidiens pour construire ta base de readiness, et repérage des charges si tu veux t'échauffer.</p>
            </div>
            <div class="button-row">
              <button type="button" class="secondary-button" data-action="start-block-now">${icon("play")}Commencer dès cette semaine</button>
            </div>
          </section>
        `;
      }
      return `
        <section class="workout-card">
          <div class="workout-head">
            <div>
              <p class="eyebrow">Séance du jour</p>
              <h2 class="workout-title">Aucune séance planifiée</h2>
              <p class="workout-subtitle">Ton programme n’est pas encore renseigné.</p>
            </div>
            ${StatusBadge("À créer", "watch")}
          </div>
          <div class="empty-state">
            <strong>Repartir de zéro est actif</strong>
            <p>Ajoute ton programme, importe Apple Santé ou charge la démo depuis les paramètres si tu veux revoir un exemple rempli.</p>
          </div>
          <div class="button-row">
            <button type="button" class="primary-button" data-action="toggle-settings">${icon("settings")}Sources & paramètres</button>
            <button type="button" class="secondary-button" data-action="load-demo">${icon("play")}Voir la démo</button>
          </div>
        </section>
      `;
    }

    const workout = demo.workout;
    return `
      <section class="workout-card">
        <div class="workout-head">
          <div>
            <p class="eyebrow">Séance du jour</p>
            <h2 class="workout-title">${escapeHtml(workout.type)}</h2>
            <p class="workout-subtitle">${escapeHtml(workout.objective)}</p>
          </div>
          ${StatusBadge(day().workoutStarted ? "En cours" : "Prévue", day().workoutStarted ? "info" : decision.tone)}
        </div>
        <div class="stat-grid">
          <div class="stat-tile"><span>Durée</span><strong>${workout.duration} min</strong></div>
          <div class="stat-tile"><span>RPE cible</span><strong>${String(workout.rpe).replace(".", ",")}</strong></div>
          <div class="stat-tile"><span>Volume</span><strong>${escapeHtml(workout.volume)}</strong></div>
          <div class="stat-tile"><span>Qualite</span><strong>${escapeHtml(workout.athleticQuality)}</strong></div>
        </div>
        <div class="chip-row">${workout.muscles.map((item) => StatusBadge(item, "info")).join("")}</div>
        <div class="exercise-list">
          ${workout.exercises
            .map((item) => `<div class="exercise-row"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail)}</span></div>`)
            .join("")}
        </div>
        <div class="button-row">
          <button type="button" class="primary-button" data-action="start-workout">${icon("play")}Démarrer la séance</button>
          <button type="button" class="secondary-button" data-action="request-adaptation">${icon("tune")}Adapter la séance</button>
        </div>
        ${
          day().adaptationPending
            ? `<div class="notice">
                <strong>Confirmation requise</strong>
                <p>Proposition : retirer une série d’assistance, ajouter 30 s de repos sur les mouvements lourds et garder 2 répétitions en réserve.</p>
                <div class="button-row">
                  <button type="button" class="primary-button" data-action="confirm-adaptation">${icon("check")}Confirmer</button>
                  <button type="button" class="secondary-button" data-action="cancel-adaptation">Garder le plan</button>
                </div>
              </div>`
            : ""
        }
      </section>
    `;
  }

  function MorningCheckIn() {
    return `
      <section class="form-panel">
        <div class="card-head">
          <div>
            <p class="eyebrow">Check-in du matin</p>
            <h2>Moins de 20 secondes</h2>
          </div>
          ${StatusBadge(morning().completed ? "Complete" : "A completer", morning().completed ? "good" : "watch")}
        </div>
        <div class="form-grid">
          <div class="field">
            <div class="range-head"><label for="fatigue">Fatigue générale</label><span class="range-value">${morning().fatigue}/5</span></div>
            <input id="fatigue" type="range" min="1" max="5" value="${morning().fatigue}" data-scope="morning" data-key="fatigue" />
          </div>
          <div class="field">
            <div class="range-head"><label for="motivation">Motivation</label><span class="range-value">${morning().motivation}/5</span></div>
            <input id="motivation" type="range" min="1" max="5" value="${morning().motivation}" data-scope="morning" data-key="motivation" />
          </div>
          <div class="field full">
            <span class="label">Niveau d’énergie</span>
            <div class="segmented">${selectOptions({ scope: "morning", key: "energy" }, morning().energy, ["faible", "moyen", "eleve"])}</div>
          </div>
          <div class="field full">
            <span class="label">Douleurs</span>
            <div class="segmented">${selectOptions({ scope: "morning", key: "pain" }, morning().pain, ["aucune", "legere", "moderee", "forte"])}</div>
          </div>
          <div class="field full">
            <span class="label">Qualité musculaire</span>
            <div class="segmented">${selectOptions({ scope: "morning", key: "muscleQuality" }, morning().muscleQuality, ["fraiche", "normale", "lourde"])}</div>
          </div>
          <div class="field full">
            <span class="label">Sommeil subjectif</span>
            <div class="segmented">${selectOptions({ scope: "morning", key: "sleepQuality" }, morning().sleepQuality, ["mauvaise", "moyenne", "bonne", "excellente"])}</div>
          </div>
          <div class="field full">
            <label for="weight">Poids du jour (kg, facultatif)</label>
            <input id="weight" type="number" inputmode="decimal" step="0.1" min="30" max="250" value="${day().weight ?? ""}" data-scope="day" data-key="weight" placeholder="Ex. 82,4" />
          </div>
        </div>
      </section>
    `;
  }

  function EveningReview() {
    return `
      <section class="form-panel">
        <div class="card-head">
          <div>
            <p class="eyebrow">Bilan du soir</p>
            <h2>Ce qui a vraiment été réalisé</h2>
          </div>
          ${StatusBadge(labelFor("completion", evening().completion), "info")}
        </div>
        <div class="form-grid">
          <div class="field full">
            <label for="completion">La séance prévue a-t-elle été réalisée ?</label>
            <select id="completion" data-scope="evening" data-key="completion">
              ${["complete", "adaptee", "partial", "none", "rest"].map((value) => `<option value="${value}" ${evening().completion === value ? "selected" : ""}>${labelFor("completion", value)}</option>`).join("")}
            </select>
          </div>
          <div class="field">
            <label for="duration">Durée réelle</label>
            <input id="duration" type="number" min="0" value="${evening().duration}" data-scope="evening" data-key="duration" />
          </div>
          <div class="field">
            <div class="range-head"><label for="rpe">RPE global</label><span class="range-value">${evening().rpe}/10</span></div>
            <input id="rpe" type="range" min="1" max="10" value="${evening().rpe}" data-scope="evening" data-key="rpe" />
          </div>
          <div class="field full">
            <span class="label">Douleur apparue pendant la séance</span>
            <div class="segmented">${selectOptions({ scope: "evening", key: "pain" }, evening().pain, ["aucune", "legere", "moderee", "forte"])}</div>
          </div>
          <div class="field">
            <div class="range-head"><label for="satisfaction">Satisfaction</label><span class="range-value">${evening().satisfaction}/5</span></div>
            <input id="satisfaction" type="range" min="1" max="5" value="${evening().satisfaction}" data-scope="evening" data-key="satisfaction" />
          </div>
          <div class="field">
            <label for="reason">Motif si partiel ou non réalisé</label>
            <input id="reason" type="text" value="${escapeHtml(evening().reason)}" data-scope="evening" data-key="reason" placeholder="Fatigue, agenda, douleur..." />
          </div>
          <div class="field full">
            <label for="comment">Commentaire facultatif</label>
            <textarea id="comment" data-scope="evening" data-key="comment">${escapeHtml(evening().comment)}</textarea>
          </div>
        </div>
      </section>
    `;
  }

  function NutritionSummary() {
    return `
      <section class="form-panel">
        <div class="card-head">
          <div>
            <p class="eyebrow">Alimentation simplifiée</p>
            <h2>Qualitative, sans calories inventées</h2>
          </div>
          ${StatusBadge("Manuelle", "watch")}
        </div>
        <div class="form-grid">
          <div class="field">
            <label for="meals">Repas consommés</label>
            <input id="meals" type="number" min="0" max="8" value="${nutrition().meals}" data-scope="nutrition" data-key="meals" />
          </div>
          <div class="field">
            <label for="proteinMeals">Repas protéinés</label>
            <input id="proteinMeals" type="number" min="0" max="8" value="${nutrition().proteinMeals}" data-scope="nutrition" data-key="proteinMeals" />
          </div>
          <div class="field full">
            <span class="label">Fruits et legumes</span>
            <div class="segmented">${selectOptions({ scope: "nutrition", key: "plants" }, nutrition().plants, ["aucun", "un", "deux", "trois"])}</div>
          </div>
          <div class="field full">
            <span class="label">Alimentation generale</span>
            <div class="segmented">${selectOptions({ scope: "nutrition", key: "diet" }, nutrition().diet, ["maitrisee", "correcte", "irreguliere", "eloignee"])}</div>
          </div>
          <div class="field full">
            <span class="label">Faim</span>
            <div class="segmented">${selectOptions({ scope: "nutrition", key: "hunger" }, nutrition().hunger, ["faible", "normal", "eleve", "tres"])}</div>
          </div>
          <div class="field full">
            <span class="label">Énergie dans la journée</span>
            <div class="segmented">${selectOptions({ scope: "nutrition", key: "dayEnergy" }, nutrition().dayEnergy, ["faible", "moyen", "bon"])}</div>
          </div>
          <div class="field full">
            <span class="label">Qualité digestive</span>
            <div class="segmented">${selectOptions({ scope: "nutrition", key: "digestion" }, nutrition().digestion, ["bonne", "moyenne", "mauvaise"])}</div>
          </div>
          <div class="field full">
            <span class="label">Alcool</span>
            <div class="segmented">${selectOptions({ scope: "nutrition", key: "alcohol" }, nutrition().alcohol, ["aucun", "modere", "important"])}</div>
          </div>
          <div class="field full">
            <label for="foods">Principaux aliments</label>
            <textarea id="foods" data-scope="nutrition" data-key="foods">${escapeHtml(nutrition().foods)}</textarea>
          </div>
        </div>
      </section>
    `;
  }

  function CoachSummary(decision, readiness) {
    const vigilance =
      morning().pain !== "aucune"
        ? `Douleur ${labelFor("pain", morning().pain).toLowerCase()} a surveiller.`
        : readiness.score < 78
          ? "Ne pas transformer une journee moyenne en surcharge."
          : "Eviter l'echec musculaire inutile sur les series lourdes.";
    return `
      <section class="card coach-summary">
        <div class="card-head">
          <div>
            <p class="eyebrow">Résumé du coach</p>
            <h2>${escapeHtml(decision.label)}</h2>
          </div>
          ${ConfidenceBadge(decision.confidence)}
        </div>
        <div class="summary-grid">
          <div><span>Raison</span><p>${escapeHtml(decision.reason)}</p></div>
          <div><span>Point de vigilance</span><p>${escapeHtml(vigilance)}</p></div>
          <div><span>24 prochaines heures</span><p>${escapeHtml(decision.next24)}</p></div>
          <div><span>Priorité nutrition</span><p>${escapeHtml(decision.nutrition)}</p></div>
          <div><span>Priorité récupération</span><p>${escapeHtml(decision.recovery)}</p></div>
        </div>
      </section>
    `;
  }

  function DataSourceStatus(compact = false) {
    const sources = [
      {
        name: "Garmin",
        status: state.sources.garmin,
        copy: hasTrainingData()
          ? "Sommeil, HRV, FC repos, charge, running. Données locales de démonstration."
          : "Non connecté. Les données Garmin apparaîtront après import ou connexion future.",
      },
      {
        name: "Hevy",
        status: state.sources.hevy,
        copy: "Exercices, séries, répétitions, charges et RPE. Import réel prévu ultérieurement.",
      },
      {
        name: "Apple Santé",
        status: state.sources.apple,
        copy: "Poids, pas, fréquence cardiaque et centralisation future.",
      },
      {
        name: "Nutrition",
        status: state.sources.nutrition,
        copy: "Saisie qualitative volontaire. Aucune calorie précise n’est estimée sans données suffisantes.",
      },
      {
        name: "Photos",
        status: state.sources.photos,
        copy: "Photos mensuelles facultatives. Absentes, donc non utilisées pour décider.",
      },
      {
        name: "Ancienne sync",
        status: state.sources.garminSync,
        copy: "Exemple d’état données anciennes : la recommandation reste possible avec confiance réduite.",
      },
      {
        name: "Labo",
        status: state.sources.lab,
        copy: "Source déconnectée, gardée hors calcul.",
      },
      {
        name: "Import CSV",
        status: state.sources.import,
        copy: "Erreur gérée explicitement, sans pénaliser automatiquement le score.",
      },
    ];
    return `
      <section class="source-card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Statut des données</p>
            <h2>Sources locales et futurs connecteurs</h2>
          </div>
          ${StatusBadge(state.dataMode === "demo" ? "Démo fictive" : "Zéro donnée", state.dataMode === "demo" ? "info" : "watch")}
        </div>
        <p class="small-text">Une donnée absente n’est jamais interprétée comme négative. Elle réduit seulement la confiance si elle est importante pour la décision.</p>
        <div class="source-grid ${compact ? "compact" : ""}">
          ${sources
            .map(
              (source) => `
                <article class="source-item">
                  ${StatusBadge(sourceStatusLabel(source.status), sourceTone(source.status))}
                  <h3>${escapeHtml(source.name)}</h3>
                  <p>${escapeHtml(source.copy)}</p>
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function sourceStatusLabel(status) {
    return (
      {
        connected: "Connectée",
        partial: "Partielle",
        old: "Ancienne",
        disconnected: "Déconnectée",
        error: "Erreur",
        none: "Aucune donnée",
        manual: "Manuelle",
      }[status] || status
    );
  }

  function sourceTone(status) {
    if (status === "connected") return "good";
    if (["partial", "old", "manual"].includes(status)) return "watch";
    return "bad";
  }

  function renderImportPanel() {
    const health = state.imports.health;
    return `
      <section class="card import-card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Import</p>
            <h2>Importer tes données</h2>
          </div>
          ${StatusBadge(health ? "Apple Santé importé" : "Aucun import", health ? "good" : "watch")}
        </div>
        <div class="import-drop">
          <strong>Apple Santé</strong>
          <p>Exporte tes données depuis l’app Santé, décompresse le fichier ZIP, puis sélectionne le fichier <code>export.xml</code>.</p>
          <label class="primary-button file-button">
            ${icon("play")}Choisir export.xml
            <input type="file" accept=".xml,text/xml,application/xml,.zip" data-import="apple-health" />
          </label>
          <p class="small-text">Le traitement se fait localement dans ton navigateur. Le fichier n’est envoyé nulle part.</p>
        </div>
        ${
          state.imports.error
            ? `<div class="notice"><strong>Import impossible</strong><p>${escapeHtml(state.imports.error)}</p></div>`
            : ""
        }
        ${
          health
            ? `<div class="stat-grid">
                <div class="stat-tile"><span>Fichier</span><strong>${escapeHtml(health.fileName)}</strong></div>
                <div class="stat-tile"><span>Enregistrements lus</span><strong>${health.records}</strong></div>
                <div class="stat-tile"><span>Poids</span><strong>${health.weightKg ? `${health.weightKg} kg` : "Absent"}</strong></div>
                <div class="stat-tile"><span>FC repos</span><strong>${health.rhr ? `${rounded(health.rhr)} bpm` : "Absent"}</strong></div>
                <div class="stat-tile"><span>HRV</span><strong>${health.hrvMs ? `${rounded(health.hrvMs)} ms` : "Absent"}</strong></div>
                <div class="stat-tile"><span>Sommeil</span><strong>${health.sleepMinutes ? formatMinutes(rounded(health.sleepMinutes)) : "Absent"}</strong></div>
                <div class="stat-tile"><span>VO2 estimée</span><strong>${health.vo2 ? rounded(health.vo2) : "Absent"}</strong></div>
                <div class="stat-tile"><span>Pas</span><strong>${health.steps ? rounded(health.steps) : "Absent"}</strong></div>
              </div>`
            : `<div class="empty-state">
                <strong>Aucune donnée importée</strong>
                <p>Après import, les cartes de récupération et l’onglet Santé utiliseront tes données disponibles au lieu de la démo.</p>
              </div>`
        }
      </section>
    `;
  }

  async function importAppleHealthFile(file) {
    if (!file) return;
    if (file.name.toLowerCase().endsWith(".zip")) {
      state.imports.error = "Safari ne peut pas lire directement le ZIP dans cette version. Décompresse l’export Apple Santé, puis importe le fichier export.xml.";
      persist();
      render();
      return;
    }

    try {
      const text = await file.text();
      const parsed = parseAppleHealthXml(text, file.name);
      state.imports.health = parsed;
      state.imports.error = "";
      state.dataMode = "custom";
      state.sources.apple = "connected";
      state.sources.import = "connected";
      state.activeTab = "today";
      state.activeTodayView = "summary";
      addCoachMessage("coach", `Import Apple Santé terminé : ${parsed.records} enregistrements lus. Je peux maintenant utiliser les données disponibles, avec prudence si l’historique est incomplet.`);
      persist();
      render();
    } catch (error) {
      state.imports.error = error.message || "Le fichier n’a pas pu être importé.";
      persist();
      render();
    }
  }

  function parseAppleHealthXml(text, fileName) {
    const doc = new DOMParser().parseFromString(text, "application/xml");
    if (doc.querySelector("parsererror")) {
      throw new Error("Ce fichier ne ressemble pas à un export XML Apple Santé valide.");
    }

    const records = [...doc.querySelectorAll("Record")];
    if (!records.length) {
      throw new Error("Aucun enregistrement Apple Santé trouvé dans ce fichier.");
    }

    const latest = {};
    const dailySteps = new Map();
    const dailyDistance = new Map();
    const dailySleep = new Map();

    const setLatest = (key, record, value, unit) => {
      const end = new Date(record.getAttribute("endDate") || record.getAttribute("startDate") || "");
      if (Number.isNaN(end.getTime())) return;
      if (!latest[key] || end > latest[key].date) {
        latest[key] = { value, unit, date: end.toISOString() };
      }
    };

    records.forEach((record) => {
      const type = record.getAttribute("type") || "";
      const rawValue = record.getAttribute("value");
      const value = Number.parseFloat(rawValue);
      const unit = record.getAttribute("unit") || "";
      const start = new Date(record.getAttribute("startDate") || "");
      const end = new Date(record.getAttribute("endDate") || "");
      const day = Number.isNaN(start.getTime()) ? "" : start.toISOString().slice(0, 10);

      if (type.includes("BodyMass") && Number.isFinite(value)) setLatest("weight", record, value, unit);
      if (type.includes("RestingHeartRate") && Number.isFinite(value)) setLatest("rhr", record, value, unit);
      if (type.includes("HeartRateVariabilitySDNN") && Number.isFinite(value)) setLatest("hrv", record, value, unit);
      if (type.includes("VO2Max") && Number.isFinite(value)) setLatest("vo2", record, value, unit);

      if (type.includes("StepCount") && Number.isFinite(value) && day) {
        dailySteps.set(day, (dailySteps.get(day) || 0) + value);
      }
      if (type.includes("DistanceWalkingRunning") && Number.isFinite(value) && day) {
        const km = unit === "mi" ? value * 1.60934 : unit === "m" ? value / 1000 : value;
        dailyDistance.set(day, (dailyDistance.get(day) || 0) + km);
      }
      if (type.includes("SleepAnalysis") && rawValue && rawValue.includes("Asleep") && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        const minutes = Math.max(0, (end - start) / 60000);
        dailySleep.set(day, (dailySleep.get(day) || 0) + minutes);
      }
    });

    const latestFromMap = (map) => {
      const days = [...map.keys()].sort();
      const day = days[days.length - 1];
      return day ? { day, value: map.get(day) } : null;
    };

    const steps = latestFromMap(dailySteps);
    const distance = latestFromMap(dailyDistance);
    const sleep = latestFromMap(dailySleep);

    return {
      source: "Apple Santé",
      fileName,
      importedAt: new Date().toISOString(),
      records: records.length,
      weightKg: latest.weight?.value || null,
      rhr: latest.rhr?.value || null,
      hrvMs: latest.hrv?.value || null,
      vo2: latest.vo2?.value || null,
      steps: steps?.value || null,
      distanceKm: distance?.value || null,
      sleepMinutes: sleep?.value || null,
      latestDates: {
        weight: latest.weight?.date || null,
        rhr: latest.rhr?.date || null,
        hrv: latest.hrv?.date || null,
        vo2: latest.vo2?.date || null,
        steps: steps?.day || null,
        distance: distance?.day || null,
        sleep: sleep?.day || null,
      },
    };
  }

  const RUN_KINDS = { zone2: "Zone 2", fractionne: "Fractionné", longue: "Course longue", autre: "Autre" };

  function WorkoutLogCard() {
    const draft = state.workoutDraft;
    const isMuscu = draft.mode === "muscu";
    const modeButtons = `
      <div class="segmented">
        <button type="button" class="segmented-button ${isMuscu ? "active" : ""}" data-action="draft-mode" data-mode="muscu">Musculation</button>
        <button type="button" class="segmented-button ${!isMuscu ? "active" : ""}" data-action="draft-mode" data-mode="course">Course / cardio</button>
      </div>
    `;

    const muscuForm = `
      <datalist id="exo-list">${MAJOR_LIFTS.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("")}</datalist>
      <div class="exo-rows">
        <div class="exo-row exo-head">
          <span>Exercice</span><span>kg</span><span>Reps</span><span>Séries</span><span>RPE</span><span></span>
        </div>
        ${draft.exercises
          .map(
            (exercise, index) => `
              <div class="exo-row">
                <input type="text" list="exo-list" placeholder="Développé couché" value="${escapeHtml(exercise.name)}" data-draft-ex="${index}" data-field="name" />
                <input type="number" inputmode="decimal" step="0.5" min="0" placeholder="80" value="${escapeHtml(exercise.weight)}" data-draft-ex="${index}" data-field="weight" />
                <input type="number" inputmode="numeric" min="1" max="50" placeholder="6" value="${escapeHtml(exercise.reps)}" data-draft-ex="${index}" data-field="reps" />
                <input type="number" inputmode="numeric" min="1" max="12" placeholder="4" value="${escapeHtml(exercise.sets)}" data-draft-ex="${index}" data-field="sets" />
                <input type="number" inputmode="decimal" step="0.5" min="1" max="10" placeholder="7,5" value="${escapeHtml(exercise.rpe)}" data-draft-ex="${index}" data-field="rpe" />
                <button type="button" class="ghost-button exo-remove" data-action="remove-exercise-row" data-index="${index}" aria-label="Retirer">✕</button>
              </div>
            `
          )
          .join("")}
      </div>
      <p class="small-text">Renseigne la meilleure série de travail (top set) : c'est elle qui alimente la tendance et la détection de stagnation. Tractions lestées : indique la charge ajoutée.</p>
      <div class="button-row">
        <button type="button" class="secondary-button" data-action="add-exercise-row">+ Ajouter un exercice</button>
        <button type="button" class="primary-button" data-action="save-workout-muscu">${icon("check")}Enregistrer la séance</button>
      </div>
    `;

    const course = draft.course;
    const courseForm = `
      <div class="form-grid">
        <div class="field">
          <label for="run-km">Distance (km)</label>
          <input id="run-km" type="number" inputmode="decimal" step="0.1" min="0" placeholder="8,5" value="${escapeHtml(course.km)}" data-draft-course="km" />
        </div>
        <div class="field">
          <label for="run-duration">Durée (min)</label>
          <input id="run-duration" type="number" inputmode="numeric" min="0" placeholder="48" value="${escapeHtml(course.duration)}" data-draft-course="duration" />
        </div>
        <div class="field">
          <label for="run-hr">FC moyenne (bpm, facultatif)</label>
          <input id="run-hr" type="number" inputmode="numeric" min="0" max="230" placeholder="142" value="${escapeHtml(course.hr)}" data-draft-course="hr" />
        </div>
        <div class="field full">
          <span class="label">Type de séance</span>
          <div class="segmented">
            ${Object.entries(RUN_KINDS)
              .map(
                ([value, label]) =>
                  `<button type="button" class="segmented-button ${course.kind === value ? "active" : ""}" data-action="draft-run-kind" data-kind="${value}">${label}</button>`
              )
              .join("")}
          </div>
        </div>
      </div>
      <div class="button-row" style="margin-top:14px">
        <button type="button" class="primary-button" data-action="save-workout-course">${icon("check")}Enregistrer la course</button>
      </div>
    `;

    return `
      <section class="form-panel">
        <div class="card-head">
          <div>
            <p class="eyebrow">Journal des séances</p>
            <h2>Enregistrer ce que tu as fait</h2>
          </div>
          ${StatusBadge("Saisie manuelle", "info")}
        </div>
        <div class="field" style="margin-top:14px">${modeButtons}</div>
        <div style="margin-top:14px">${isMuscu ? muscuForm : courseForm}</div>
      </section>
    `;
  }

  function TodayWorkoutsList() {
    const workouts = day().workouts || [];
    if (!workouts.length) return "";
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Séances enregistrées aujourd'hui</p>
            <h2>${workouts.length} séance${workouts.length > 1 ? "s" : ""}</h2>
          </div>
          ${StatusBadge("Journal", "good")}
        </div>
        <div class="exercise-list">
          ${workouts
            .map((workout) => {
              const summary =
                workout.type === "muscu"
                  ? (workout.exercises || [])
                      .map((exercise) => `${exercise.name} ${String(exercise.weight).replace(".", ",")} kg × ${exercise.reps} (${exercise.sets} séries, RPE ${String(exercise.rpe || "—").replace(".", ",")})`)
                      .join(" · ")
                  : `${String(workout.km).replace(".", ",")} km en ${workout.duration} min (${formatPace(Number(workout.duration) / Number(workout.km))}${workout.hr ? `, ${workout.hr} bpm` : ""}) — ${RUN_KINDS[workout.kind] || "Course"}`;
              return `
                <div class="exercise-row">
                  <strong>${workout.type === "muscu" ? "Musculation" : "Course"} — ${escapeHtml(summary)}</strong>
                  <button type="button" class="ghost-button" data-action="delete-workout" data-id="${escapeHtml(workout.id)}">Supprimer</button>
                </div>
              `;
            })
            .join("")}
        </div>
      </section>
    `;
  }

  function SignalsCard(signalsResult) {
    if (!signalsResult.ready) {
      return `
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Signaux du bloc</p>
              <h2>Surveillance multi-jours</h2>
            </div>
            ${StatusBadge("Historique court", "info")}
          </div>
          <p class="small-text">Le coach surveille readiness, fatigue, douleurs, RPE, motivation et adhérence sur plusieurs jours. Il faut au moins 3 jours de saisies (${signalsResult.depth}/3 pour l'instant) : aucun signal n'est jamais déduit d'un indicateur isolé.</p>
        </section>
      `;
    }

    const signals = signalsResult.signals;
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Signaux du bloc</p>
            <h2>${signals.length ? `${signals.length} signal${signals.length > 1 ? "aux" : ""} à surveiller` : "Aucun signal de surcharge"}</h2>
          </div>
          ${StatusBadge(
            signals.some((signal) => signal.severity === "bad")
              ? "Vigilance"
              : signals.length
                ? "À surveiller"
                : "Tout est vert",
            signals.some((signal) => signal.severity === "bad") ? "bad" : signals.length ? "watch" : "good"
          )}
        </div>
        ${
          signals.length
            ? `<div class="pillars">
                ${signals
                  .map(
                    (signal) => `
                      <div class="pillar-row">
                        <div class="badge-row" style="margin-bottom:6px">${StatusBadge(signal.label, signal.severity)}</div>
                        <p>${escapeHtml(signal.detail)}</p>
                      </div>
                    `
                  )
                  .join("")}
              </div>`
            : `<p class="small-text">Tendances stables sur ${signalsResult.depth} jours de journal : readiness, fatigue, douleurs, RPE, motivation et adhérence ne montrent pas d'accumulation de fatigue. La surcharge progressive peut continuer.</p>`
        }
      </section>
    `;
  }

  function DeloadCard(signalsResult) {
    if (isDeloadActive()) {
      return `
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Deload</p>
              <h2>Semaine de décharge en cours</h2>
            </div>
            ${StatusBadge(`${deloadDaysLeft()} j restant(s)`, "info")}
          </div>
          <p class="small-text">Volume réduit d'environ 40 %, RPE plafonné à 6, aucune série à l'échec. La course reste en zone 2 facile. Termine plus tôt uniquement si la fraîcheur revient nettement.</p>
          <div class="button-row">
            <button type="button" class="secondary-button" data-action="end-deload">${icon("check")}Terminer le deload maintenant</button>
          </div>
        </section>
      `;
    }

    const proposal = deloadProposal(signalsResult);
    if (!proposal) return "";

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Proposition du coach</p>
            <h2>Deload recommandé</h2>
          </div>
          ${ConfidenceBadge(proposal.confidence)}
        </div>
        <p class="small-text">${escapeHtml(proposal.reason)} Une semaine à volume réduit (-40 %), RPE plafonné à 6 et sans échec musculaire devrait dissiper la fatigue sans coût sur le bloc.</p>
        <div class="notice">
          <strong>Ton accord est requis</strong>
          <p>Le coach ne modifie jamais le bloc sans confirmation. Le deload durerait 7 jours à partir d'aujourd'hui.</p>
          <div class="button-row">
            <button type="button" class="primary-button" data-action="accept-deload">${icon("check")}Lancer le deload (7 j)</button>
            <button type="button" class="secondary-button" data-action="decline-deload">Pas maintenant</button>
          </div>
        </div>
      </section>
    `;
  }

  function formatDayLabel(key) {
    const date = new Date(`${key}T12:00:00`);
    if (Number.isNaN(date.getTime())) return { weekday: "", date: key };
    return {
      weekday: date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", ""),
      date: date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
    };
  }

  function completionBadgeFor(entry) {
    if (!entry?.evening?.touched) return StatusBadge("Bilan absent", "info");
    const completion = entry.evening.completion;
    const map = {
      complete: ["Réalisée", "good"],
      adaptee: ["Réalisée adaptée", "good"],
      partial: ["Partielle", "watch"],
      none: ["Manquée", "bad"],
      rest: ["Repos planifié", "info"],
    };
    const [label, tone] = map[completion] || ["Bilan absent", "info"];
    return StatusBadge(label, tone);
  }

  function HistoryTrendsCard() {
    const readinessValues = readinessSeries(14);
    const weights = weightSeries(28);
    const weight = weightSummary();
    const week = adherenceStats(7);
    const block = adherenceStats(28);
    const hasAnything = readinessValues.length || weights.length || week.reviews;

    if (!hasAnything) {
      return `
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Tendances personnelles</p>
              <h2>Encore aucun historique</h2>
            </div>
            ${StatusBadge("Jour 1", "info")}
          </div>
          <div class="empty-state">
            <strong>L'historique se construit jour après jour</strong>
            <p>Complète le check-in du matin et le bilan du soir : dès 3 jours, les tendances readiness, poids et adhérence apparaissent ici.</p>
          </div>
        </section>
      `;
    }

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Tendances personnelles</p>
            <h2>Calculées sur tes vraies saisies</h2>
          </div>
          ${StatusBadge(`${readinessValues.length} j de readiness`, readinessValues.length >= 7 ? "good" : "watch")}
        </div>
        <div class="summary-grid">
          <div>
            <span>Readiness — 14 derniers jours</span>
            ${
              readinessValues.length >= 2
                ? TrendChart(readinessValues, "var(--indigo)")
                : `<p class="small-text">Encore ${Math.max(0, 2 - readinessValues.length)} jour(s) de check-in avant la première courbe.</p>`
            }
          </div>
          <div>
            <span>Poids — moyenne glissante 7 j</span>
            <p>${
              weight.avg7 !== null
                ? `${formatKg(weight.avg7)}${
                    weight.delta !== null
                      ? ` (${weight.delta > 0 ? "+" : ""}${String(weight.delta).replace(".", ",")} kg vs 7 j précédents)`
                      : " — encore trop peu de recul pour comparer"
                  }`
                : "Renseigne ton poids au check-in pour suivre la moyenne glissante."
            }</p>
            ${weights.length >= 3 ? TrendChart(weights, "var(--green)") : ""}
          </div>
          <div>
            <span>Adhérence 7 jours</span>
            <p>${
              week.pct !== null
                ? `${week.pct} % sur ${week.denom} séance(s) évaluée(s). Séances adaptées comptées conformes, repos planifié non pénalisé.`
                : "Aucun bilan du soir sur les 7 derniers jours."
            }</p>
          </div>
          <div>
            <span>Adhérence 28 jours</span>
            <p>${
              block.pct !== null
                ? `${block.pct} % — ${block.checkins} check-in(s) et ${block.reviews} bilan(s) complétés.`
                : "L'adhérence au bloc apparaîtra avec les premiers bilans."
            }</p>
          </div>
        </div>
      </section>
    `;
  }

  function HistoryList() {
    const todayId = dateKey();
    const keys = [];
    for (let i = 0; i < 14; i++) keys.push(keyOffset(i));
    const rows = keys
      .map((key) => {
        const entry = journalEntry(key);
        if (!entry && key !== todayId) return "";
        const label = formatDayLabel(key);
        const score = typeof entry?.readinessScore === "number" ? entry.readinessScore : null;
        const weight = Number(entry?.weight);
        return `
          <article class="history-row">
            <div class="history-date">
              ${escapeHtml(label.date)}
              <span>${escapeHtml(label.weekday)}${key === todayId ? " · auj." : ""}</span>
            </div>
            <div class="history-main">
              <strong>${escapeHtml(entry?.decisionLabel || (entry?.morning?.completed ? "Check-in complété" : "Aucune saisie"))}</strong>
              <span>${Number.isFinite(weight) && weight > 0 ? formatKg(weight) : "Poids non renseigné"}</span>
            </div>
            ${completionBadgeFor(entry)}
            ${
              score !== null
                ? MiniDonut(score)
                : '<div class="history-empty-score">—</div>'
            }
          </article>
        `;
      })
      .filter(Boolean)
      .join("");

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Journal</p>
            <h2>14 derniers jours</h2>
          </div>
          ${StatusBadge(`${journalKeysDesc(60).length} jour(s) enregistré(s)`, "info")}
        </div>
        <div class="history-list">
          ${rows || `<div class="empty-state"><strong>Journal vide</strong><p>Chaque jour où tu complètes un check-in ou un bilan crée une entrée datée, conservée localement.</p></div>`}
        </div>
      </section>
    `;
  }

  function renderToday() {
    const readiness = calculateReadiness();
    const decision = makeCoachDecision(readiness);
    // Trace la décision du jour dans le journal (utilisée par l'historique).
    if (!readiness.empty) {
      const today = day();
      today.decisionLabel = decision.label;
      today.decisionTone = decision.tone;
    }
    const subnav = `
      <div class="today-subnav" role="tablist" aria-label="Vues Aujourd’hui">
        ${todayViews
          .map(
            (view) =>
              `<button type="button" class="today-subnav-button ${state.activeTodayView === view.id ? "active" : ""}" data-today-view="${view.id}">${escapeHtml(view.label)}</button>`
          )
          .join("")}
      </div>
    `;

    const factors = `
      <section>
        <div class="section-head">
          <div>
            <p class="eyebrow">Facteurs de récupération</p>
            <h2 class="section-title">Ce qui influence la recommandation</h2>
          </div>
          ${StatusBadge(`${readiness.missing} donnée manquante`, readiness.missing ? "watch" : "good")}
        </div>
        <div class="metric-grid">
          ${
            readiness.factors.length
              ? readiness.factors.map(MetricCard).join("")
              : `<div class="empty-state">
                  <strong>Aucun facteur objectif importé</strong>
                  <p>Sommeil, HRV, FC repos et charge apparaîtront après import Apple Santé, Garmin ou saisie d’un historique.</p>
                </div>`
          }
        </div>
      </section>
    `;

    const score = ScoreDonut({
      score: readiness.score,
      label: readiness.category,
      trend: readiness.trend,
      confidence: readiness.confidence,
      accent: readiness.accent,
    });

    const signalsResult = computeCoachSignals();
    const panes = {
      summary: `
        <div class="today-grid">
          <div class="page-grid">
            ${CoachDecisionCard(decision)}
            ${DeloadCard(signalsResult)}
            ${factors}
          </div>
          <aside class="page-grid">
            ${score}
            ${SignalsCard(signalsResult)}
            ${CoachSummary(decision, readiness)}
          </aside>
        </div>
      `,
      checkin: `
        <div class="section-grid">
          ${MorningCheckIn()}
          ${score}
        </div>
      `,
      workout: `
        <div class="page-grid">
          <div class="section-grid">
            ${WorkoutCard(decision)}
            ${CoachSummary(decision, readiness)}
          </div>
          ${WorkoutLogCard()}
          ${TodayWorkoutsList()}
        </div>
      `,
      evening: `
        <div class="section-grid">
          ${EveningReview()}
          ${NutritionSummary()}
        </div>
      `,
      history: `
        <div class="page-grid">
          ${HistoryTrendsCard()}
          ${HistoryList()}
        </div>
      `,
      data: `
        <div class="page-grid">
          ${renderImportPanel()}
          ${DataSourceStatus()}
        </div>
      `,
    };

    return `
      <div class="page-grid">
        ${subnav}
        ${panes[state.activeTodayView] || panes.summary}
      </div>
    `;
  }

  function ProgressRing({ value, label, sublabel, accent = "var(--indigo)" }) {
    return `
      <section class="score-card compact-score">
        <div class="donut medium" style="--score:${clamp(value, 0, 100)}; --accent:${accent}">
          <div class="donut-value"><strong>${value}</strong><span>%</span></div>
        </div>
        <div class="score-caption">
          <strong>${escapeHtml(label)}</strong>
          <span>${escapeHtml(sublabel)}</span>
        </div>
      </section>
    `;
  }

  function BlankDataPage({ eyebrow, title, copy, next }) {
    return `
      <div class="page-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">${escapeHtml(eyebrow)}</p>
              <h2>${escapeHtml(title)}</h2>
            </div>
            ${StatusBadge("Aucune donnée", "watch")}
          </div>
          <div class="empty-state">
            <strong>Tu repars de zéro</strong>
            <p>${escapeHtml(copy)}</p>
          </div>
          <div class="button-row">
            <button type="button" class="primary-button" data-action="toggle-settings">${icon("settings")}Préparer les sources</button>
            <button type="button" class="secondary-button" data-action="load-demo">${icon("play")}Charger la démo</button>
          </div>
        </section>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Prochaine étape</p>
              <h2>${escapeHtml(next)}</h2>
            </div>
            ${StatusBadge("Manuel", "info")}
          </div>
          <p class="small-text">L’app ne remplit rien automatiquement avec de fausses données. Les scores resteront vides ou en confiance faible tant que ton historique réel n’est pas disponible.</p>
        </section>
        ${DataSourceStatus()}
      </div>
    `;
  }

  function WeeklyCalendar() {
    const days = [
      ["Lun", "Bas du corps force", "Squat, hinge, gainage", "Réalisée", "good"],
      ["Mar", "Zone 2", "45 min facile, respiration contrôlée", "Réalisée", "good"],
      ["Mer", "Haut du corps hypertrophie", "Volume contrôlé, RPE 7", "Réalisée adaptée", "info"],
      ["Jeu", "Repos planifie", "Marche et mobilite 12 min", "Repos", "watch"],
      ["Ven", "Haut du corps force", "Séance du jour", "Prévue", "info"],
      ["Sam", "Fractionné court", "6 x 2 min, si récupération OK", "Prévue", "info"],
      ["Dim", "Mobilité + marche", "Récupération active", "Prévue", "watch"],
    ];
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Calendrier hebdomadaire</p>
            <h2>Force, cardio, récupération</h2>
          </div>
          ${StatusBadge("Semaine 4", "info")}
        </div>
        <div class="calendar">
          ${days
            .map(
              ([day, title, copy, status, tone]) => `
                <article class="day-card">
                  <div class="day-label">${day}</div>
                  <div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(copy)}</p></div>
                  ${StatusBadge(status, tone)}
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function AdherenceCard() {
    const week = adherenceStats(7);
    const block = adherenceStats(28);
    const weekPct = week.pct;
    const blockPct = block.pct;
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Adhérence</p>
            <h2>Calculée sur tes bilans du soir</h2>
          </div>
          ${
            weekPct !== null
              ? StatusBadge(`${weekPct} % semaine`, weekPct >= 80 ? "good" : weekPct >= 60 ? "watch" : "bad")
              : StatusBadge("Aucun bilan 7 j", "watch")
          }
        </div>
        <div class="progress-line">
          <div class="range-head"><span>Adhérence 7 jours (${week.denom} séance(s) évaluée(s))</span><strong>${weekPct !== null ? `${weekPct} %` : "—"}</strong></div>
          <div class="progress-track"><div class="progress-fill" style="--progress:${weekPct ?? 0}%"></div></div>
          <div class="range-head"><span>Adhérence 28 jours (${block.denom} séance(s) évaluée(s))</span><strong>${blockPct !== null ? `${blockPct} %` : "—"}</strong></div>
          <div class="progress-track"><div class="progress-fill" style="--progress:${blockPct ?? 0}%"></div></div>
          <div class="range-head"><span>Check-ins complétés sur 28 jours</span><strong>${block.checkins}</strong></div>
        </div>
        <p class="small-text">Les séances adaptées conformément au coach sont comptabilisées comme conformes. Le repos planifié n’est pas pénalisé. Cet indicateur reste séparé du Readiness physiologique.</p>
      </section>
    `;
  }

  function RealWeeklyCalendar() {
    const monday = mondayOfWeek();
    const todayId = dateKey();
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(monday, i);
      const session = programSessionFor(key);
      const label = new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
      let status = "Prévue";
      let tone = "info";
      if (session.kind === "repos") {
        status = "Repos planifié";
        tone = "info";
      } else if (key > todayId) {
        status = "Prévue";
      } else {
        const entry = journalEntry(key);
        const completion = entry?.evening?.touched ? entry.evening.completion : null;
        if (completion === "complete") [status, tone] = ["Réalisée", "good"];
        else if (completion === "adaptee") [status, tone] = ["Réalisée adaptée", "good"];
        else if (completion === "partial") [status, tone] = ["Partielle", "watch"];
        else if (completion === "none") [status, tone] = ["Manquée", "bad"];
        else if (completion === "rest") [status, tone] = ["Repos pris", "info"];
        else if ((entry?.workouts || []).length) [status, tone] = ["Séance saisie", "good"];
        else if (key === todayId) [status, tone] = [day().workoutStarted ? "En cours" : "Aujourd'hui", "info"];
        else [status, tone] = ["Non renseignée", "watch"];
      }
      rows.push(`
        <article class="day-card">
          <div class="day-label">${escapeHtml(label)}</div>
          <div><h3>${escapeHtml(session.title)}</h3><p>${escapeHtml(session.focus)}</p></div>
          ${StatusBadge(status, tone)}
        </article>
      `);
    }
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Calendrier hebdomadaire</p>
            <h2>Semaine ${programActive() ? `${programWeek()} sur ${BLOC1.totalWeeks}` : "de préparation"}</h2>
          </div>
          ${StatusBadge(programPhase()?.label || "Avant-bloc", "info")}
        </div>
        <div class="calendar">${rows.join("")}</div>
      </section>
    `;
  }

  function renderRealProgram() {
    const week = programWeek();
    const phase = programPhase(week);
    const stats = programStats();
    const upcoming = programUpcoming();

    const overview = `
      <div class="section-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">${escapeHtml(BLOC1.name)}</p>
              <h2>${upcoming ? `Départ ${escapeHtml(formatFrDate(programStartDate()))}` : `Semaine ${week} sur ${BLOC1.totalWeeks}`}</h2>
            </div>
            ${upcoming ? StatusBadge(`J-${daysUntilBlockStart()}`, "info") : StatusBadge(`${stats.completion} % du bloc`, "info")}
          </div>
          <p class="small-text">${escapeHtml(BLOC1.goal)}</p>
          <div class="stat-grid">
            <div class="stat-tile"><span>Séances comptées</span><strong>${stats.done} / ${stats.planned || "0"}</strong></div>
            <div class="stat-tile"><span>Total du bloc</span><strong>${stats.totalPlanned}</strong></div>
            <div class="stat-tile"><span>Deload</span><strong>Semaine ${BLOC1.deloadWeek}</strong></div>
            <div class="stat-tile"><span>Phase</span><strong>${escapeHtml(phase?.label || "Préparation")}</strong></div>
          </div>
          ${
            phase
              ? `<div class="notice"><strong>Objectif de la semaine</strong><p>${escapeHtml(phase.weeklyGoal)}</p></div>`
              : `<div class="notice"><strong>D'ici le départ</strong><p>Check-ins quotidiens pour construire ta base de readiness, export CSV Hevy au coach pour calibrer les charges, tour de taille de référence à mesurer.</p></div>`
          }
          ${
            upcoming
              ? `<div class="button-row" style="margin-top:14px"><button type="button" class="secondary-button" data-action="start-block-now">${icon("play")}Commencer dès cette semaine</button></div>`
              : ""
          }
        </section>
        ${ProgressRing({
          value: stats.completion,
          label: upcoming ? "Bloc programmé" : `Semaine ${week} sur ${BLOC1.totalWeeks}`,
          sublabel: upcoming ? `Départ ${formatFrDate(programStartDate())}` : "Complétion du bloc (séances conformes)",
          accent: "var(--indigo)",
        })}
      </div>
    `;

    const decisionsTimeline = (state.decisions || []).slice(0, 5);
    return `
      <div class="page-grid">
        ${overview}
        <div class="section-grid">
          ${RealWeeklyCalendar()}
          ${AdherenceCard()}
        </div>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Historique des adaptations</p>
              <h2>Modifications du bloc, justifiées et tracées</h2>
            </div>
            ${StatusBadge("Traçabilité", "info")}
          </div>
          <div class="adaptation-list">
            ${
              decisionsTimeline.length
                ? decisionsTimeline
                    .map((item) => {
                      const label = formatDayLabel(item.date);
                      return `<article class="timeline-item"><strong>${escapeHtml(label.date)} — ${escapeHtml(item.label)}</strong><p>${escapeHtml(item.reason)}. Résultat : ${escapeHtml(observedOutcome(item))}</p></article>`;
                    })
                    .join("")
                : `<div class="empty-state"><strong>Aucune adaptation pour l'instant</strong><p>Chaque modification du bloc (adaptation confirmée, deload, changement de variante) sera enregistrée ici avec sa raison.</p></div>`
            }
          </div>
        </section>
      </div>
    `;
  }

  function renderProgram() {
    if (programStartDate() && !hasTrainingData()) {
      return renderRealProgram();
    }

    if (!hasTrainingData()) {
      return BlankDataPage({
        eyebrow: "Bloc d’entraînement",
        title: "Aucun programme chargé",
        copy: "Le calendrier, le deload et l’adhérence apparaîtront quand ton bloc sera créé ou importé.",
        next: "Créer ton bloc de 8 à 12 semaines",
      });
    }

    return `
      <div class="page-grid">
        <div class="section-grid">
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Vue générale</p>
                <h2>Semaine ${demo.block.week} sur ${demo.block.totalWeeks}</h2>
              </div>
              ${StatusBadge(`${demo.block.completion} % complete`, "info")}
            </div>
            <p class="small-text">${escapeHtml(demo.block.goal)}</p>
            <div class="stat-grid">
              <div class="stat-tile"><span>Séances réalisées</span><strong>${demo.block.done}</strong></div>
              <div class="stat-tile"><span>Restantes</span><strong>${demo.block.remaining}</strong></div>
              <div class="stat-tile"><span>Deload</span><strong>Semaine ${demo.block.deloadWeek}</strong></div>
              <div class="stat-tile"><span>Objectif semaine</span><strong>${escapeHtml(demo.block.weeklyGoal)}</strong></div>
            </div>
            <div class="progress-line">
              <div class="progress-track"><div class="progress-fill" style="--progress:${demo.block.completion}%"></div></div>
            </div>
          </section>
          ${ProgressRing({
            value: demo.block.completion,
            label: `Semaine ${demo.block.week} sur ${demo.block.totalWeeks}`,
            sublabel: "Completion du bloc fixe",
            accent: "var(--indigo)",
          })}
        </div>
        <div class="section-grid">
          ${WeeklyCalendar()}
          ${AdherenceCard()}
        </div>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Historique des adaptations</p>
              <h2>Justifications et résultats observés</h2>
            </div>
            ${StatusBadge("Traçabilite", "info")}
          </div>
          <div class="adaptation-list">
            ${[
              ["8 juillet", "Fractionne remplace par zone 2", "Sommeil court + RPE anormalement haut", "Fatigue reduite le lendemain"],
              ["5 juillet", "Développé couché maintenu sans ajout de charge", "Trois séries à RPE 8,5 sur la séance précédente", "Technique plus stable"],
              ["1 juillet", "Volume dos reduit de 2 series", "Tension coude signalee au check-in", "Douleur disparue sous 48 h"],
            ]
              .map(
                ([date, mod, reason, result]) => `
                  <article class="timeline-item">
                    <strong>${escapeHtml(date)} - ${escapeHtml(mod)}</strong>
                    <p>Raison : ${escapeHtml(reason)}. Résultat observé : ${escapeHtml(result)}.</p>
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
      </div>
    `;
  }

  function formatE1rm(value) {
    return `${String(Math.round(value * 10) / 10).replace(".", ",")} kg`;
  }

  function RealLiftsSection(realLifts) {
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Musculation</p>
            <h2>Tes exercices saisis</h2>
          </div>
          ${StatusBadge(`${realLifts.length} exercice(s) suivis`, "good")}
        </div>
        <p class="small-text">Tendance basée sur le 1RM estimé (formule d'Epley) de ta meilleure série. La progression réelle se juge sur plusieurs séances, pas sur le volume seul.</p>
        <div class="performance-table">
          ${realLifts
            .map(
              (lift) => `
                <article class="lift-row">
                  <div>
                    <strong>${escapeHtml(lift.name)}${lift.stagnant ? " ⚠︎" : ""}</strong>
                    <span>Dernière : ${String(lift.last.weight).replace(".", ",")} kg × ${lift.last.reps} · Meilleure : ${String(lift.best.weight).replace(".", ",")} kg × ${lift.best.reps} · 1RM est. ${formatE1rm(lift.last.e1rm)} · ${lift.count} séance(s)</span>
                  </div>
                  ${StatusBadge(lift.stagnant ? "Stagnation" : lift.trend, lift.stagnant ? "watch" : lift.trendTone)}
                  ${lift.points.length >= 2 ? TrendChart(lift.points, lift.stagnant ? "var(--orange)" : "var(--green)") : '<span class="small-text">Encore 1 séance avant la courbe</span>'}
                </article>
              `
            )
            .join("")}
        </div>
      </section>
    `;
  }

  function RealStagnationSection(realLifts) {
    const stagnant = realLifts.filter((lift) => lift.stagnant);
    if (!stagnant.length) {
      return `
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Détection des stagnations</p>
              <h2>Aucune stagnation détectée</h2>
            </div>
            ${StatusBadge("Règle : 3 séances", "info")}
          </div>
          <p class="small-text">Une stagnation est signalée quand un exercice ne progresse pas sur trois séances consécutives (1RM estimé stable à ±2 %). Continue la surcharge progressive prudente.</p>
        </section>
      `;
    }
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Détection des stagnations</p>
            <h2>${stagnant.length} exercice${stagnant.length > 1 ? "s" : ""} à débloquer</h2>
          </div>
          ${StatusBadge("3 séances sans progression", "watch")}
        </div>
        ${stagnant
          .map(
            (lift) => `
              <div class="notice">
                <strong>${escapeHtml(lift.name)} — 1RM estimé stable à ${formatE1rm(lift.last.e1rm)}</strong>
                <p>Plutôt que d'ajouter brutalement du volume : change la plage de répétitions, joue sur le tempo ou une pause, baisse légèrement le RPE cible deux semaines, ou passe temporairement sur une variante proche. Vérifie aussi la récupération (signaux du bloc) avant de conclure à une vraie stagnation.</p>
              </div>
            `
          )
          .join("")}
      </section>
    `;
  }

  function RealRunningSection(running) {
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Running & cardio</p>
            <h2>Tes courses saisies</h2>
          </div>
          ${StatusBadge(`${running.total} course(s) sur 8 semaines`, "good")}
        </div>
        <div class="stat-grid">
          <div class="stat-tile"><span>Km semaine</span><strong>${String(running.kmWeek).replace(".", ",")}</strong></div>
          <div class="stat-tile"><span>Séances 7 j</span><strong>${running.sessionsWeek}</strong></div>
          <div class="stat-tile"><span>Allure moyenne</span><strong>${running.avgPace}</strong></div>
          <div class="stat-tile"><span>FC moyenne</span><strong>${running.avgHr ? `${running.avgHr} bpm` : "—"}</strong></div>
        </div>
        <p class="small-text">Volume hebdomadaire sur 8 semaines :</p>
        ${TrendChart(running.weeklyKm, "var(--blue)")}
      </section>
    `;
  }

  function renderPerformance() {
    const realLifts = liftStatsList();
    const running = runningSummary();
    const hasReal = realLifts.length > 0 || running.total > 0;

    if (!hasTrainingData() && !hasReal) {
      return BlankDataPage({
        eyebrow: "Performances",
        title: "Aucune performance enregistrée",
        copy: "Enregistre tes séances depuis Aujourd'hui → Séance → Journal des séances, ou importe Hevy/Garmin plus tard : charges, répétitions, RPE et courses apparaîtront ici.",
        next: "Saisir ta première séance dans l'onglet Aujourd'hui",
      });
    }

    if (!hasTrainingData() && hasReal) {
      return `
        <div class="page-grid">
          ${realLifts.length ? RealLiftsSection(realLifts) : ""}
          ${realLifts.length ? RealStagnationSection(realLifts) : ""}
          ${running.total ? RealRunningSection(running) : ""}
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Score de performance du bloc</p>
                <h2>En construction</h2>
              </div>
              ${StatusBadge("Plusieurs semaines requises", "info")}
            </div>
            <p class="small-text">Ce score (musculation 35 %, cardio 30 %, régularité 20 %, exécution 15 %) sera calculé quand plusieurs semaines de séances et de bilans seront disponibles. Il n'est jamais calculé sur une seule séance.</p>
          </section>
        </div>
      `;
    }

    const lifts = [
      ["Développé couché", "82,5 kg x 6", "85 kg x 5", "+3 %", [70, 72, 74, 76, 77, 79, 82]],
      ["Squat", "105 kg x 5", "110 kg x 4", "+2 %", [68, 70, 70, 73, 75, 76, 77]],
      ["Souleve de terre", "130 kg x 4", "135 kg x 3", "Stable", [72, 74, 75, 74, 75, 75, 75]],
      ["Tractions", "+12 kg x 6", "+15 kg x 5", "+4 %", [66, 67, 71, 73, 75, 78, 80]],
      ["Rowing", "72,5 kg x 8", "75 kg x 7", "+2 %", [64, 67, 68, 70, 71, 72, 74]],
      ["Développé militaire", "52,5 kg x 5", "55 kg x 4", "À surveiller", [70, 70, 71, 71, 70, 70, 70]],
    ];
    return `
      <div class="page-grid">
        ${realLifts.length ? RealLiftsSection(realLifts) : ""}
        ${realLifts.length ? RealStagnationSection(realLifts) : ""}
        ${running.total ? RealRunningSection(running) : ""}
        <div class="section-grid">
          ${ScoreDonut({
            score: demo.performanceScore,
            label: "Score de performance du bloc",
            trend: "+5 pts sur 4 semaines",
            confidence: "Moyen",
            accent: "var(--indigo)",
          })}
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Ponderation</p>
                <h2>Score calculé sur plusieurs semaines</h2>
              </div>
              ${StatusBadge("Jamais sur 1 séance", "watch")}
            </div>
            <div class="pillars">
              ${[
                ["Musculation", "35 %", "Progression solide sur developpe couche, tractions et rowing."],
                ["Cardio & running", "30 %", "Volume stable, zone 2 en hausse, fractionne a consolider."],
                ["Régularité", "20 %", "Adhérence hebdomadaire à 88 %."],
                ["Exécution & RPE", "15 %", "RPE mieux maîtrisé, peu de séries à l’échec."],
              ]
                .map(([name, weight, copy]) => `<div class="pillar-row"><strong>${name} - ${weight}</strong><p>${copy}</p></div>`)
                .join("")}
            </div>
          </section>
        </div>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Musculation</p>
              <h2>Exercices majeurs</h2>
            </div>
            ${StatusBadge("Progression reelle", "good")}
          </div>
          <div class="performance-table">
            ${lifts
              .map(
                ([name, last, best, trend, points]) => `
                  <article class="lift-row">
                    <div><strong>${name}</strong><span>Derniere : ${last} · Meilleure : ${best}</span></div>
                    ${StatusBadge(trend, trend === "À surveiller" ? "watch" : trend === "Stable" ? "info" : "good")}
                    ${TrendChart(points, trend === "À surveiller" ? "var(--orange)" : "var(--green)")}
                  </article>
                `
              )
              .join("")}
          </div>
        </section>
        <div class="section-grid">
          <section class="card">
            <div class="card-head">
              <div>
              <p class="eyebrow">Détection des stagnations</p>
              <h2>Développé militaire à surveiller</h2>
              </div>
              ${StatusBadge("3 séances stables", "watch")}
            </div>
            <p class="small-text">Pas d’augmentation brutale du volume. Le coach propose plutôt une plage 6-10 reps, tempo contrôlé et maintien RPE 7 pendant deux semaines.</p>
            <div class="notice"><strong>Action proposée</strong><p>Changer temporairement la variante pour développé haltères assis si la technique se dégrade ou si la fatigue épaule augmente.</p></div>
          </section>
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Running & cardio</p>
                <h2>Volume, intensité, récupération</h2>
              </div>
              ${StatusBadge("Tendance 8 semaines +", "good")}
            </div>
            <div class="stat-grid">
              <div class="stat-tile"><span>Km semaine</span><strong>18,4</strong></div>
              <div class="stat-tile"><span>Séances</span><strong>2</strong></div>
              <div class="stat-tile"><span>Allure moyenne</span><strong>5'42/km</strong></div>
              <div class="stat-tile"><span>Zone 2</span><strong>72 min</strong></div>
              <div class="stat-tile"><span>FC moyenne</span><strong>142 bpm</strong></div>
              <div class="stat-tile"><span>VO2 estimee</span><strong>${demo.body.vo2}</strong></div>
            </div>
            ${TrendChart([42, 44, 43, 46, 48, 49, 52, 55, 57, 58, 60, 62], "var(--blue)")}
          </section>
        </div>
      </div>
    `;
  }

  function renderHealth() {
    if (!hasTrainingData() && hasImportedHealth()) {
      const health = state.imports.health;
      return `
        <div class="page-grid">
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Apple Santé</p>
                <h2>Données importées</h2>
              </div>
              ${StatusBadge("Import local", "good")}
            </div>
            <p class="small-text">Ces valeurs viennent de ton fichier Apple Santé. Les tendances longues seront plus fiables après plusieurs imports ou une synchronisation récurrente.</p>
            <div class="stat-grid wide">
              <div class="stat-tile"><span>Poids</span><strong>${health.weightKg ? `${health.weightKg} kg` : "Absent"}</strong></div>
              <div class="stat-tile"><span>FC repos</span><strong>${health.rhr ? `${rounded(health.rhr)} bpm` : "Absent"}</strong></div>
              <div class="stat-tile"><span>HRV</span><strong>${health.hrvMs ? `${rounded(health.hrvMs)} ms` : "Absent"}</strong></div>
              <div class="stat-tile"><span>Sommeil</span><strong>${health.sleepMinutes ? formatMinutes(rounded(health.sleepMinutes)) : "Absent"}</strong></div>
              <div class="stat-tile"><span>VO2 estimée</span><strong>${health.vo2 ? rounded(health.vo2) : "Absent"}</strong></div>
              <div class="stat-tile"><span>Pas</span><strong>${health.steps ? rounded(health.steps) : "Absent"}</strong></div>
              <div class="stat-tile"><span>Distance marche/course</span><strong>${health.distanceKm ? `${health.distanceKm.toFixed(1)} km` : "Absent"}</strong></div>
              <div class="stat-tile"><span>Import</span><strong>${formatShortDate(health.importedAt)}</strong></div>
            </div>
          </section>
          ${renderImportPanel()}
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Interprétation</p>
                <h2>Confiance prudente</h2>
              </div>
              ${StatusBadge("Partiel", "watch")}
            </div>
            <p class="small-text">L’app peut commencer à lire la récupération, mais elle ne conclut pas encore sur la progression physique ou l’âge athlétique sans programme, performances et historique long.</p>
          </section>
        </div>
      `;
    }

    if (!hasTrainingData()) {
      return BlankDataPage({
        eyebrow: "Santé & forme",
        title: "Aucune tendance long terme",
        copy: "Poids, tour de taille, HRV, sommeil, FC repos et VO2 estimée resteront vides tant que tes données Apple Santé/Garmin ne sont pas importées.",
        next: "Importer Apple Santé",
      });
    }

    return `
      <div class="page-grid">
        <div class="section-grid">
          ${ScoreDonut({
            score: demo.healthIndex,
            label: "Health & Athletic Index",
            trend: "+4 pts sur 3 mois",
            confidence: "Moyen",
            accent: "var(--green)",
          })}
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Indice de forme générale</p>
                <h2>Construit sur les tendances longues</h2>
              </div>
              ${StatusBadge("Stable", "good")}
            </div>
            <div class="pillars">
              ${[
                ["Cardio", "30 %", "VO2 estimée et zone 2 en progression."],
                ["FC repos & HRV", "20 %", "FC repos stable, HRV sans degradation durable."],
                ["Poids & taille", "20 %", "Poids stable avec tour de taille legerement en baisse."],
                ["Activité", "15 %", "Régularité hebdomadaire élevée."],
                ["Sommeil", "15 %", "Durée correcte, régularité encore améliorable."],
              ]
                .map(([name, weight, copy]) => `<div class="pillar-row"><strong>${name} - ${weight}</strong><p>${copy}</p></div>`)
                .join("")}
            </div>
          </section>
        </div>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Indicateurs principaux</p>
              <h2>Moyen et long terme</h2>
            </div>
            ${StatusBadge("Tendances personnelles", "info")}
          </div>
          <div class="stat-grid wide">
            <div class="stat-tile"><span>Poids</span><strong>${(() => {
              const weight = weightSummary();
              return weight.last !== null ? formatKg(weight.last) : `${demo.body.weight} kg`;
            })()}</strong></div>
            <div class="stat-tile"><span>Moyenne 7 j</span><strong>${(() => {
              const weight = weightSummary();
              if (weight.avg7 === null) return demo.body.weightTrend;
              const delta = weight.delta;
              return `${formatKg(weight.avg7)}${delta !== null ? ` (${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")})` : ""}`;
            })()}</strong></div>
            <div class="stat-tile"><span>Tour de taille</span><strong>${demo.body.waist}</strong></div>
            <div class="stat-tile"><span>FC repos</span><strong>${demo.recovery.rhr} bpm</strong></div>
            <div class="stat-tile"><span>HRV</span><strong>${demo.recovery.hrvLabel}</strong></div>
            <div class="stat-tile"><span>VO2 estimee</span><strong>${demo.body.vo2}</strong></div>
            <div class="stat-tile"><span>Sommeil</span><strong>${demo.body.sleepRegularity} % regulier</strong></div>
            <div class="stat-tile"><span>Activité</span><strong>${demo.body.activityRegularity} %</strong></div>
            <div class="stat-tile"><span>Force relative</span><strong>${demo.body.relativeStrength}</strong></div>
          </div>
        </section>
        <div class="section-grid">
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Progression physique</p>
                <h2>Tendance probable</h2>
              </div>
              ${StatusBadge("Favorable", "good")}
            </div>
            <p class="small-text">Poids stable, tour de taille legerement en baisse et performances maintenues : tendance compatible avec une recomposition favorable. Ce n'est pas un diagnostic certain.</p>
            ${(() => {
              const weights = weightSeries(28);
              return weights.length >= 3
                ? TrendChart(weights, "var(--green)")
                : TrendChart([82.4, 82.2, 82.1, 82.0, 82.1, 82.0, 81.9], "var(--green)");
            })()}
          </section>
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Age athletique indicatif</p>
                <h2>Non affiché pour l’instant</h2>
              </div>
              ${StatusBadge("Confiance insuffisante", "watch")}
            </div>
            <div class="empty-state">
              <strong>Historique encore trop court</strong>
              <p>Il faut au moins huit semaines exploitables avec données cardio, poids, tour de taille, activité et performances. Cette valeur ne représentera jamais un âge biologique réel.</p>
            </div>
          </section>
        </div>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Estimations et tendances</p>
              <h2>Données secondaires</h2>
            </div>
            ${StatusBadge("Jamais seules", "watch")}
          </div>
          <p class="small-text"><strong>Ces données sont des estimations secondaires et ne sont jamais utilisées seules pour prendre une décision.</strong></p>
          <div class="stat-grid">
            <div class="stat-tile"><span>Masse grasse estimee</span><strong>~18 %</strong></div>
            <div class="stat-tile"><span>Masse musculaire estimee</span><strong>Stable</strong></div>
            <div class="stat-tile"><span>Calories brulees</span><strong>Tendance uniquement</strong></div>
            <div class="stat-tile"><span>Body Battery</span><strong>Secondaire</strong></div>
            <div class="stat-tile"><span>Stress Garmin</span><strong>Contextuel</strong></div>
          </div>
        </section>
      </div>
    `;
  }

  function renderCoach() {
    const quickActions = [
      "Analyse ma récupération",
      "Adapte ma séance",
      "Fais mon bilan hebdomadaire",
      "Analyse ma progression",
      "Prépare ma semaine",
      "Explique mon score",
      "Identifie mes stagnations",
      "Analyse mon alimentation récente",
      "Prépare mon prochain bloc",
    ];
    const confidenceLabel = (value) => ({ Eleve: "élevée", Moyen: "moyenne", Faible: "faible" }[value] || value || "moyenne");
    const decisionHistory = state.decisions || [];
    return `
      <div class="chat-layout">
        <div class="page-grid">
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Actions rapides</p>
                <h2>Questions utiles au quotidien</h2>
              </div>
              ${StatusBadge("Coach local", "info")}
            </div>
            <div class="quick-grid">
              ${quickActions
                .map((action) => `<button type="button" class="quick-button" data-action="quick-chat" data-prompt="${escapeHtml(action)}">${icon("message")}${escapeHtml(action)}</button>`)
                .join("")}
            </div>
          </section>
          <section class="card">
            <div class="card-head">
              <div>
                <p class="eyebrow">Historique des décisions</p>
                <h2>Coach decisions log</h2>
              </div>
              ${StatusBadge("Memoire locale", "info")}
            </div>
            <div class="decision-list">
              ${
                decisionHistory.length
                  ? decisionHistory
                      .map((item) => {
                        const label = formatDayLabel(item.date);
                        return `
                          <article class="timeline-item">
                            <strong>${escapeHtml(label.date)} — ${escapeHtml(item.label)}</strong>
                            <p>Justification : ${escapeHtml(item.reason)}.</p>
                            <p>Données : ${escapeHtml(item.dataUsed)}. Confiance ${escapeHtml(confidenceLabel(item.confidence))}.</p>
                            <p>Résultat observé : ${escapeHtml(observedOutcome(item))}</p>
                          </article>
                        `;
                      })
                      .join("")
                  : `<div class="empty-state">
                      <strong>Aucune décision enregistrée</strong>
                      <p>Chaque adaptation confirmée, deload accepté ou refusé sera tracé ici avec sa justification, les données utilisées et le résultat observé les jours suivants.</p>
                    </div>`
              }
            </div>
          </section>
        </div>
        <section class="chat-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Discussion</p>
              <h2>Préparateur physique intégré</h2>
            </div>
            ${StatusBadge("V1 simulee", "watch")}
          </div>
          <div class="messages" id="messages">
            ${state.chat.map((message) => `<div class="message ${message.role}">${escapeHtml(message.text)}</div>`).join("")}
          </div>
          <form class="chat-form" data-chat-form>
            <input type="text" name="message" placeholder="Demande au coach..." autocomplete="off" />
            <button type="submit" class="primary-button">${icon("send")}Envoyer</button>
          </form>
          <p class="small-text">Les réponses utilisent uniquement les données présentes dans cette app. Aucune décision médicale n’est produite.</p>
        </section>
      </div>
    `;
  }

  function renderContent() {
    if (state.activeTab === "program") return renderProgram();
    if (state.activeTab === "performance") return renderPerformance();
    if (state.activeTab === "health") return renderHealth();
    if (state.activeTab === "coach") return renderCoach();
    return renderToday();
  }

  function renderNav(kind = "desktop") {
    return tabs
      .map(
        (tab) => `
          <button type="button" class="${kind === "mobile" ? "mobile-nav-button" : "nav-button"} ${state.activeTab === tab.id ? "active" : ""}" data-tab="${tab.id}">
            ${icon(tab.icon)}
            <span>${escapeHtml(tab.label)}</span>
          </button>
        `
      )
      .join("");
  }

  function renderSidebar() {
    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">AO</div>
          <div>
            <p class="brand-title">Athlete OS</p>
            <p class="brand-subtitle">v${APP_VERSION} · cockpit personnel</p>
          </div>
        </div>
        <nav class="nav-stack" aria-label="Navigation principale">${renderNav()}</nav>
        <div class="sidebar-footer">
          <div class="mini-source"><span>${state.dataMode === "demo" ? "Readiness démo" : "Données"}</span><strong>${state.dataMode === "demo" ? `${calculateReadiness().score} - ${calculateReadiness().category}` : "À compléter"}</strong></div>
          <button type="button" class="ghost-button" data-action="toggle-settings">${icon("settings")}Sources & parametres</button>
        </div>
      </aside>
    `;
  }

  function renderSettings() {
    if (!state.settingsOpen) return "";
    return `
      <div class="drawer-backdrop" data-action="close-settings"></div>
      <aside class="settings-drawer" role="dialog" aria-modal="true" aria-label="Paramètres">
        <div class="card-head">
          <div>
            <p class="eyebrow">Paramètres</p>
            <h2>Sources et pondérations</h2>
          </div>
          <button type="button" class="icon-button" data-action="close-settings" aria-label="Fermer">${icon("check")}</button>
        </div>
        <p class="small-text"><strong>Athlete OS version ${APP_VERSION}</strong> · journal par date, coach à signaux multi-jours, saisie des séances, sauvegarde JSON, thème sombre premium.</p>
        <p class="small-text">Les pondérations sont séparées dans le code pour pouvoir être ajustées sans changer les composants.</p>
        <div class="weight-list">
          ${readinessWeights
            .map(
              (item) => `
                <div class="weight-row">
                  <span>${escapeHtml(item.label)}</span>
                  <strong>${item.weight} %</strong>
                </div>
              `
            )
            .join("")}
        </div>
        <div class="notice">
          <strong>Données de l’application</strong>
          <p>Mode actuel : ${state.dataMode === "demo" ? "démo fictive" : "zéro donnée réelle"}. Tu peux effacer toutes les saisies locales ou recharger l’exemple visuel.</p>
          <div class="button-row">
            <button type="button" class="secondary-button" data-action="reset-blank">${icon("check")}Repartir de zéro</button>
            <button type="button" class="primary-button" data-action="load-demo">${icon("play")}Charger la démo</button>
          </div>
          ${
            state.dataMode === "demo"
              ? `<div class="button-row" style="margin-top:10px">
                  <button type="button" class="secondary-button" data-action="simulate-fatigue">${icon("alert")}Simuler une semaine difficile</button>
                </div>
                <p class="small-text">Dégrade les 4 derniers jours du journal fictif (readiness, fatigue, douleurs, RPE) pour voir les signaux du coach et la proposition de deload.</p>`
              : ""
          }
        </div>
        <div class="notice">
          <strong>Sauvegarde de tes données</strong>
          <p>Tout est stocké localement dans ce navigateur (${Object.keys(state.journal).length} jour(s) de journal, ${state.decisions.length} décision(s)). Exporte régulièrement une sauvegarde : c'est ta seule protection si l'app ou les données Safari sont supprimées.</p>
          <div class="button-row">
            <button type="button" class="primary-button" data-action="export-data">${icon("chart")}Exporter la sauvegarde</button>
            <label class="secondary-button file-button">
              ${icon("play")}Restaurer
              <input type="file" accept=".json,application/json" data-import="backup" />
            </label>
          </div>
        </div>
        ${renderImportPanel()}
        <div class="notice">
          <strong>Architecture prévue</strong>
          <p>Garmin, Hevy et Apple Santé sont modélisés comme sources. La V1 reste locale, avec états disponibles, partiels, anciens, absents, déconnectés et erreur de synchronisation.</p>
        </div>
      </aside>
    `;
  }

  function render() {
    document.body.classList.toggle("light", state.theme === "light");
    updateDocumentChrome();
    const page = pageCopy[state.activeTab] || pageCopy.today;
    app.innerHTML = `
      <div class="layout">
        ${renderSidebar()}
        <main class="main">
          <header class="topbar">
            <div>
              <h1>${escapeHtml(page.title)}</h1>
              <p>${escapeHtml(page.subtitle)}</p>
            </div>
            <div class="top-actions">
              <button type="button" class="icon-button" data-action="toggle-theme" aria-label="Changer de theme">${icon(state.theme === "dark" ? "sun" : "moon")}</button>
              <button type="button" class="icon-button" data-action="toggle-settings" aria-label="Paramètres">${icon("settings")}</button>
            </div>
          </header>
          <div class="content">${renderContent()}</div>
        </main>
        <nav class="mobile-nav" aria-label="Navigation mobile">${renderNav("mobile")}</nav>
        ${renderSettings()}
      </div>
    `;
    app.onclick = handleClick;
    app.onchange = handleChange;
    app.oninput = handleInput;
    app.onsubmit = handleSubmit;
    requestAnimationFrame(() => {
      const messages = document.getElementById("messages");
      if (messages) messages.scrollTop = messages.scrollHeight;
    });
    maybeAnimateDonuts();
  }

  let lastViewSignature = "";

  function maybeAnimateDonuts() {
    const signature = `${state.activeTab}:${state.activeTodayView}:${state.dataMode}`;
    if (signature === lastViewSignature) return;
    lastViewSignature = signature;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
    document.querySelectorAll(".donut").forEach((donut) => {
      const target = donut.style.getPropertyValue("--score");
      if (!target) return;
      donut.style.setProperty("--score", "0");
      requestAnimationFrame(() => requestAnimationFrame(() => donut.style.setProperty("--score", target)));
    });
  }

  function handleClick(event) {
    const todayViewButton = event.target.closest("[data-today-view]");
    if (todayViewButton) {
      state.activeTodayView = todayViewButton.dataset.todayView;
      persist();
      render();
      return;
    }

    const tabButton = event.target.closest("[data-tab]");
    if (tabButton) {
      state.activeTab = tabButton.dataset.tab;
      state.settingsOpen = false;
      persist();
      render();
      return;
    }

    const segment = event.target.closest("[data-segment-scope]");
    if (segment) {
      const scope = segment.dataset.segmentScope;
      const key = segment.dataset.segmentKey;
      scopeTarget(scope)[key] = segment.dataset.segmentValue;
      markScopeTouched(scope);
      persist();
      render();
      return;
    }

    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;
    const action = actionButton.dataset.action;

    if (action === "toggle-theme") {
      state.theme = state.theme === "dark" ? "light" : "dark";
    }
    if (action === "toggle-settings") {
      state.settingsOpen = !state.settingsOpen;
    }
    if (action === "reset-blank") {
      if (window.confirm("Effacer toutes les données locales Athlete OS et repartir de zéro ?")) {
        resetToBlank();
      }
    }
    if (action === "load-demo") {
      const theme = state.theme;
      const activeTab = state.activeTab;
      state = createDemoState({ theme, activeTab });
    }
    if (action === "close-settings") {
      state.settingsOpen = false;
    }
    if (action === "start-workout") {
      day().workoutStarted = true;
      addCoachMessage("user", "Je démarre la séance.");
      addCoachMessage("coach", "Parfait. Garde le RPE cible, filme une série lourde si possible, et stoppe si une douleur augmente.");
    }
    if (action === "request-adaptation") {
      day().adaptationPending = true;
    }
    if (action === "confirm-adaptation") {
      day().adaptationPending = false;
      day().adaptationConfirmed = true;
      logDecision(
        "adaptation",
        "Séance adaptée : volume réduit, repos allongé",
        "Adaptation proposée par le coach et confirmée par l'athlète",
        "Readiness du jour, check-in, charge récente",
        calculateReadiness().confidence
      );
      addCoachMessage("coach", "Adaptation confirmee : volume legerement reduit, repos allonge, aucune serie a l'echec aujourd'hui.");
    }
    if (action === "cancel-adaptation") {
      day().adaptationPending = false;
    }
    if (action === "accept-deload") {
      const proposal = deloadProposal(computeCoachSignals());
      state.deload.startedAt = dateKey();
      state.deload.activeUntil = keyOffset(-6);
      state.deload.declinedAt = null;
      logDecision(
        "deload",
        "Deload déclenché pour 7 jours",
        proposal ? proposal.reason : "Plusieurs signaux de fatigue concordants sur plusieurs jours",
        "Readiness 10 j, fatigue, douleurs, RPE, motivation, adhérence (journal)",
        proposal ? proposal.confidence : "Moyen"
      );
      addCoachMessage(
        "coach",
        "Deload validé : 7 jours à volume réduit (-40 %), RPE ≤ 6, aucune série à l'échec. On réévalue la fraîcheur en fin de semaine."
      );
    }
    if (action === "decline-deload") {
      const proposal = deloadProposal(computeCoachSignals());
      state.deload.declinedAt = dateKey();
      logDecision(
        "deload-refuse",
        "Deload proposé, reporté par l'athlète",
        proposal ? proposal.reason : "Signaux concordants, décision reportée",
        "Readiness 10 j, fatigue, douleurs, RPE, motivation, adhérence (journal)",
        "Moyen"
      );
      addCoachMessage(
        "coach",
        "Compris, deload reporté. Je garde les signaux sous surveillance : si la tendance ne s'inverse pas d'ici quelques jours, je te le reproposerai."
      );
    }
    if (action === "end-deload") {
      state.deload.activeUntil = keyOffset(1);
      logDecision(
        "deload-fin",
        "Deload terminé manuellement",
        "Fraîcheur jugée revenue avant la fin des 7 jours",
        "Ressenti de l'athlète, readiness récent",
        "Moyen"
      );
      addCoachMessage("coach", "Deload terminé. Reprise progressive : première séance à RPE 7 maximum, puis retour au plan du bloc.");
    }
    if (action === "quick-chat") {
      const prompt = actionButton.dataset.prompt;
      addCoachMessage("user", prompt);
      addCoachMessage("coach", generateCoachReply(prompt));
    }
    if (action === "simulate-fatigue") {
      for (let i = 0; i < 4; i++) {
        const entry = day(keyOffset(i));
        entry.readinessScore = clamp(Math.round((entry.readinessScore ?? 75) - 17), 30, 100);
        entry.morning = {
          ...entry.morning,
          completed: true,
          fatigue: i % 2 ? 5 : 4,
          motivation: 2,
          pain: i % 2 ? "moderee" : "legere",
          sleepQuality: "mauvaise",
          muscleQuality: "lourde",
        };
        entry.evening = {
          ...entry.evening,
          touched: true,
          completion: i === 3 ? "partial" : entry.evening.completion === "rest" ? "rest" : "partial",
          rpe: 9,
          pain: i % 2 ? "moderee" : "aucune",
          satisfaction: 2,
        };
      }
      state.deload = { activeUntil: null, startedAt: null, declinedAt: null };
      state.settingsOpen = false;
      state.activeTab = "today";
      state.activeTodayView = "summary";
      addCoachMessage(
        "coach",
        "Semaine difficile simulée sur le journal fictif : regarde les signaux du bloc et la proposition de deload sur l'écran Aujourd'hui."
      );
    }
    if (action === "draft-mode") {
      harvestDraft();
      state.workoutDraft.mode = actionButton.dataset.mode === "course" ? "course" : "muscu";
    }
    if (action === "draft-run-kind") {
      harvestDraft();
      state.workoutDraft.course.kind = actionButton.dataset.kind;
    }
    if (action === "add-exercise-row") {
      harvestDraft();
      state.workoutDraft.exercises.push({ name: "", weight: "", reps: "", sets: "", rpe: "" });
    }
    if (action === "remove-exercise-row") {
      harvestDraft();
      state.workoutDraft.exercises.splice(Number(actionButton.dataset.index), 1);
      if (!state.workoutDraft.exercises.length) {
        state.workoutDraft.exercises.push({ name: "", weight: "", reps: "", sets: "", rpe: "" });
      }
    }
    if (action === "save-workout-muscu") {
      harvestDraft();
      const exercises = state.workoutDraft.exercises
        .map((exercise) => ({
          name: String(exercise.name || "").trim(),
          weight: Number(exercise.weight),
          reps: Number(exercise.reps),
          sets: Number(exercise.sets) || 1,
          rpe: exercise.rpe === "" ? "" : Number(exercise.rpe),
        }))
        .filter((exercise) => exercise.name && Number.isFinite(exercise.weight) && exercise.weight >= 0 && exercise.reps > 0);
      if (exercises.length) {
        day().workouts.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "muscu",
          exercises,
        });
        state.workoutDraft.exercises = [{ name: "", weight: "", reps: "", sets: "", rpe: "" }];
        addCoachMessage(
          "coach",
          `Séance enregistrée (${exercises.length} exercice${exercises.length > 1 ? "s" : ""}). L'onglet Performances est à jour — pense au bilan du soir.`
        );
      } else {
        addCoachMessage("coach", "Il me faut au moins un exercice avec un nom, une charge et des répétitions pour enregistrer la séance.");
      }
    }
    if (action === "save-workout-course") {
      harvestDraft();
      const course = state.workoutDraft.course;
      const km = Number(course.km);
      const duration = Number(course.duration);
      if (Number.isFinite(km) && km > 0 && Number.isFinite(duration) && duration > 0) {
        day().workouts.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "course",
          km,
          duration,
          hr: course.hr === "" ? "" : Number(course.hr),
          kind: course.kind || "zone2",
        });
        state.workoutDraft.course = { km: "", duration: "", hr: "", kind: course.kind || "zone2" };
        addCoachMessage("coach", `Course enregistrée : ${String(km).replace(".", ",")} km en ${duration} min (${formatPace(duration / km)}).`);
      } else {
        addCoachMessage("coach", "Il me faut au moins la distance et la durée pour enregistrer la course.");
      }
    }
    if (action === "delete-workout") {
      const id = actionButton.dataset.id;
      day().workouts = (day().workouts || []).filter((workout) => workout.id !== id);
    }
    if (action === "export-data") {
      exportBackup();
    }
    if (action === "start-block-now") {
      state.program.startDate = mondayOfWeek();
      logDecision(
        "bloc",
        "Bloc 1 démarré cette semaine",
        "Départ avancé à la demande de l'athlète (initialement prévu le 20 juillet)",
        "Décision de l'athlète",
        "Eleve"
      );
      addCoachMessage(
        "coach",
        `Bloc 1 lancé : la semaine 1 court à partir du ${formatFrDate(state.program.startDate)}. Premières séances à RPE 7 : on calibre les charges, pas de record cette semaine.`
      );
    }

    persist();
    render();
  }

  function exportBackup() {
    const payload = {
      app: "athlete-os",
      version: 3,
      exportedAt: new Date().toISOString(),
      state,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `athlete-os-sauvegarde-${dateKey()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    addCoachMessage(
      "coach",
      `Sauvegarde exportée (${Object.keys(state.journal).length} jour(s) de journal). Sur iPhone, enregistre-la dans Fichiers ou iCloud Drive.`
    );
  }

  async function importBackupFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // Accepte le format enveloppé (export v3.3+) ou un état brut.
      const candidate = parsed?.app === "athlete-os" && parsed.state ? parsed.state : parsed;
      if (!candidate || typeof candidate !== "object" || typeof candidate.journal !== "object") {
        throw new Error("Ce fichier ne ressemble pas à une sauvegarde Athlete OS.");
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(candidate));
      state = loadState();
      state.settingsOpen = false;
      addCoachMessage(
        "coach",
        `Sauvegarde restaurée : ${Object.keys(state.journal).length} jour(s) de journal, ${state.decisions.length} décision(s). Vérifie l'onglet Historique.`
      );
      persist();
      render();
    } catch (error) {
      addCoachMessage("coach", `Restauration impossible : ${error.message || "fichier illisible"}. Rien n'a été modifié.`);
      persist();
      render();
    }
  }

  function harvestDraft() {
    document.querySelectorAll("[data-draft-ex]").forEach((input) => {
      const index = Number(input.dataset.draftEx);
      const field = input.dataset.field;
      if (state.workoutDraft.exercises[index]) state.workoutDraft.exercises[index][field] = input.value;
    });
    document.querySelectorAll("[data-draft-course]").forEach((input) => {
      state.workoutDraft.course[input.dataset.draftCourse] = input.value;
    });
  }

  function handleInput(event) {
    const target = event.target;
    if (!target.dataset.scope || !target.dataset.key) return;
    if (target.type !== "range") return;
    updateStateFromField(target);
    persist();
    render();
  }

  function handleChange(event) {
    const target = event.target;
    if (target.dataset.import === "apple-health") {
      importAppleHealthFile(target.files?.[0]);
      return;
    }
    if (target.dataset.import === "backup") {
      importBackupFile(target.files?.[0]);
      return;
    }
    if (!target.dataset.scope || !target.dataset.key) return;
    updateStateFromField(target);
    persist();
    render();
  }

  function markScopeTouched(scope) {
    if (scope === "morning") morning().completed = true;
    if (scope === "evening") evening().touched = true;
    if (scope === "nutrition") nutrition().touched = true;
  }

  function updateStateFromField(target) {
    const scope = target.dataset.scope;
    const key = target.dataset.key;
    let value = target.value;
    if (target.type === "range" || target.type === "number") {
      value = target.value === "" ? "" : Number(target.value);
      if (value !== "" && !Number.isFinite(value)) value = "";
    }
    scopeTarget(scope)[key] = value;
    markScopeTouched(scope);
  }

  function handleSubmit(event) {
    if (!event.target.matches("[data-chat-form]")) return;
    event.preventDefault();
    const input = event.target.elements.message;
    const text = input.value.trim();
    if (!text) return;
    addCoachMessage("user", text);
    addCoachMessage("coach", generateCoachReply(text));
    input.value = "";
    persist();
    render();
  }

  function addCoachMessage(role, text) {
    state.chat = [...state.chat, { role, text }].slice(-12);
  }

  function generateCoachReply(prompt) {
    const readiness = calculateReadiness();
    const decision = makeCoachDecision(readiness);
    const lower = prompt.toLowerCase();

    if (!hasTrainingData()) {
      if (lower.includes("alimentation")) {
        return "Je peux suivre tes habitudes alimentaires simples, mais aucune estimation calorique ne sera inventée. Commence par renseigner repas, protéines, faim, énergie et digestion.";
      }
      if (lower.includes("progression") || lower.includes("stagnation")) {
        const real = realProgressReply();
        if (real) return real;
      }
      if ((lower.includes("semaine") || lower.includes("bloc")) && programStartDate()) {
        if (programUpcoming()) {
          return `Bloc 1 programmé : départ le ${formatFrDate(programStartDate())} (J-${daysUntilBlockStart()}). D'ici là : check-ins quotidiens, tour de taille de référence, et envoie ton export Hevy au coach pour calibrer les charges de départ.`;
        }
        if (programActive()) {
          const week = programWeek();
          const stats = programStats();
          const weekAdherence = adherenceStats(7);
          return `Bloc 1, semaine ${week}/${BLOC1.totalWeeks} — phase « ${programPhase(week)?.label || ""} ». ${stats.done} séance(s) conforme(s) sur ${stats.planned} prévue(s) depuis le départ${
            weekAdherence.pct !== null ? `, adhérence 7 jours ${weekAdherence.pct} %` : ""
          }. Objectif de la semaine : ${programPhase(week)?.weeklyGoal || "exécution propre"}`;
        }
      }
      if (lower.includes("semaine") || lower.includes("bloc") || lower.includes("progression") || lower.includes("stagnation")) {
        return "Je n’ai pas encore assez de données pour analyser un bloc, une progression ou une stagnation. Enregistre tes séances dans le journal ou importe ton historique.";
      }
      return `${decision.label}. L’app est vide pour l’instant : complète ton check-in, puis ajoute tes données réelles pour obtenir une analyse fiable.`;
    }

    if (lower.includes("recuperation") || lower.includes("récupération") || lower.includes("score")) {
      return `Readiness ${readiness.score}/100 : ${readiness.category} (${readiness.trend.toLowerCase()}). Les facteurs principaux sont ${readiness.factors
        .slice(0, 3)
        .map((factor) => `${factor.label.toLowerCase()} ${factor.status.toLowerCase()}`)
        .join(", ")}. Confiance ${readiness.confidence.toLowerCase()}.`;
    }
    if (lower.includes("poids") || lower.includes("historique")) {
      const weight = weightSummary();
      const week = adherenceStats(7);
      const parts = [];
      if (weight.avg7 !== null) {
        parts.push(
          `Poids moyen 7 jours : ${formatKg(weight.avg7)}${
            weight.delta !== null ? ` (${weight.delta > 0 ? "+" : ""}${String(weight.delta).replace(".", ",")} kg vs semaine précédente)` : ""
          }`
        );
      } else {
        parts.push("Aucun poids renseigné sur 7 jours : ajoute-le au check-in du matin");
      }
      parts.push(week.pct !== null ? `adhérence 7 jours ${week.pct} %` : "aucun bilan du soir récent");
      return `${parts.join(", ")}. Je compare toujours à ta propre tendance, jamais à la population générale.`;
    }
    if (lower.includes("adapte") || lower.includes("seance") || lower.includes("séance")) {
      return `${decision.label}. Ajustement recommandé : ${decision.adjustment}. La modification importante doit rester confirmée par toi avant exécution.`;
    }
    if (lower.includes("deload")) {
      if (isDeloadActive()) {
        return `Deload en cours, ${deloadDaysLeft()} jour(s) restant(s) : volume -40 %, RPE ≤ 6, aucune série à l'échec. Priorité au sommeil.`;
      }
      const proposal = deloadProposal(computeCoachSignals());
      if (proposal) {
        return `Un deload me semble justifié : ${proposal.reason} Tu peux le lancer depuis la carte « Deload recommandé » sur l'écran Aujourd'hui.`;
      }
      const { signals, ready } = computeCoachSignals();
      return ready
        ? `Pas de deload nécessaire pour l'instant : ${signals.length ? `${signals.length} signal(aux) sous surveillance mais pas de concordance suffisante` : "aucun signal de surcharge sur tes tendances multi-jours"}. Je le proposerai quand au moins trois signaux concorderont.`
        : "Il me faut au moins quelques jours de check-ins et de bilans pour évaluer un besoin de deload.";
    }
    if (lower.includes("progression") || lower.includes("stagnation")) {
      const { signals, ready } = computeCoachSignals();
      const overload = ready && signals.length ? ` Côté fatigue, je surveille : ${signals.map((signal) => signal.label.toLowerCase()).join(", ")}.` : "";
      const real = realProgressReply();
      if (real) return `${real}${overload}`;
      return `Progression positive sur développé couché, tractions et rowing. Le développé militaire est stable sur trois séances : je propose variation de reps, tempo et RPE maîtrisé avant d’ajouter du volume.${overload}`;
    }
    if (lower.includes("alimentation")) {
      return `Nutrition : ${nutrition().proteinMeals}/${nutrition().meals} repas protéinés, faim ${labelFor("hunger", nutrition().hunger).toLowerCase()}, énergie ${labelFor("dayEnergy", nutrition().dayEnergy).toLowerCase()}. Pas d’estimation calorique précise avec ces données.`;
    }
    if (lower.includes("semaine") || lower.includes("bloc")) {
      const week = adherenceStats(7);
      return `Bloc semaine ${demo.block.week}/${demo.block.totalWeeks}, completion ${demo.block.completion} %. Adhérence réelle 7 jours : ${
        week.pct !== null ? `${week.pct} % (${week.denom} séance(s) évaluée(s))` : "aucun bilan complété"
      }. Priorite : regularite, RPE stable et deload potentiel semaine ${demo.block.deloadWeek}.`;
    }
    return `${decision.label}. Je base la recommandation sur tes tendances personnelles, pas sur un indicateur isolé. Priorité : exécution propre, douleur surveillée, bilan du soir complété.`;
  }

  initPlatform();
  render();
  persist();
})();
