(function () {
  const APP_VERSION = "7.5.0";
  const STORAGE_KEY = "athlete-os-v3";
  const SAFE_KEY = "athlete-os-v3-safe"; // miroir de secours, jamais écrasé par du vide
  const LEGACY_KEY = "athlete-os-v2";

  const tabs = [
    { id: "today", label: "Aujourd’hui", icon: "activity" },
    { id: "program", label: "Programme", icon: "calendar" },
    { id: "performance", label: "Performances", icon: "chart" },
    { id: "health", label: "Santé", icon: "heart" },
    { id: "export", label: "Export", icon: "chart" },
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
    export: {
      title: "Export & suivi",
      subtitle: "Briefing à transmettre au coach, historique des décisions et sauvegarde des données.",
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
    waist: null, // tour de taille (cm), mesure hebdomadaire
    workouts: [],
    activities: [], // activités importées depuis Garmin (marches, courses, muscu)
    readinessScore: null,
    readinessConfidence: "",
    decisionLabel: "",
    decisionTone: "",
    workoutStarted: false,
    workoutStartedAt: null, // horodatage de début (séance en cours)
    exercisesDone: [], // noms des exercices cochés pendant la séance
    microDone: [], // v6.0.0 : identifiants des micro-sessions faites (mobilité, étirements)
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
      calfPain: 0, // v6.1.0 : douleur mollet 0-10 — la règle d'arrêt du bloc est > 3/10
      satisfaction: 3,
      reason: "",
      comment: "",
    },
    calfTest: {
      // v6.1.0 : résultats des tests mollet du lundi (pilotent les paliers pliométrie)
      done: false,
      raisesReps: "", // élévations unijambe, amplitude complète (objectif 25-30 sans douleur)
      raisesPain: false,
      hopsOk: null, // 15 sautillements unipodaux sans douleur : true/false
      note: "",
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
    lastSavedAt: null,
    activeTab: "today",
    activeTodayView: "summary",
    theme: "dark",
    uiVersion: 2,
    settingsOpen: false,
    movePickerOpen: false,
    openExercise: null,
    openExerciseDetail: "",
    openMetric: null,
    sessionDraft: null, // v7.0.0 : brouillon de séance pré-rempli depuis la prescription
    runDraft: null, // v7.0.0 : saisie de course par écart
    restTimer: null, // v7.0.0 : minuteur de repos { name, endsAt }
    notFullOpen: "", // v7.1.0 : jour dont la version allégée est dépliée
    openMicro: "", // v7.3.0 : micro-session dont le détail est déplié
    manualLogOpen: false, // v7.4.0 : formulaire libre déplié malgré une prescription
    calWeekOffset: 0, // v7.5.0 : semaine affichée dans le calendrier (0 = celle en cours)
    expandedProgramDay: null,
    journal: {},
    program: {
      blockId: "bloc-1",
      startDate: "2026-07-27",
      // Déplacements de séances : { "YYYY-MM-DD": weekdayTemplate } — la date affiche la séance d'un autre jour type.
      swaps: {},
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
          "Salut. Pose-moi une question sur ta séance, ta récupération, ton poids ou ta semaine — je réponds à partir de ce que tu as enregistré. Plus tu remplis, plus je suis précis.",
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
      garmin: null,
      summary: null, // v7.2.0 : bilan du dernier import (trouvé / manquant)
      error: "",
      progress: 0,
    },
    weather: null, // { lat, lon, place, day, fetchedAt, hours: [...] }
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
      activities: Array.isArray(entry.activities) ? entry.activities : [],
      exercisesDone: Array.isArray(entry.exercisesDone) ? entry.exercisesDone : [],
      microDone: Array.isArray(entry.microDone) ? entry.microDone : [],
      morning: { ...base.morning, ...(entry.morning || {}) },
      evening: { ...base.evening, ...(entry.evening || {}) },
      calfTest: { ...base.calfTest, ...(entry.calfTest || {}) },
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
    if (scope === "calfTest") return day().calfTest;
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

  const app = document.getElementById("app");
  // Combien de jours de journal contient un état brut ? Sert à comparer
  // la clé principale et le miroir de secours au chargement.
  function journalDayCount(obj) {
    try {
      return Object.keys(obj?.journal || {}).filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key)).length;
    } catch (error) {
      return 0;
    }
  }

  // Un état brut porte-t-il des données que l'athlète a saisies ?
  function rawStateHasData(obj) {
    if (!obj || typeof obj !== "object") return false;
    if (obj.imports?.health || obj.imports?.garmin) return true;
    return Object.values(obj.journal || {}).some((entry) => {
      if (!entry) return false;
      return (
        entry.morning?.completed ||
        entry.evening?.touched ||
        (entry.workouts || []).length ||
        (entry.activities || []).length ||
        Number(entry.weight) > 0 ||
        Number(entry.waist) > 0
      );
    });
  }

  let state = loadState();

  function loadState(fromSafe = false) {
    let rawMain = null;
    try {
      let saved = fromSafe
        ? JSON.parse(localStorage.getItem(SAFE_KEY) || "null")
        : JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      rawMain = saved;
      if (fromSafe && !saved) return null;

      // Filet de sécurité : si la clé principale a été vidée ou tronquée par un
      // incident (mise à jour, éviction partielle), mais que le miroir de secours
      // contient davantage de journal, on récupère le miroir.
      if (!fromSafe) {
        try {
          const safe = JSON.parse(localStorage.getItem(SAFE_KEY) || "null");
          if (safe && journalDayCount(safe) > journalDayCount(saved)) {
            saved = safe;
          }
        } catch (safeError) {
          // miroir illisible : on continue avec la clé principale
        }
      }

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
        dataMode: saved.dataMode === "demo" ? "blank" : saved.dataMode || "blank",
        // v5.8.0 : l'onglet Coach (chat local) est remplacé par Export.
        activeTab: saved.activeTab === "coach" ? "export" : saved.activeTab || "today",
        journal,
        decisions: Array.isArray(saved.decisions) ? saved.decisions.slice(0, 40) : [],
        deload: { ...structuredClone(defaultState.deload), ...(saved.deload || {}) },
        program: (() => {
          const merged = { ...structuredClone(defaultState.program), ...(saved.program || {}) };
          // Programme v2 (23/07/2026) : le départ réel de S1 est le lundi 27/07 — migration de l'ancienne date.
          if (merged.startDate === "2026-07-20") merged.startDate = "2026-07-27";
          return merged;
        })(),
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
        movePickerOpen: false,
        openExercise: null,
        openExerciseDetail: "",
        // Refonte visuelle : le sombre devient le thème par défaut, une seule fois.
        theme: saved.uiVersion >= 2 ? saved.theme || "dark" : "dark",
        uiVersion: 2,
      };
    } catch (error) {
      // Le traitement de la clé principale a échoué (structure inattendue après
      // une mise à jour, par exemple). Plutôt que de repartir vide — ce qui
      // écraserait ensuite les données au premier enregistrement — on tente le
      // miroir de secours, puis on met de côté le brut illisible pour diagnostic.
      if (!fromSafe) {
        try {
          const recovered = loadState(true);
          if (recovered && rawStateHasData(recovered)) return recovered;
        } catch (safeError) {
          // rien à récupérer
        }
      }
      try {
        if (rawMain) localStorage.setItem("athlete-os-v3-corrupt", JSON.stringify(rawMain));
      } catch (writeError) {
        // pas grave
      }
      return fromSafe ? null : structuredClone(defaultState);
    }
  }

  function persist() {
    try {
      const payload = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY, payload);
      // Miroir de secours : mis à jour uniquement quand l'état porte des données,
      // pour ne jamais remplacer un bon miroir par du vide.
      if (rawStateHasData(state)) {
        localStorage.setItem(SAFE_KEY, payload);
      }
    } catch (error) {
      // Stockage plein ou indisponible : l'app continue en mémoire.
    }
  }

  // ---- Auto-save (v4.5) ----
  // Avant : les champs texte n'étaient sauvegardés qu'au blur (événement "change").
  // Une saisie en cours était perdue si l'app passait en arrière-plan ou était fermée.
  // Désormais : sauvegarde debouncée à la frappe + vidage forcé quand l'app se cache.

  let saveTimer = null;

  function persistNow() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    state.lastSavedAt = new Date().toISOString();
    persist();
    refreshSaveBadges();
  }

  function persistSoon(delay = 600) {
    if (saveTimer) clearTimeout(saveTimer);
    setSaveBadgesPending();
    saveTimer = setTimeout(persistNow, delay);
  }

  function saveBadgeLabel() {
    const stamp = state.lastSavedAt ? new Date(state.lastSavedAt) : null;
    if (!stamp || Number.isNaN(stamp.getTime())) return "Sauvegarde auto";
    const hh = String(stamp.getHours()).padStart(2, "0");
    const mm = String(stamp.getMinutes()).padStart(2, "0");
    return `Enregistré à ${hh}:${mm}`;
  }

  function SaveBadge() {
    return `<span class="badge good save-badge" data-save-badge>${escapeHtml(saveBadgeLabel())}</span>`;
  }

  function refreshSaveBadges() {
    document.querySelectorAll("[data-save-badge]").forEach((el) => {
      el.textContent = saveBadgeLabel();
      el.classList.remove("saving");
      el.classList.add("good");
    });
  }

  function setSaveBadgesPending() {
    document.querySelectorAll("[data-save-badge]").forEach((el) => {
      el.textContent = "Enregistrement…";
      el.classList.add("saving");
      el.classList.remove("good");
    });
  }

  // Récupère la valeur de TOUS les champs affichés (y compris celui qui a encore le focus)
  // et sauvegarde immédiatement. Appelé quand l'app se cache / se ferme.
  function flushInputs({ force = false } = {}) {
    let changed = false;

    document.querySelectorAll("[data-scope][data-key]").forEach((input) => {
      const scope = input.dataset.scope;
      const key = input.dataset.key;
      const target = scopeTarget(scope);
      if (!target) return;
      let value = input.value;
      if (input.type === "checkbox") {
        // v6.1.0 : input.value d'une case vaut toujours "on" — comparer l'état coché,
        // sinon le flush croit à un changement et marque le scope comme touché.
        value = input.checked;
      } else if (input.type === "range" || input.type === "number") {
        value = input.value === "" ? "" : Number(input.value);
        if (value !== "" && !Number.isFinite(value)) value = "";
      }
      if (String(target[key] ?? "") === String(value ?? "")) return;
      updateStateFromField(input);
      changed = true;
    });

    document.querySelectorAll("[data-presc]").forEach((input) => {
      const draft = state.sessionDraft;
      const row = draft?.rows?.[input.dataset.presc];
      if (!row || String(row[input.dataset.field] ?? "") === String(input.value ?? "")) return;
      row[input.dataset.field] = input.value;
      changed = true;
    });

    document.querySelectorAll("[data-run-draft]").forEach((input) => {
      if (!state.runDraft || String(state.runDraft[input.dataset.runDraft] ?? "") === String(input.value ?? "")) return;
      state.runDraft[input.dataset.runDraft] = input.value;
      changed = true;
    });

    document.querySelectorAll("[data-draft-ex]").forEach((input) => {
      const exercise = state.workoutDraft.exercises[Number(input.dataset.draftEx)];
      const field = input.dataset.field;
      if (!exercise || exercise[field] === input.value) return;
      exercise[field] = input.value;
      changed = true;
    });

    document.querySelectorAll("[data-draft-course]").forEach((input) => {
      const key = input.dataset.draftCourse;
      if (state.workoutDraft.course[key] === input.value) return;
      state.workoutDraft.course[key] = input.value;
      changed = true;
    });

    if (changed || force) persistNow();
    return changed;
  }

  // ---- Navigation directe vers ce qu'il reste à remplir (v4.6) ----
  // Tout indicateur qui signale un manque devient un raccourci : un appui amène
  // à la bonne vue, fait défiler jusqu'au bloc concerné et met le champ en évidence.

  let pendingFocus = null;

  function gotoTarget(spec, focusId) {
    const [tab, view] = String(spec || "").split(":");
    if (tab) state.activeTab = tab;
    if (view) state.activeTodayView = view;
    state.settingsOpen = false;
    state.movePickerOpen = false;
    pendingFocus = focusId || null;
    persistNow();
    render();
  }

  function applyPendingFocus() {
    if (!pendingFocus) return;
    const id = pendingFocus;
    pendingFocus = null;
    requestAnimationFrame(() => {
      const field = document.getElementById(id);
      if (!field) return;
      const wrapper = field.closest(".field") || field;
      // Centrer le champ plutôt que le haut de la carte : le sous-menu collant
      // recouvrait sinon le titre, et le champ visé finissait en bas d'écran.
      wrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      wrapper.classList.add("field-flash");
      setTimeout(() => wrapper.classList.remove("field-flash"), 1800);
      // Le clavier iOS ne s'ouvre que pour les champs de saisie, pas pour un curseur.
      if (field.type !== "range" && typeof field.focus === "function") {
        field.focus({ preventScroll: true });
      }
    });
  }

  // ---- Tour de taille : mesure hebdomadaire (v4.8) ----
  // Croisé avec le poids, c'est ce qui distingue une perte de gras d'une perte de muscle.

  function lastWaist(skipToday = false) {
    const keys = Object.keys(state.journal)
      .filter((key) => /^\d{4}-\d{2}-\d{2}$/.test(key))
      .sort()
      .reverse();
    const today = dateKey();
    for (const key of keys) {
      if (skipToday && key === today) continue;
      const value = Number(state.journal[key]?.waist);
      if (Number.isFinite(value) && value > 0) return { key, value };
    }
    return null;
  }

  function waistDue() {
    if (Number(day().waist) > 0) return false;
    const last = lastWaist();
    if (!last) return true; // aucune mesure de départ
    const days = Math.round((new Date(`${dateKey()}T12:00:00`) - new Date(`${last.key}T12:00:00`)) / 86400000);
    return days >= 7;
  }

  function waistTrendText() {
    const previous = lastWaist(true);
    const current = Number(day().waist) > 0 ? { key: dateKey(), value: Number(day().waist) } : lastWaist();
    if (!current) return "Aucune mesure encore. La première sert de point de départ : nombril, debout, expiration normale, sans serrer.";
    if (!previous || previous.key === current.key) {
      return `Dernière mesure : ${String(current.value).replace(".", ",")} cm le ${formatShortDate(current.key)}. Il en faut une deuxième pour lire une tendance.`;
    }
    const delta = Math.round((current.value - previous.value) * 10) / 10;
    const sign = delta > 0 ? "+" : "";
    return `${String(current.value).replace(".", ",")} cm le ${formatShortDate(current.key)} · ${sign}${String(delta).replace(".", ",")} cm depuis le ${formatShortDate(previous.key)}.`;
  }

  function missingItems() {
    const items = [];
    const session = programActive() ? programSessionFor() : null;
    const hasSession = Boolean(session) && session.kind !== "repos";
    const workouts = day().workouts || [];
    const hour = new Date().getHours();

    if (!morning().completed) {
      items.push({
        label: "Check-in du matin",
        detail: "Fatigue, énergie, douleurs — 20 secondes",
        view: "checkin",
        focus: "fatigue",
        tone: "watch",
      });
    }
    if (!(Number(day().weight) > 0)) {
      items.push({
        label: "Poids du jour",
        detail: "Facultatif, mais c'est lui qui construit la tendance",
        view: "checkin",
        focus: "weight",
        tone: "info",
      });
    }
    if (hasSession && !workouts.length && !daySessions().length) {
      items.push({
        label: "Séance non enregistrée",
        detail: session.title,
        view: "workout",
        focus: null,
        tone: "watch",
      });
    }
    if (!evening().touched && hour >= 17) {
      items.push({
        label: "Bilan du soir",
        detail: "Ce qui a vraiment été réalisé",
        view: "evening",
        focus: "completion",
        tone: "watch",
      });
    }
    if (waistDue()) {
      const last = lastWaist();
      items.push({
        label: "Tour de taille",
        detail: last ? `Dernière mesure ${last.value} cm le ${formatShortDate(last.key)}` : "Mesure hebdomadaire, 10 secondes",
        view: "checkin",
        focus: "waist",
        tone: "info",
      });
    }
    if (!hasImportedHealth() && !hasTrainingData()) {
      items.push({
        label: "Données Apple Santé",
        detail: "Sommeil, HRV, FC repos — import du fichier",
        view: "data",
        focus: null,
        tone: "info",
      });
    }
    return items;
  }

  // Badge cliquable : même rendu qu'un StatusBadge, mais il emmène au bon endroit.
  function GotoBadge(label, tone, view, focusId) {
    return `<button type="button" class="badge badge-link ${tone || ""}" data-goto="today:${view}"${
      focusId ? ` data-goto-focus="${focusId}"` : ""
    }>${escapeHtml(label)}</button>`;
  }

  function MissingCard() {
    const items = missingItems();
    if (!items.length) {
      return `
        <section class="card complete-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Journée complète</p>
              <h2>Rien à compléter</h2>
            </div>
            ${StatusBadge("À jour", "good")}
          </div>
          <p class="small-text">Check-in, séance et bilan sont renseignés. Le coach travaille avec des données complètes aujourd'hui.</p>
        </section>
      `;
    }
    return `
      <section class="card missing-card">
        <div class="card-head">
          <div>
            <p class="eyebrow">À compléter aujourd'hui</p>
            <h2>${items.length} élément${items.length > 1 ? "s" : ""} manquant${items.length > 1 ? "s" : ""}</h2>
            <p class="small-text">Appuie sur une ligne : elle t'amène directement au champ à remplir.</p>
          </div>
        </div>
        <div class="missing-list">
          ${items
            .map(
              (item) => `
              <button type="button" class="missing-row" data-goto="today:${item.view}"${
                item.focus ? ` data-goto-focus="${item.focus}"` : ""
              }>
                <span class="missing-dot ${item.tone}"></span>
                <span class="missing-text">
                  <strong>${escapeHtml(item.label)}</strong>
                  <span>${escapeHtml(item.detail)}</span>
                </span>
                <span class="missing-chevron" aria-hidden="true">›</span>
              </button>`
            )
            .join("")}
        </div>
      </section>
    `;
  }

  // Le mode démo a été retiré (v5.3) : l'app ne montre que des données réelles.
  function hasTrainingData() {
    return false;
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
    const weeklyMinutes = [0, 0, 0, 0, 0, 0, 0, 0];
    runs.forEach(({ offset, workout }) => {
      const bucket = Math.floor(offset / 7);
      if (bucket < 8) {
        weeklyKm[7 - bucket] += Number(workout.km) || 0;
        weeklyMinutes[7 - bucket] += Number(workout.duration) || 0;
      }
    });
    return {
      total: runs.length,
      kmWeek,
      minutesWeek: Math.round(durationWeek),
      sessionsWeek: week.length,
      avgPace: kmWeek > 0 && durationWeek > 0 ? formatPace(durationWeek / kmWeek) : "—",
      avgHr: hrValues.length ? Math.round(avgOf(hrValues)) : null,
      weeklyKm: weeklyKm.map((v) => Math.round(v * 10) / 10),
      weeklyMinutes: weeklyMinutes.map((v) => Math.round(v)),
    };
  }

  function hasRealPerformances() {
    return liftHistories().size > 0 || runningSummary().total > 0;
  }

  // L'app contient-elle quelque chose à analyser ? (check-in, séance, import, bilan)
  function hasAnyData() {
    return Object.values(state.journal || {}).some((entry) => {
      if (!entry) return false;
      if (entry.morning?.completed) return true;
      if (entry.evening?.touched) return true;
      if ((entry.workouts || []).length) return true;
      if ((entry.activities || []).length) return true;
      if (Number(entry.weight) > 0) return true;
      return false;
    }) || hasImportedHealth();
  }

  // ---- Bloc 1 : programme réel de l'athlète (v2 du 23/07/2026 — amorce 23-26/07, S1 le lundi 27/07) ----

  const BLOC1 = {
    id: "bloc-1",
    name: "Bloc 1 — Recomposition & Base",
    goal: "Maintenir le muscle en déficit léger, réduire le tour de taille, consolider la base aérobie et développer les qualités athlétiques (pliométrie par paliers) — sans réveiller le mollet.",
    totalWeeks: 10,
    deloadWeek: 6,
    amorceStart: "2026-07-23",
    guideUrl: "./guidebloc1.html",
    phases: [
      { from: 1, to: 2, label: "Prise de repères", weeklyGoal: "RPE 7 partout : calibrer les charges, filmer squat, couché et soulevé de terre. Pliométrie palier P0 en début de Haut A/B." },
      { from: 3, to: 5, label: "Accumulation", weeklyGoal: "RPE 8, double progression active. Pliométrie palier P1 si tests mollet validés. Lignes droites en fin de course 2 dès S4 si mollet muet." },
      { from: 6, to: 6, label: "Deload planifié", weeklyGoal: "Volume -40 %, RPE ≤ 6, courses 30 min faciles, pliométrie P0 réduite. La surcompensation se joue cette semaine." },
      { from: 7, to: 9, label: "Intensification", weeklyGoal: "Charges au plus haut, volume stable. Pliométrie palier P2. Fractionné doux optionnel si zéro alerte mollet." },
      { from: 10, to: 10, label: "Évaluation", weeklyGoal: "Top sets RPE 8 sur les 6 mouvements clés + 30 min de course à FC fixe + test saut vertical et sprint. Les résultats calibrent le Bloc 2." },
    ],
    // getDay() : 0 = dimanche, 1 = lundi...
    days: {
      1: {
        kind: "muscu",
        title: "Bas A — Force",
        focus: "Dominante squat · protocole mollet (debout)",
        duration: 60,
        durationExtended: 70,
        deloadDuration: 40,
        rpe: "7 à 8",
        exercises: [
          { name: "Squat", detail: "4 × 4-6 · RPE 7-8 · repos 3 min" },
          { name: "Presse ou fentes marchées", detail: "3 × 8-10 · RPE 7 · repos 2 min" },
          { name: "Leg curl", detail: "3 × 8-12 · RPE 8 · repos 90 s" },
          { name: "Mollets debout", detail: "3 × 10-12 · descente 3 s · repos 90 s · protocole mollet" },
          { name: "Gainage lesté", detail: "3 séries · repos 60 s" },
        ],
        extraExercise: { name: "Extension lombaire (banc à lombaires)", detail: "3 × 12 · RPE 7 · repos 90 s · dès S3" },
      },
      2: {
        kind: "muscu",
        title: "Haut A — Force",
        focus: "Pliométrie en début de séance, puis développé couché + tractions",
        duration: 70,
        durationExtended: 80,
        deloadDuration: 40,
        rpe: "7 à 8",
        plyo: true,
        exercises: [
          { name: "Développé couché", detail: "4 × 4-6 · RPE 7-8 · repos 3 min" },
          { name: "Tractions (lestées si > 8)", detail: "4 × 5-8 · RPE 8 · repos 2-3 min" },
          { name: "Développé militaire", detail: "3 × 6-8 · RPE 7,5 · repos 2 min" },
          { name: "Rowing haltère unilatéral", detail: "3 × 8-10 · RPE 8 · repos 90 s" },
          { name: "Face pull", detail: "3 × 12-15 · RPE 8 · repos 60 s" },
        ],
        extraExercise: { name: "Curl biceps barre EZ", detail: "3 × 10-12 · RPE 8 · repos 75 s · dès S3" },
      },
      3: {
        kind: "course",
        title: "Course 1 — Zone 2",
        focus: "Base aérobie stricte : conversation possible du début à la fin",
        duration: 40,
        rpe: "Zone 2",
        exercises: [
          { name: "Échauffement", detail: "5 min marche rapide + 5 min trot très lent" },
          { name: "Corps de séance", detail: "35-40 min zone 2 en S1, puis 40-45 min, allure conversationnelle" },
          { name: "Dès S7 (option)", detail: "Fractionné doux 6 × 2 min (récup 2 min trot) si zéro alerte mollet depuis le début du bloc" },
          { name: "Règle mollet", detail: "Douleur > 3/10 → stop, marche, et note-le au bilan du soir" },
        ],
      },
      4: {
        kind: "muscu",
        title: "Bas B — Hinge & unilatéral",
        focus: "Chaîne postérieure · protocole mollet (soléaire)",
        duration: 60,
        durationExtended: 70,
        deloadDuration: 40,
        rpe: "7 à 8",
        exercises: [
          { name: "Soulevé de terre roumain", detail: "4 × 6-8 · RPE 7 · repos 3 min" },
          { name: "Squat bulgare", detail: "3 × 8-10 / jambe · RPE 8 · repos 90 s" },
          { name: "Hip thrust", detail: "3 × 8-12 · RPE 8 · repos 2 min" },
          { name: "Mollets assis (soléaire)", detail: "3 × 12-15 · tempo contrôlé · repos 60 s · protocole mollet" },
          { name: "Gainage anti-rotation", detail: "3 séries (Pallof, portés) · repos 60 s" },
        ],
        extraExercise: { name: "Abduction de hanche (machine ou bande élastique)", detail: "3 × 15 / jambe · RPE 7 · repos 60 s · dès S3" },
      },
      5: {
        kind: "muscu",
        title: "Haut B — Hypertrophie",
        focus: "Pliométrie en début de séance, puis volume épaules, dos, bras",
        duration: 70,
        durationExtended: 80,
        deloadDuration: 40,
        rpe: "8",
        plyo: true,
        exercises: [
          { name: "Développé incliné haltères", detail: "4 × 8-10 · RPE 8 · repos 2 min" },
          { name: "Tirage vertical prise neutre", detail: "3 × 8-12 · RPE 8 · repos 90 s" },
          { name: "Élévations latérales", detail: "4 × 12-15 · RPE 8-9 · repos 60 s" },
          { name: "Rowing câble assis", detail: "3 × 10-12 · RPE 8 · repos 90 s" },
          { name: "Curl incliné + triceps corde", detail: "superset 3 × 10-12 · repos 75 s" },
        ],
        extraExercise: { name: "Élévations Y (banc incliné)", detail: "3 × 12-15 · RPE 7-8 · repos 60 s · dès S3" },
      },
      6: {
        kind: "course",
        title: "Course 2 — Zone 2 longue",
        focus: "Volume aérobie · lignes droites en fin de séance dès S4 (si mollet OK)",
        duration: 50,
        rpe: "Zone 2",
        exercises: [
          { name: "Échauffement", detail: "5 min marche rapide + 5 min trot très lent" },
          { name: "Corps de séance", detail: "45-50 min zone 2 en S1, puis 50-60 min" },
          { name: "Dès S4", detail: "6 lignes droites de 15-20 s à ~85 %, récup marche 45 s (si zéro alerte mollet)" },
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

  // Pliométrie par paliers — mardi & vendredi, en DÉBUT de séance (travail nerveux : à faire frais).
  // Volume compté en contacts au sol. Passage de palier : tests mollet du lundi validés + zéro alerte.
  const PLYO = {
    p0: [
      { name: "Pliométrie · A-skip", detail: "3 × 10 m · palier P0 (~40 contacts) · rythme avant vitesse" },
      { name: "Pliométrie · Ankle bounces (pogo)", detail: "3 × 10 · faible amplitude, contacts brefs et élastiques · palier P0" },
      { name: "Pliométrie · Médecine-ball rotation", detail: "3 × 6 / côté · explosif, la puissance part des hanches · palier P0" },
    ],
    p1: [
      { name: "Pliométrie · Sautillements unipodaux", detail: "3 × 8 / jambe · palier P1 (~50-60 contacts) · stop si douleur mollet > 3/10" },
      { name: "Pliométrie · Bondissements latéraux", detail: "3 × 6 / côté · amplitude faible → moyenne · palier P1" },
      { name: "Pliométrie · Départs sprint arrêtés", detail: "4 × 10-15 m à ~80 %, jamais au max · palier P1" },
      { name: "Pliométrie · Médecine-ball rotation", detail: "2 × 6 / côté · palier P1" },
    ],
    p2: [
      { name: "Pliométrie · Sauts de haies basses", detail: "3 × 5 · contact au sol minimal · palier P2 (~60-70 contacts)" },
      { name: "Pliométrie · Bounding (bonds horizontaux)", detail: "3 × 8 contacts · poussée complète · palier P2" },
      { name: "Pliométrie · Sprints 20 m", detail: "4 × à 85-90 % · récup marchée complète · palier P2" },
      { name: "Pliométrie · Saut vertical (CMJ)", detail: "3 × 5 · référence de puissance, à noter dans l'app · palier P2" },
    ],
    deload: [
      { name: "Pliométrie · A-skip", detail: "2 × 10 m · deload (~20 contacts)" },
      { name: "Pliométrie · Ankle bounces (pogo)", detail: "2 × 10 · faible amplitude · deload" },
    ],
  };

  // Micro-sessions quotidiennes flexibles : mobilité dynamique le matin (8-10 min, 7 j/7),
  // étirements statiques le soir à distance des séances (lun/mer/sam 15 min, dim 20-25 min).
  const MICRO = {
    1: "Matin : mobilité 10 min · Soir : étirements 15 min",
    2: "Matin : mobilité 10 min",
    3: "Matin : mobilité 10 min · Soir : étirements 15 min",
    4: "Matin : mobilité 10 min",
    5: "Matin : mobilité 10 min",
    6: "Matin : mobilité 10 min · Soir : étirements 15 min",
    0: "Mobilité 10 min + étirements longs 20-25 min le soir",
  };

  const CALF_TESTS = {
    name: "Tests mollet (avant séance, chaque lundi)",
    detail: "25-30 élévations mollet unijambe + 15 sautillements unipodaux, sans douleur — pilotent les paliers pliométrie",
  };

  // Semaine d'amorce jeudi 23/07 → dimanche 26/07 : tests mollet, calibration, course de reprise.
  const AMORCE_DAYS = {
    4: {
      kind: "muscu",
      title: "Amorce — Bas A (calibration)",
      focus: "Tests mollet puis charges prudentes à RPE 6-7 · filme ton squat",
      duration: 60,
      rpe: "6 à 7",
    },
    5: {
      kind: "muscu",
      title: "Amorce — Haut A (calibration)",
      focus: "Pliométrie P0 en début de séance, puis Haut A à RPE 6-7",
      duration: 70,
      rpe: "6 à 7",
    },
    6: {
      kind: "course",
      title: "Amorce — Course Z2 reprise",
      focus: "Reprise prudente post-kiné : zone 2 stricte, terrain plat",
      duration: 35,
      rpe: "Zone 2",
      exercises: [
        { name: "Échauffement", detail: "5 min marche rapide + 5 min trot très lent" },
        { name: "Corps de séance", detail: "30-35 min zone 2, allure conversationnelle" },
        { name: "Règle mollet", detail: "Douleur > 3/10 → stop, marche, et note-le au bilan du soir" },
      ],
    },
    0: {
      kind: "repos",
      title: "Amorce — Repos",
      focus: "Mobilité le matin, étirements longs le soir — S1 démarre demain",
      duration: 0,
      rpe: "—",
      exercises: [],
    },
  };

  function programStartDate() {
    return state.program?.startDate || null;
  }

  function inAmorce(key = dateKey()) {
    const start = programStartDate();
    return Boolean(start && BLOC1.amorceStart && key >= BLOC1.amorceStart && key < start);
  }

  function plyoTierFor(week) {
    if (week === BLOC1.deloadWeek) return PLYO.deload;
    if (week >= 7) return PLYO.p2;
    if (week >= 3) return PLYO.p1;
    return PLYO.p0;
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

  function programActive(key = dateKey()) {
    const week = programWeek(key);
    if (inAmorce(key)) return true;
    return week !== null && week >= 1 && week <= BLOC1.totalWeeks;
  }

  function programUpcoming() {
    return programWeek() === 0 && !inAmorce();
  }

  function daysUntilBlockStart() {
    const start = programStartDate();
    if (!start) return null;
    const diff = Math.round((new Date(`${start}T12:00:00`) - new Date(`${dateKey()}T12:00:00`)) / 86400000);
    return Math.max(0, diff);
  }

  function programPhase(week = programWeek()) {
    if (week === 0 && inAmorce()) {
      return {
        from: 0,
        to: 0,
        label: "Amorce",
        weeklyGoal:
          "Tests mollet de référence, calibration des charges à RPE 6-7, course de reprise 30-35 min. La S1 officielle démarre lundi 27/07.",
      };
    }
    if (!week || week < 1) return null;
    return BLOC1.phases.find((phase) => week >= phase.from && week <= phase.to) || null;
  }

  function actualWeekday(key) {
    return new Date(`${key}T12:00:00`).getDay();
  }

  function effectiveWeekday(key) {
    const swap = state.program?.swaps?.[key];
    return Number.isInteger(swap) ? swap : actualWeekday(key);
  }

  function weekHasSwaps(key = dateKey()) {
    const monday = mondayOfWeek(key);
    for (let i = 0; i < 7; i++) {
      if (Number.isInteger(state.program?.swaps?.[addDaysKey(monday, i)])) return true;
    }
    return false;
  }

  function clearWeekSwaps(key = dateKey()) {
    const monday = mondayOfWeek(key);
    for (let i = 0; i < 7; i++) delete state.program?.swaps?.[addDaysKey(monday, i)];
  }

  function programSessionFor(key = dateKey()) {
    const weekday = effectiveWeekday(key);

    // Semaine d'amorce (23-26/07) : séances de calibration dédiées.
    if (inAmorce(key)) {
      const amorce = AMORCE_DAYS[weekday];
      if (amorce) {
        if (amorce.kind !== "muscu") return { ...amorce, micro: MICRO[weekday] };
        const source = weekday === 4 ? BLOC1.days[1] : BLOC1.days[2];
        let exercises = [];
        if (weekday === 4) exercises.push(CALF_TESTS);
        if (weekday === 5) exercises = exercises.concat(PLYO.p0);
        exercises = exercises.concat(source.exercises);
        return { ...amorce, exercises, micro: MICRO[weekday] };
      }
    }

    const base = BLOC1.days[weekday];
    if (!base) return null;
    if (base.kind !== "muscu") return { ...base, micro: MICRO[weekday] };

    const week = programWeek(key);
    const isDeloadWeek = week === BLOC1.deloadWeek;
    const isPhasedUp = week !== null && week >= 3 && !isDeloadWeek;

    let exercises = [];
    if (weekday === 1) exercises.push(CALF_TESTS); // tests mollet chaque lundi, avant Bas A
    if (base.plyo) exercises = exercises.concat(plyoTierFor(week)); // pliométrie en DÉBUT de Haut A/B
    exercises = exercises.concat(base.exercises);
    if (isPhasedUp && base.extraExercise) exercises = exercises.concat(base.extraExercise);

    const duration = isDeloadWeek
      ? base.deloadDuration ?? base.duration
      : isPhasedUp
        ? base.durationExtended ?? base.duration
        : base.duration;

    return { ...base, exercises, duration, micro: MICRO[weekday] };
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
    // Demande à iOS/Safari de ne pas évincer le stockage local de la PWA.
    // Sans ça, le système peut supprimer les données après quelques jours.
    if (navigator.storage?.persist) {
      navigator.storage.persisted?.().then((already) => {
        if (!already) navigator.storage.persist().catch(() => {});
      }).catch(() => {});
    }
    checkForUpdate();
    refreshWeather();
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        checkForUpdate();
        refreshWeather();
      }
    });
  }

  // ---- Mise à jour (v5.4) ----
  // Sur iPhone, une PWA peut servir une version en cache pendant des heures.
  // On compare la version publiée à celle qui tourne, et on propose la mise à jour.

  let pendingVersion = null;

  async function checkForUpdate() {
    if (location.protocol === "file:") return;
    try {
      const response = await fetch(`./version.json?cb=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data?.version && data.version !== APP_VERSION && data.version !== pendingVersion) {
        pendingVersion = data.version;
        render();
      }
    } catch (error) {
      // Hors ligne : on garde la version installée, sans rien signaler.
    }
  }

  async function applyUpdate() {
    // Sauvegarde tout ce qui est à l'écran avant de recharger : une saisie
    // en cours (debounce non encore écrit) ne doit pas partir avec le reload.
    flushInputs({ force: true });
    persistNow();
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      const registrations = (await navigator.serviceWorker?.getRegistrations?.()) || [];
      await Promise.all(registrations.map((registration) => registration.update()));
    } catch (error) {
      // Même si le nettoyage échoue, le rechargement forcé récupère la nouvelle version.
    }
    location.reload();
  }

  function UpdateBanner() {
    if (!pendingVersion) return "";
    return `
      <div class="update-banner">
        <div>
          <strong>Version ${escapeHtml(pendingVersion)} disponible</strong>
          <span>Tu utilises la ${escapeHtml(APP_VERSION)}. La mise à jour ne touche pas à tes données.</span>
        </div>
        <button type="button" class="primary-button" data-action="apply-update">Mettre à jour</button>
      </div>
    `;
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
      load: (() => {
        // v7.1.0 : ratio charge aiguë (7 j) / charge chronique (28 j).
        const load = acwr();
        const verdict = acwrVerdict(load.ratio);
        if (load.ratio === null && load.daysWithData === 0) return null;
        return {
          key: "load",
          label: "Charge récente",
          value: load.ratio === null ? "—" : String(load.ratio).replace(".", ","),
          score: verdict.score,
          trend: load.ratio === null ? `${load.daysWithData} jour(s) de données sur 28` : `Aiguë ${load.acuteAvg}/j · chronique ${load.chronicAvg}/j`,
          status: verdict.label,
          influence: verdict.why,
          points: [verdict.score - 4, verdict.score - 2, verdict.score],
        };
      })(),
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
          <div class="badge-row">${ConfidenceBadge(confidence)}${
            morning().completed ? "" : GotoBadge("Compléter le check-in", "watch", "checkin", "fatigue")
          }</div>
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

  // ---- v5.1 : lecture visuelle des données ----
  // Grammaire inspirée des apps de suivi grand public : un anneau par grande dimension,
  // une jauge de position dans la plage normale par métrique, une phrase en clair.

  function Ring({ value, label, sub, accent, empty = false, goto: target, focus }) {
    const inner = empty
      ? `<div class="ring-value"><strong>—</strong></div>`
      : `<div class="ring-value"><strong>${value}</strong><span>%</span></div>`;
    const body = `
      <div class="ring" style="--score:${empty ? 0 : clamp(value, 0, 100)}; --accent:${empty ? "var(--subtle)" : accent}">${inner}</div>
      <div class="ring-caption">
        <strong>${escapeHtml(label)}</strong>
        <span>${escapeHtml(sub)}</span>
      </div>
    `;
    if (!target) return `<div class="ring-item">${body}</div>`;
    return `<button type="button" class="ring-item tappable" data-goto="${target}"${focus ? ` data-goto-focus="${focus}"` : ""}>${body}</button>`;
  }

  // Charge de la semaine : séances réalisées (journal ou import) sur séances prévues par le bloc.
  function weekSessionLoad() {
    const monday = mondayOfWeek();
    let planned = 0;
    let done = 0;
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(monday, i);
      if (key > dateKey()) break;
      if (!programActive(key)) continue;
      const session = programSessionFor(key);
      if (!session || session.kind === "repos") continue;
      planned += 1;
      const entry = journalEntry(key);
      const logged = (entry?.workouts || []).length > 0 || (entry?.activities || []).some((activity) => !activity.neat);
      const completion = entry?.evening?.touched ? entry.evening.completion : null;
      if (logged || completion === "complete" || completion === "adaptee") done += 1;
    }
    return { planned, done, pct: planned ? Math.round((done / planned) * 100) : null };
  }

  function sleepScoreToday() {
    const health = state.imports?.health;
    if (health?.sleepMinutes) return { score: scoreSleepMinutes(health.sleepMinutes), sub: formatMinutes(rounded(health.sleepMinutes)) };
    return null;
  }

  function RingsRow(readiness) {
    const load = weekSessionLoad();
    const sleep = sleepScoreToday();
    return `
      <section class="card rings-card">
        <div class="rings-row">
          ${Ring({
            value: readiness.score,
            label: "Récupération",
            sub: readiness.empty ? "Check-in à faire" : readiness.category,
            accent: readiness.accent,
            empty: readiness.empty,
            goto: readiness.empty ? "today:checkin" : null,
            focus: readiness.empty ? "fatigue" : null,
          })}
          ${Ring({
            value: load.pct ?? 0,
            label: "Séances",
            sub: load.planned ? `${load.done} sur ${load.planned} cette semaine` : "Aucune prévue à ce stade",
            accent: "var(--indigo)",
            empty: load.pct === null,
            goto: load.pct === null ? null : "today:workout",
          })}
          ${Ring({
            value: sleep?.score ?? 0,
            label: "Sommeil",
            sub: sleep ? sleep.sub : "Importer Apple Santé",
            accent: "var(--blue, var(--indigo))",
            empty: !sleep,
            goto: sleep ? null : "today:data",
          })}
        </div>
        <div class="coach-line">
          <span class="coach-line-tag">Ce que j'en lis</span>
          <p>${escapeHtml(coachSentence(readiness, load, sleep))}</p>
        </div>
      </section>
    `;
  }

  // Une phrase, en langage courant, qui dit l'essentiel du jour.
  function coachSentence(readiness, load, sleep) {
    if (readiness.empty) {
      return "Je n'ai encore rien sur toi aujourd'hui. Vingt secondes de check-in et je peux te dire si la séance prévue tient la route ou s'il faut l'alléger.";
    }
    const parts = [];
    if (readiness.score >= 78) parts.push("Ta récupération est bonne aujourd'hui : la séance prévue peut se faire comme écrit.");
    else if (readiness.score >= 62) parts.push("Récupération correcte sans plus : garde le plan mais reste deux répétitions en réserve.");
    else parts.push("Récupération basse : allège plutôt que de forcer, tu ne perdras rien sur dix semaines.");

    if (!sleep) parts.push("Il me manque ton sommeil et ta HRV — sans eux je travaille en confiance réduite.");
    else if (sleep.score < 60) parts.push("Nuit courte : c'est le premier levier à corriger avant d'ajouter de la charge.");

    if (load.planned && load.pct !== null && load.pct < 60) parts.push(`Semaine en retard sur le plan : ${load.done} séance(s) sur ${load.planned}.`);
    return parts.join(" ");
  }

  // Jauge de position dans une plage, comme un thermomètre : on voit d'un coup si on est dedans.
  function GaugeTile({ label, value, unit, hint, position, tone = "good", status, band, target: gotoTarget, focus, metric }) {
    const empty = position === null || position === undefined;
    const inner = `
      <div class="gauge-text">
        <span class="gauge-label">${escapeHtml(label)}</span>
        <div class="gauge-value"><strong>${escapeHtml(String(value))}</strong>${unit ? `<span>${escapeHtml(unit)}</span>` : ""}</div>
        <span class="gauge-status ${empty ? "" : tone}">${escapeHtml(status)}</span>
        ${hint ? `<span class="gauge-hint">${escapeHtml(hint)}</span>` : ""}
      </div>
      <div class="gauge-track ${empty ? "empty" : tone}">
        ${band && !empty ? `<span class="gauge-band" style="--from:${band[0]}%; --to:${band[1]}%"></span>` : ""}
        ${empty ? "" : `<span class="gauge-dot" style="--pos:${clamp(position, 3, 97)}%"></span>`}
      </div>
    `;
    // v5.9.0 : une tuile ouvre d'abord sa fiche de lecture (échelle + cible).
    // Le raccourci de saisie vit désormais dans la fiche, pas sur la tuile.
    if (metric) return `<button type="button" class="gauge-tile tappable" data-action="open-metric" data-metric="${escapeHtml(metric)}">${inner}</button>`;
    if (!gotoTarget) return `<article class="gauge-tile">${inner}</article>`;
    return `<button type="button" class="gauge-tile tappable" data-goto="${gotoTarget}"${focus ? ` data-goto-focus="${focus}"` : ""}>${inner}</button>`;
  }

  function positionIn(value, min, max) {
    if (!Number.isFinite(value)) return null;
    return clamp(((value - min) / (max - min)) * 100, 0, 100);
  }

  // ---- v7.1.0 : charge d'entraînement (ACWR) et courses structurées ----
  // Lot C du plan v8. Le facteur « Charge récente » du readiness pointait
  // encore sur les données de démonstration retirées en v5.3 : il était donc
  // toujours nul. Il est remplacé par un ratio charge aiguë / charge chronique,
  // le marqueur le plus utile pour un mollet qui sort de rééducation.

  // Charge d'une journée, en unités arbitraires mais cohérentes entre elles :
  // durée × facteur d'intensité. La FC quand on l'a, sinon un défaut par type.
  function intensityFactor(workout) {
    const hr = Number(workout?.hr);
    if (Number.isFinite(hr) && hr > 0) {
      if (hr >= 170) return 2.2;
      if (hr >= 155) return 1.8;
      if (hr >= 140) return 1.4;
      if (hr >= 120) return 1;
      return 0.7;
    }
    if (workout?.type === "course") return /fraction/i.test(workout.kind || "") ? 1.8 : 1.2;
    return 1;
  }

  function dailyLoad(key) {
    const entry = journalEntry(key);
    if (!entry) return 0;
    let load = 0;
    (entry.workouts || []).forEach((workout) => {
      if (workout.type === "course") {
        const duration = Number(workout.duration) || 0;
        load += duration * intensityFactor(workout);
        return;
      }
      // Muscu : durée réelle si le bilan du soir la donne, sinon la durée prescrite.
      const declared = Number(entry.evening?.duration);
      const minutes = Number.isFinite(declared) && declared > 5 ? declared : 60;
      const rpe = Number(workout.exercises?.[0]?.rpe) || Number(entry.evening?.rpe) || 7;
      load += minutes * (rpe / 10) * 1.1;
    });
    (entry.activities || []).forEach((activity) => {
      if (!activity.neat) return;
      load += (Number(activity.duration) || 0) * 0.4; // marche : charge réelle mais faible
    });
    return Math.round(load);
  }

  function acwr() {
    let acute = 0;
    let chronic = 0;
    let daysWithData = 0;
    for (let i = 0; i < 28; i++) {
      const value = dailyLoad(keyOffset(i));
      if (value > 0) daysWithData += 1;
      chronic += value;
      if (i < 7) acute += value;
    }
    if (daysWithData < 4) return { ratio: null, acute, chronic, daysWithData };
    const acuteAvg = acute / 7;
    const chronicAvg = chronic / 28;
    const ratio = chronicAvg > 0 ? Math.round((acuteAvg / chronicAvg) * 100) / 100 : null;
    return { ratio, acute: Math.round(acute), chronic: Math.round(chronic), acuteAvg: Math.round(acuteAvg), chronicAvg: Math.round(chronicAvg), daysWithData };
  }

  function acwrVerdict(ratio) {
    if (ratio === null) return { label: "Historique insuffisant", tone: "info", score: 70, why: "Il faut au moins 4 jours de données sur 4 semaines pour calculer un ratio fiable." };
    if (ratio < 0.8) return { label: "Sous-charge", tone: "watch", score: 78, why: "La charge des 7 derniers jours est basse par rapport à ton habitude : la forme se maintient mal si ça dure." };
    if (ratio <= 1.3) return { label: "Zone optimale", tone: "good", score: 88, why: "Progression maîtrisée : la charge récente reste dans la continuité des 4 dernières semaines." };
    if (ratio <= 1.5) return { label: "Montée rapide", tone: "watch", score: 70, why: "La charge grimpe plus vite que ta base. Sur un mollet en reprise, c'est le moment de ne pas ajouter de volume." };
    return { label: "Pic de charge", tone: "bad", score: 55, why: "Charge aiguë nettement supérieure à ta base : c'est la zone où le risque de blessure augmente. Priorité à la récupération." };
  }

  // ---- Courses structurées, adaptées à la semaine et au statut mollet ----
  // Remplace la liste générique par la séquence réelle du jour (adoption Runna).
  function calfAlertsCount(daysBack = 28) {
    let alerts = 0;
    for (let i = 0; i < daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      if (Number(entry?.evening?.calfPain) > 3) alerts += 1;
    }
    return alerts;
  }

  function runStepsFor(key = dateKey()) {
    const session = programActive(key) ? programSessionFor(key) : null;
    if (!session || session.kind !== "course") return null;
    const week = programWeek(key) || 0;
    const isLong = actualWeekday(key) === 6; // samedi = course longue
    const alerts = calfAlertsCount();
    const clean = alerts === 0;
    const base = isLong ? (week <= 1 ? 45 : week <= 3 ? 50 : 55) : week <= 1 ? 35 : 40;

    const steps = [
      { label: "Échauffement", detail: "5 min marche rapide puis 5 min trot très lent", minutes: 10, impact: false },
      {
        label: "Corps de séance",
        detail: `${base} min en zone 2 stricte — tu dois pouvoir tenir une conversation en phrases complètes du début à la fin`,
        minutes: base,
        impact: true,
      },
    ];

    // Lignes droites dès S4 sur la course longue, si le mollet est resté muet.
    if (isLong && week >= 4) {
      steps.push(
        clean
          ? { label: "Lignes droites", detail: "6 × 15-20 s en accélération progressive à ~85 %, récupération marche 45 s", minutes: 7, impact: true, calf: true }
          : { label: "Lignes droites — reportées", detail: `${alerts} alerte(s) mollet sur les 4 dernières semaines : on reste en zone 2 tant que le mollet n'est pas muet 3 semaines d'affilée`, minutes: 0, impact: false }
      );
    }

    // Fractionné doux dès S7 sur la course courte, uniquement si zéro alerte.
    if (!isLong && week >= 7) {
      steps.push(
        clean
          ? { label: "Fractionné doux", detail: "6 × 2 min à allure soutenue mais contrôlée, récupération 2 min de trot", minutes: 24, impact: true, calf: true }
          : { label: "Fractionné — reporté", detail: `${alerts} alerte(s) mollet enregistrée(s) : la base aérobie prime, on garde la zone 2`, minutes: 0, impact: false }
      );
    }

    steps.push({ label: "Retour au calme", detail: "5 min de trot très lent puis marche", minutes: 5, impact: false });

    const total = steps.reduce((sum, step) => sum + step.minutes, 0);
    return { title: session.title, steps, total, week, clean, alerts };
  }

  function RunStepsCard(key = dateKey()) {
    const plan = runStepsFor(key);
    if (!plan) return "";
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Déroulé de la course</p>
            <h2>${escapeHtml(plan.title)}</h2>
          </div>
          ${StatusBadge(`${plan.total} min au total`, "info")}
        </div>
        <ol class="run-steps">
          ${plan.steps
            .map(
              (step) => `
              <li class="run-step ${step.minutes === 0 ? "skipped" : ""}">
                <span class="run-step-time">${step.minutes ? `${step.minutes} min` : "—"}</span>
                <span class="run-step-body">
                  <strong>${escapeHtml(step.label)}</strong>
                  <span>${escapeHtml(step.detail)}</span>
                  ${step.calf ? `<span class="run-step-calf">⚠️ Douleur mollet > 3/10 → tu passes en marche et tu l'notes au bilan</span>` : ""}
                </span>
              </li>
            `
            )
            .join("")}
        </ol>
        <p class="small-text">${
          plan.clean
            ? "Aucune alerte mollet sur les 4 dernières semaines : la progression suit le plan."
            : `${plan.alerts} alerte(s) mollet enregistrée(s) sur 4 semaines — les étapes à impact restent bridées tant que ça ne s'est pas calmé.`
        }</p>
      </section>
    `;
  }

  // ---- « Pas à 100 % » : proposer la variante allégée plutôt que subir ou annuler ----
  function lightenedSession(key = dateKey()) {
    const session = programActive(key) ? programSessionFor(key) : null;
    if (!session) return null;
    if (session.kind === "course") {
      return {
        title: "Version allégée",
        lines: [
          "Durée réduite d'un tiers, zone 2 stricte sans aucune accélération.",
          "Si le mollet parle ou que l'essoufflement arrive vite : marche rapide 30 min, ça reste une séance.",
        ],
      };
    }
    if (session.kind === "muscu") {
      return {
        title: "Version allégée",
        lines: [
          "Retire une série par exercice et plafonne le RPE à 6 : tu gardes le mouvement, tu enlèves la fatigue.",
          "Les charges prescrites restent les mêmes — on ne baisse pas le poids, on baisse le volume.",
          "Pliométrie et exercices à impact : sautés aujourd'hui.",
        ],
      };
    }
    return null;
  }

  function NotFullCard(key = dateKey()) {
    const session = programActive(key) ? programSessionFor(key) : null;
    if (!session || session.kind === "repos") return "";
    const light = lightenedSession(key);
    if (!light) return "";
    const open = state.notFullOpen === key;
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Si la journée est difficile</p>
            <h2>Pas à 100 % aujourd'hui ?</h2>
          </div>
        </div>
        <p class="small-text">Une séance allégée vaut toujours mieux qu'une séance sautée : elle entretient l'habitude et la technique sans creuser la fatigue.</p>
        <button type="button" class="ghost-button" data-action="toggle-not-full">${open ? "Masquer la version allégée" : "Voir la version allégée"}</button>
        ${
          open
            ? `<div class="notice" style="margin-top:12px">
                <strong>${escapeHtml(light.title)}</strong>
                ${light.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}
              </div>
              <button type="button" class="primary-button" style="margin-top:10px" data-action="apply-not-full">${icon("check")}J'adopte la version allégée</button>`
            : ""
        }
      </section>
    `;
  }

  // ---- v7.0.0 : moteur de prescription et saisie par écart ----
  // Principe du plan v8 : l'app connaît le plan, affiche la charge du jour
  // pré-remplie, et l'athlète ne saisit que l'écart et le ressenti. Jamais de
  // page blanche — c'est ce qui a manqué depuis le début (séances closes à 0 min
  // sans RPE, développé couché fait mais jamais saisi).

  // Derniers top sets connus hors journal (déclarés au coach en conversation).
  // Servent d'amorce tant que l'exercice n'a pas été saisi dans l'app.
  const PRESCRIPTION_SEEDS = {
    "developpe couche": { weight: 80, reps: 6, rpe: 8, source: "déclaré au coach le 24/07" },
  };

  const LOWER_BODY_HINTS = ["squat", "presse", "fente", "leg curl", "mollet", "souleve", "hip thrust", "bulgare", "abduction", "lombaire", "jambe"];
  const BARBELL_HINTS = ["squat", "developpe couche", "developpe militaire", "souleve de terre", "barre ez", "rowing barre", "hip thrust"];
  const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25];
  const BAR_KG = 20;

  function normalizeLiftName(name) {
    return String(name || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/\([^)]*\)/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isLowerBody(name) {
    const n = normalizeLiftName(name);
    return LOWER_BODY_HINTS.some((hint) => n.includes(hint));
  }

  function isBarbell(name) {
    const n = normalizeLiftName(name);
    return BARBELL_HINTS.some((hint) => n.includes(hint));
  }

  // « 4 × 4-6 · RPE 7-8 · repos 3 min » → { sets, repsMin, repsMax, rpe, restSec }
  function parseDetail(detail) {
    const text = String(detail || "");
    const out = { sets: null, repsMin: null, repsMax: null, rpe: null, restSec: null };

    const setsReps = text.match(/(\d+)\s*[×x]\s*(\d+)(?:\s*-\s*(\d+))?/);
    if (setsReps) {
      out.sets = Number(setsReps[1]);
      out.repsMin = Number(setsReps[2]);
      out.repsMax = setsReps[3] ? Number(setsReps[3]) : Number(setsReps[2]);
    }

    const rpe = text.match(/RPE\s*(\d+(?:[.,]\d+)?)(?:\s*-\s*(\d+(?:[.,]\d+)?))?/i);
    if (rpe) {
      const high = rpe[2] || rpe[1];
      out.rpe = Number(String(high).replace(",", "."));
    }

    const restMin = text.match(/repos\s*(\d+(?:\s*-\s*\d+)?)\s*min/i);
    const restSec = text.match(/repos\s*(\d+)\s*s/i);
    if (restMin) out.restSec = Number(String(restMin[1]).split("-")[0].trim()) * 60;
    else if (restSec) out.restSec = Number(restSec[1]);

    return out;
  }

  function lastTopSetFor(name) {
    const target = normalizeLiftName(name);
    let best = null;
    liftHistories().forEach((sessions, logged) => {
      if (normalizeLiftName(logged) !== target) return;
      const last = sessions[sessions.length - 1];
      if (!best || last.date > best.date) best = { ...last, source: `saisi le ${formatShortDate(last.date)}` };
    });
    if (best) return best;
    const seed = PRESCRIPTION_SEEDS[target];
    return seed ? { ...seed, date: null, source: seed.source } : null;
  }

  function roundLoad(value) {
    return Math.round(value * 4) / 4 >= 0 ? Math.round(value / 2.5) * 2.5 : value;
  }

  // Double progression : haut de fourchette atteint au RPE cible → on monte.
  // RPE 2 crans sous la cible → la charge est sous-calibrée, saut plus franc.
  function prescribeLoad(name, spec, last) {
    const step = isLowerBody(name) ? 5 : 2.5;
    if (!last || !Number.isFinite(Number(last.weight))) {
      return { weight: null, status: "calibrate", why: "Aucun top set connu : calibre au feeling à RPE 7 et note la charge." };
    }
    const weight = Number(last.weight);
    const reps = Number(last.reps);
    const rpe = Number(last.rpe);
    const repsMax = spec.repsMax ?? reps;
    const rpeTarget = spec.rpe ?? 8;

    if (weight === 0) {
      return {
        weight: 0,
        status: "bodyweight",
        why: `Poids de corps. Dernière fois ${reps} reps${Number.isFinite(rpe) ? ` à RPE ${rpe}` : ""} — vise le haut de la fourchette avant de lester.`,
      };
    }

    if (Number.isFinite(rpe) && rpe <= rpeTarget - 2) {
      const jump = step * 2;
      return {
        weight: roundLoad(weight + jump),
        status: "undercalibrated",
        why: `Dernier RPE ${rpe} pour une cible ${rpeTarget} : charge nettement sous-calibrée, on monte de ${String(jump).replace(".", ",")} kg.`,
      };
    }

    if (Number.isFinite(reps) && reps >= repsMax && (!Number.isFinite(rpe) || rpe <= rpeTarget)) {
      return {
        weight: roundLoad(weight + step),
        status: "progress",
        why: `Haut de fourchette atteint (${reps} reps à RPE ${Number.isFinite(rpe) ? rpe : "?"}) → +${String(step).replace(".", ",")} kg.`,
      };
    }

    return {
      weight,
      status: "hold",
      why: `Charge maintenue : vise ${repsMax} reps à RPE ${rpeTarget} avant d'ajouter du poids.`,
    };
  }

  function prescriptionFor(key = dateKey()) {
    const session = programActive(key) ? programSessionFor(key) : null;
    if (!session || session.kind !== "muscu") return [];
    return (session.exercises || [])
      .filter((item) => !/^Tests mollet/i.test(item.name) && !/^Pliométrie/i.test(item.name))
      .map((item) => {
        const spec = parseDetail(item.detail);
        const last = lastTopSetFor(item.name);
        const load = prescribeLoad(item.name, spec, last);
        return { name: item.name, detail: item.detail, spec, last, ...load };
      });
  }

  // ---- Calculateur de disques et montée en gamme (adoptés du benchmark) ----
  function plateBreakdown(total) {
    const perSide = (Number(total) - BAR_KG) / 2;
    if (!Number.isFinite(perSide) || perSide <= 0) return null;
    let rest = perSide;
    const used = [];
    PLATES.forEach((plate) => {
      while (rest >= plate - 0.001) {
        used.push(plate);
        rest = Math.round((rest - plate) * 100) / 100;
      }
    });
    if (rest > 0.01) return null; // charge non réalisable avec les disques standards
    const counts = used.reduce((acc, plate) => {
      acc[plate] = (acc[plate] || 0) + 1;
      return acc;
    }, {});
    const label = Object.entries(counts)
      .sort((a, b) => Number(b[0]) - Number(a[0]))
      .map(([plate, n]) => `${n}×${String(plate).replace(".", ",")}`)
      .join(" + ");
    return `barre ${BAR_KG} + ${label} de chaque côté`;
  }

  function warmupRamp(topWeight, name) {
    const top = Number(topWeight);
    if (!Number.isFinite(top) || top < 40) return [];
    const bar = isBarbell(name) ? [{ weight: BAR_KG, reps: 10, label: "barre à vide" }] : [];
    return [
      ...bar,
      { weight: roundLoad(top * 0.4), reps: 8 },
      { weight: roundLoad(top * 0.6), reps: 5 },
      { weight: roundLoad(top * 0.8), reps: 3 },
    ].filter((set, index, list) => index === 0 || set.weight > list[index - 1].weight);
  }

  // ---- Brouillon de séance pré-rempli ----
  function sessionDraft(key = dateKey()) {
    if (!state.sessionDraft || state.sessionDraft.key !== key) {
      const rows = {};
      prescriptionFor(key).forEach((item) => {
        rows[item.name] = {
          weight: item.weight === null ? "" : item.weight,
          reps: item.spec.repsMax ?? "",
          sets: item.spec.sets ?? "",
          rpe: "",
        };
      });
      state.sessionDraft = { key, rows, openWarmup: "", error: "" };
    }
    return state.sessionDraft;
  }

  function PrescriptionCard(key = dateKey()) {
    const items = prescriptionFor(key);
    if (!items.length) return "";
    const draft = sessionDraft(key);
    const alreadyLogged = (day(key).workouts || []).some((w) => w.type === "muscu");
    const missingRpe = items.filter((item) => !draft.rows[item.name]?.rpe).length;

    return `
      <section class="card">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Séance prescrite</p>
            <h2>Ce que tu dois faire aujourd'hui</h2>
          </div>
          <div class="head-badges">${
            alreadyLogged ? StatusBadge("Déjà enregistrée", "good") : missingRpe ? StatusBadge(`${missingRpe} RPE à remplir`, "watch") : StatusBadge("Prêt à enregistrer", "good")
          }${SaveBadge()}</div>
        </div>
        <p class="small-text">Les charges sont calculées depuis tes dernières séances et la double progression du bloc. Corrige uniquement ce qui a différé, et renseigne le RPE réel — c'est lui qui pilote la séance suivante.</p>
        <div class="presc-list">
          ${items
            .map((item) => {
              const row = draft.rows[item.name] || { weight: "", reps: "", sets: "", rpe: "" };
              const plates = item.weight ? plateBreakdown(item.weight) : null;
              const ramp = warmupRamp(item.weight, item.name);
              const open = draft.openWarmup === item.name;
              return `
                <article class="presc-row ${item.status}">
                  <div class="presc-head">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="presc-target">${escapeHtml(item.spec.sets ? `${item.spec.sets} × ${item.spec.repsMin}${item.spec.repsMax !== item.spec.repsMin ? `-${item.spec.repsMax}` : ""}` : "")}${item.spec.rpe ? ` · RPE ${String(item.spec.rpe).replace(".", ",")}` : ""}${item.spec.restSec ? ` · repos ${item.spec.restSec >= 60 ? `${Math.round(item.spec.restSec / 60)} min` : `${item.spec.restSec} s`}` : ""}</span>
                  </div>
                  <p class="presc-why">${escapeHtml(item.why)}${item.last?.source ? ` <span class="presc-source">(${escapeHtml(item.last.source)})</span>` : ""}</p>
                  <div class="presc-fields">
                    <label><span>kg</span><input type="number" inputmode="decimal" step="0.5" min="0" value="${escapeHtml(String(row.weight))}" data-presc="${escapeHtml(item.name)}" data-field="weight" placeholder="${item.weight === null ? "?" : item.weight}" /></label>
                    <label><span>reps</span><input type="number" inputmode="numeric" min="1" max="50" value="${escapeHtml(String(row.reps))}" data-presc="${escapeHtml(item.name)}" data-field="reps" /></label>
                    <label><span>séries</span><input type="number" inputmode="numeric" min="1" max="12" value="${escapeHtml(String(row.sets))}" data-presc="${escapeHtml(item.name)}" data-field="sets" /></label>
                    <label class="${row.rpe ? "" : "needed"}"><span>RPE</span><input type="number" inputmode="decimal" step="0.5" min="1" max="10" value="${escapeHtml(String(row.rpe))}" data-presc="${escapeHtml(item.name)}" data-field="rpe" placeholder="—" /></label>
                  </div>
                  ${
                    item.spec.restSec
                      ? `<button type="button" class="ghost-button presc-rest" data-action="start-rest" data-seconds="${item.spec.restSec}" data-name="${escapeHtml(item.name)}">⏱ Lancer le repos (${item.spec.restSec >= 60 ? `${Math.round(item.spec.restSec / 60)} min` : `${item.spec.restSec} s`})</button>`
                      : ""
                  }
                  ${
                    ramp.length || plates
                      ? `<button type="button" class="presc-toggle" data-action="toggle-warmup" data-name="${escapeHtml(item.name)}">${open ? "Masquer" : "Échauffement et disques"} ›</button>`
                      : ""
                  }
                  ${
                    open
                      ? `<div class="presc-detail">
                          ${plates ? `<p><strong>${String(item.weight).replace(".", ",")} kg</strong> = ${escapeHtml(plates)}</p>` : ""}
                          ${
                            ramp.length
                              ? `<p>Montée en gamme : ${ramp.map((set) => `${String(set.weight).replace(".", ",")} kg × ${set.reps}`).join(" → ")} → séries de travail.</p>`
                              : ""
                          }
                        </div>`
                      : ""
                  }
                </article>
              `;
            })
            .join("")}
        </div>
        ${draft.error ? `<p class="presc-error">${escapeHtml(draft.error)}</p>` : ""}
        <button type="button" class="primary-button" data-action="save-prescribed">${icon("check")}Enregistrer la séance</button>
      </section>
    `;
  }

  function RestTimerBar() {
    const timer = state.restTimer;
    if (!timer?.endsAt) return "";
    const remaining = Math.max(0, Math.round((timer.endsAt - Date.now()) / 1000));
    const min = Math.floor(remaining / 60);
    const sec = String(remaining % 60).padStart(2, "0");
    return `
      <div class="rest-bar ${remaining === 0 ? "over" : ""}">
        <span class="rest-time">${min}:${sec}</span>
        <span class="rest-label">${remaining === 0 ? "Repos terminé — série suivante" : `Repos · ${escapeHtml(timer.name || "")}`}</span>
        <button type="button" class="ghost-button" data-action="stop-rest">Arrêter</button>
      </div>
    `;
  }

  // ---- Course : saisie par écart plutôt que retape des chiffres ----
  function runPrescription(key = dateKey()) {
    const session = programActive(key) ? programSessionFor(key) : null;
    if (!session || session.kind !== "course") return null;
    return { title: session.title, focus: session.focus, duration: session.duration, detail: session.detail || "" };
  }

  function RunPrescriptionCard(key = dateKey()) {
    const presc = runPrescription(key);
    if (!presc) return "";
    const draft = state.runDraft && state.runDraft.key === key ? state.runDraft : { key, compliance: "", rpe: "", calf: "", error: "" };
    state.runDraft = draft;
    const alreadyLogged = (day(key).workouts || []).some((w) => w.type === "course");
    return `
      <section class="card">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Course prescrite</p>
            <h2>${escapeHtml(presc.title)}</h2>
          </div>
          <div class="head-badges">${alreadyLogged ? StatusBadge("Déjà enregistrée", "good") : StatusBadge(`${presc.duration} min prévues`, "info")}${SaveBadge()}</div>
        </div>
        <p class="small-text">${escapeHtml(presc.focus || "")}</p>
        <div class="form-grid">
          <div class="field full">
            <span class="label">Par rapport à ce qui était prévu</span>
            <div class="segmented">
              ${["moins", "conforme", "plus"]
                .map(
                  (value) =>
                    `<button type="button" class="segmented-button ${draft.compliance === value ? "active" : ""}" data-action="run-compliance" data-value="${value}">${
                      value === "moins" ? "Moins" : value === "plus" ? "Plus" : "Conforme"
                    }</button>`
                )
                .join("")}
            </div>
          </div>
          <div class="field">
            <label for="run-rpe">RPE ressenti</label>
            <input id="run-rpe" type="number" inputmode="decimal" step="0.5" min="1" max="10" value="${escapeHtml(String(draft.rpe))}" data-run-draft="rpe" placeholder="7" />
          </div>
          <div class="field">
            <label for="run-calf">Douleur mollet (0-10)</label>
            <input id="run-calf" type="number" inputmode="numeric" min="0" max="10" value="${escapeHtml(String(draft.calf))}" data-run-draft="calf" placeholder="0" />
          </div>
        </div>
        ${draft.error ? `<p class="presc-error">${escapeHtml(draft.error)}</p>` : ""}
        <button type="button" class="primary-button" data-action="save-prescribed-run">${icon("check")}Enregistrer la course</button>
        <p class="small-text">Distance, allure et FC viennent de ta montre : inutile de les retaper ici. Si tu veux les saisir malgré tout, le journal des séances plus bas reste disponible.</p>
      </section>
    `;
  }

  // ---- v6.1.0 : saisie des tests mollet du lundi ----
  // Les tests conditionnent les paliers pliométrie (P0→P1→P2). Sans champ de
  // saisie, ils restaient déclaratifs — désormais les résultats sont persistés
  // dans journal[key].calfTest et remontent dans le briefing.
  function calfTestDay(key = dateKey()) {
    return actualWeekday(key) === 1 && programActive(key);
  }

  function CalfTestCard(key = dateKey()) {
    if (!calfTestDay(key)) return "";
    const test = day(key).calfTest;
    const reps = Number(test.raisesReps);
    const repsOk = Number.isFinite(reps) && reps >= 25 && !test.raisesPain;
    const bothOk = repsOk && test.hopsOk === true;
    const anyFail = (test.done && !repsOk) || test.hopsOk === false;
    return `
      <section class="card">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Tests mollet du lundi</p>
            <h2>Avant la séance, à froid</h2>
          </div>
          <div class="head-badges">${
            !test.done
              ? StatusBadge("À faire", "watch")
              : bothOk
                ? StatusBadge("Validés", "good")
                : StatusBadge("Alerte", "bad")
          }${SaveBadge()}</div>
        </div>
        <div class="form-grid">
          <div class="field full">
            <label class="check-row">
              <input type="checkbox" ${test.done ? "checked" : ""} data-scope="calfTest" data-key="done" data-type="checkbox" />
              <span>J'ai fait les deux tests ce matin</span>
            </label>
          </div>
          <div class="field">
            <label for="calf-reps">Élévations unijambe (amplitude complète)</label>
            <input id="calf-reps" type="number" min="0" max="60" inputmode="numeric" value="${escapeHtml(String(test.raisesReps ?? ""))}" data-scope="calfTest" data-key="raisesReps" placeholder="objectif 25-30 / jambe" />
          </div>
          <div class="field">
            <label class="check-row">
              <input type="checkbox" ${test.raisesPain ? "checked" : ""} data-scope="calfTest" data-key="raisesPain" data-type="checkbox" />
              <span>Douleur pendant les élévations</span>
            </label>
          </div>
          <div class="field full">
            <span class="label">15 sautillements unipodaux, faible amplitude</span>
            <div class="segmented">
              <button type="button" class="segmented-button ${test.hopsOk === true ? "active" : ""}" data-action="calf-hops" data-value="ok">Sans douleur</button>
              <button type="button" class="segmented-button ${test.hopsOk === false ? "active" : ""}" data-action="calf-hops" data-value="pain">Douleur</button>
            </div>
          </div>
          <div class="field full">
            <label for="calf-note">Remarque (facultatif)</label>
            <input id="calf-note" type="text" value="${escapeHtml(test.note || "")}" data-scope="calfTest" data-key="note" placeholder="Côté concerné, sensation..." />
          </div>
        </div>
        <p class="small-text">${
          bothOk
            ? "Les deux tests sont validés : la progression pliométrique standard continue (palier suivant accessible selon la semaine)."
            : anyFail
              ? "Un test en échec → on reste au palier P0 cette semaine, re-test lundi prochain. Signale-le aussi au bilan du soir."
              : "Objectifs : 25-30 élévations par jambe sans douleur, et 15 sautillements sans douleur ni le lendemain matin. Ces tests pilotent les paliers pliométrie de tout le bloc."
        }</p>
      </section>
    `;
  }

  // ---- v7.3.0 : contenu détaillé des micro-sessions ----
  // Retour de Ghislain : « sur la mobilité ce n'est pas précis, 10+10 par
  // exemple, il faut être plus précis ». Exact — une consigne sans séries,
  // sans côté et sans tempo n'est pas exécutable. Chaque item porte désormais
  // sa prescription complète, et la micro-session s'ouvre en check-list.
  const MICRO_CONTENT = {
    mobility: [
      {
        name: "Cercles de chevilles",
        rx: "10 cercles par sens, par cheville",
        how: "Assis ou debout en appui, pied décollé. Dessine un cercle le plus large possible avec la pointe du pied, lentement. 10 dans un sens puis 10 dans l'autre, avant de changer de pied.",
      },
      {
        name: "Flexion dorsale au mur",
        rx: "10 par cheville · 2 s de tenue",
        how: "Pied à une longueur de main du mur, genou poussé vers le mur en gardant le talon collé au sol. Tiens 2 s en fin d'amplitude puis reviens. Si le talon décolle, rapproche le pied du mur.",
        why: "La cheville la plus limitante bride le squat et raccourcit la foulée. C'est l'exercice le plus utile de la routine pour toi.",
      },
      {
        name: "90/90 hanches",
        rx: "8 rotations par côté · 2 s de pause",
        how: "Assis au sol, une jambe devant à 90°, l'autre sur le côté à 90°. Fais basculer les deux genoux d'un côté à l'autre sans décoller les fessiers, en marquant 2 s en fin d'amplitude.",
      },
      {
        name: "Fente basse avec rotation thoracique",
        rx: "5 par côté · 3 s bras vers le plafond",
        how: "Grande fente avant, main opposée au sol à l'intérieur du pied avant. Ouvre le buste en montant l'autre bras vers le plafond, regard qui suit la main, tiens 3 s, reviens.",
      },
      {
        name: "Cat-camel",
        rx: "10 cycles · 2 s dos rond, 2 s dos creux",
        how: "À quatre pattes. Enroule la colonne vertèbre par vertèbre en soufflant (2 s), puis creuse en inspirant (2 s). Un aller-retour = un cycle. Mouvement lent, jamais forcé.",
      },
      {
        name: "Extension thoracique à genoux",
        rx: "10 reps · 2 s de tenue",
        how: "À genoux, coudes posés sur un banc ou une chaise, mains jointes derrière la nuque. Laisse la poitrine descendre entre les bras, tiens 2 s, remonte.",
      },
      {
        name: "Balancés de jambes",
        rx: "10 avant/arrière puis 10 latéraux, par jambe",
        how: "En appui sur un mur, buste stable. Balance la jambe librement, amplitude croissante au fil des répétitions. Jamais de à-coup en fin de course.",
      },
    ],
    stretch: [
      { name: "Fléchisseurs de hanche", rx: "2 × 45 s par côté", how: "Fente genou au sol, bassin rétroversé (fessier serré) avant de pousser vers l'avant. C'est la rétroversion qui met en tension, pas l'amplitude de la fente." },
      { name: "Ischio-jambiers", rx: "2 × 45 s par côté", how: "Talon sur un support bas, jambe tendue sans verrouiller, bascule le bassin vers l'avant en gardant le dos droit." },
      { name: "Mollets genou tendu", rx: "2 × 45 s par côté", how: "Appui au mur, jambe arrière tendue, talon au sol. Cible le gastrocnémien. Progressif : c'est aussi de la rééducation." },
      { name: "Mollets genou fléchi", rx: "2 × 45 s par côté", how: "Même position mais genou arrière légèrement plié : la tension descend sur le soléaire, le muscle clé du coureur." },
      { name: "Fessiers / piriforme", rx: "2 × 45 s par côté", how: "Allongé sur le dos, cheville posée sur le genou opposé (figure 4), tire la cuisse support vers toi." },
      { name: "Pectoraux", rx: "2 × 45 s par côté", how: "Avant-bras contre un montant de porte, coude à hauteur d'épaule, pivote le buste doucement à l'opposé." },
    ],
    stretchLong: [
      { name: "Routine courte complète", rx: "les 6 positions ci-dessus · 2 × 45 s", how: "Fléchisseurs, ischio-jambiers, mollets tendu puis fléchi, fessiers, pectoraux." },
      { name: "Adducteurs", rx: "2 × 45 s", how: "Assis, plantes de pieds jointes, genoux vers le sol, buste qui avance en gardant le dos droit." },
      { name: "Dorsaux", rx: "2 × 45 s par côté", how: "Mains sur un support à hauteur de hanches, recule et laisse le buste descendre entre les bras, hanches en arrière." },
      { name: "Quadriceps", rx: "2 × 45 s par côté", how: "Debout ou allongé sur le côté, talon vers la fesse, genoux alignés et bassin rétroversé." },
      { name: "Respiration lente", rx: "2-3 min pour finir", how: "Allongé, inspire 4 s par le nez, expire 6 s par la bouche. Prépare le sommeil autant que la souplesse." },
    ],
  };

  function microContent(id) {
    return MICRO_CONTENT[id] || [];
  }

  // ---- Volume hebdomadaire par groupe musculaire ----
  // Repère d'hypertrophie largement admis : 10 à 20 séries par groupe et par
  // semaine. En dessous on entretient, au-dessus le rendement décroît et la
  // récupération devient le facteur limitant — surtout en déficit calorique.
  const MUSCLE_GROUPS = [
    { id: "pecs", label: "Pectoraux", hints: ["developpe couche", "developpe incline", "pompes", "ecarte"] },
    { id: "dos", label: "Dos", hints: ["traction", "rowing", "tirage", "elevations y"] },
    { id: "epaules", label: "Épaules", hints: ["developpe militaire", "elevations laterales", "face pull"] },
    { id: "bras", label: "Bras", hints: ["curl", "triceps", "biceps"] },
    { id: "jambes", label: "Jambes", hints: ["squat", "presse", "fente", "leg curl", "souleve de terre", "hip thrust", "bulgare", "abduction"] },
    { id: "mollets", label: "Mollets", hints: ["mollet"] },
    { id: "tronc", label: "Tronc", hints: ["gainage", "pallof", "lombaire", "roulette"] },
  ];

  function muscleGroupFor(name) {
    const n = normalizeLiftName(name);
    const found = MUSCLE_GROUPS.find((group) => group.hints.some((hint) => n.includes(hint)));
    return found ? found.id : null;
  }

  function weeklyVolume(daysBack = 7) {
    const totals = {};
    MUSCLE_GROUPS.forEach((group) => {
      totals[group.id] = 0;
    });
    for (let i = 0; i < daysBack; i++) {
      const entry = journalEntry(keyOffset(i));
      (entry?.workouts || []).forEach((workout) => {
        if (workout.type !== "muscu") return;
        (workout.exercises || []).forEach((exercise) => {
          const group = muscleGroupFor(exercise.name);
          if (!group) return;
          totals[group] += Number(exercise.sets) || 1;
        });
      });
    }
    return totals;
  }

  function volumeVerdict(sets) {
    if (sets === 0) return { label: "Aucune série", tone: "info" };
    if (sets < 10) return { label: "Entretien", tone: "watch" };
    if (sets <= 20) return { label: "Zone de progression", tone: "good" };
    return { label: "Au-delà du rendement utile", tone: "watch" };
  }

  function VolumeCard() {
    const totals = weeklyVolume(7);
    const any = Object.values(totals).some((v) => v > 0);
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Volume des 7 derniers jours</p>
            <h2>Séries par groupe musculaire</h2>
          </div>
          ${StatusBadge(any ? `${Object.values(totals).reduce((a, b) => a + b, 0)} séries` : "En attente", any ? "info" : "watch")}
        </div>
        ${
          any
            ? `<div class="volume-list">
                ${MUSCLE_GROUPS.map((group) => {
                  const sets = totals[group.id];
                  const verdict = volumeVerdict(sets);
                  const pct = clamp((sets / 24) * 100, 0, 100);
                  return `
                    <div class="volume-row">
                      <span class="volume-label">${escapeHtml(group.label)}</span>
                      <span class="volume-bar"><span class="volume-fill ${verdict.tone}" style="--w:${pct}%"></span><span class="volume-zone"></span></span>
                      <span class="volume-value">${sets}</span>
                    </div>
                  `;
                }).join("")}
              </div>
              <p class="volume-legend">
                <span><i style="background:var(--volt)"></i>10-20 séries : zone de progression</span>
                <span><i style="background:var(--orange)"></i>hors zone</span>
              </p>
              <p class="small-text">Les pointillés marquent la fourchette 10-20 séries par semaine, le repère habituel pour progresser en hypertrophie. En dessous tu entretiens — c'est suffisant pour ne rien perdre, pas pour gagner. Au-dessus, le rendement décroît et c'est la récupération qui devient limitante, d'autant plus en déficit calorique.</p>`
            : `<p class="small-text">Aucune série enregistrée sur les 7 derniers jours. Le compteur se remplit dès que tu enregistres tes séances : une semaine complète du Bloc 1 doit produire environ 12 à 16 séries sur les groupes principaux.</p>`
        }
      </section>
    `;
  }

  // ---- v6.0.0 : micro-sessions cochables avec créneaux ----
  // Retour de Ghislain (26/07) : « j'ai l'impression que je n'ai jamais d'étirement ».
  // Constat exact — elles n'étaient qu'une ligne de texte gris, sans horaire et
  // surtout sans moyen de les cocher : rien n'était tracé, donc rien ne remontait.
  // Créneaux calés sur son rythme réel (lever 8 h, coucher 22 h, séance le matin
  // ou entre 12 h et 14 h) : mobilité au lever, étirements 1 h avant le coucher —
  // toujours à distance de la séance, l'étirement statique long dégradant la
  // performance s'il la précède (consensus Delphi 2025).
  const MICRO_LIBRARY = {
    mobility: {
      id: "mobility",
      label: "Mobilité",
      time: "08:15",
      minutes: 10,
      hint: "Au lever, avant le petit-déjeuner. Dynamique, jamais d'étirement statique long avant une séance.",
    },
    stretch: {
      id: "stretch",
      label: "Étirements",
      time: "21:00",
      minutes: 15,
      hint: "1 h avant le coucher, loin de la séance. 2 × 45 s par position, tension confortable.",
    },
    stretchLong: {
      id: "stretchLong",
      label: "Étirements longs",
      time: "20:45",
      minutes: 25,
      hint: "Routine complète du dimanche + 2-3 min de respiration lente pour finir.",
    },
  };

  const MICRO_BY_DAY = {
    1: ["mobility", "stretch"],
    2: ["mobility"],
    3: ["mobility", "stretch"],
    4: ["mobility"],
    5: ["mobility"],
    6: ["mobility", "stretch"],
    0: ["mobility", "stretchLong"],
  };

  function microFor(key = dateKey()) {
    return (MICRO_BY_DAY[actualWeekday(key)] || []).map((id) => MICRO_LIBRARY[id]).filter(Boolean);
  }

  function microDone(key = dateKey()) {
    const entry = journalEntry(key);
    return Array.isArray(entry?.microDone) ? entry.microDone : [];
  }

  function microStats(key = dateKey()) {
    const items = microFor(key);
    const done = microDone(key);
    return { total: items.length, done: items.filter((item) => done.includes(item.id)).length, items };
  }

  function toggleMicro(key, id) {
    const entry = day(key);
    const list = Array.isArray(entry.microDone) ? entry.microDone : [];
    entry.microDone = list.includes(id) ? list.filter((value) => value !== id) : [...list, id];
  }

  function MicroCard(key = dateKey()) {
    const { items, done, total } = microStats(key);
    if (!items.length) return "";
    const doneList = microDone(key);
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Micro-sessions</p>
            <h2>Mobilité & étirements</h2>
          </div>
          ${done === total ? StatusBadge("Fait", "good") : StatusBadge(`${done}/${total}`, done ? "watch" : "info")}
        </div>
        <div class="micro-list">
          ${items
            .map((item) => {
              const isDone = doneList.includes(item.id);
              const content = microContent(item.id);
              const open = state.openMicro === item.id;
              return `
                <div class="micro-item">
                  <button type="button" class="micro-row ${isDone ? "done" : ""}" data-action="toggle-micro" data-micro="${escapeHtml(item.id)}" data-day="${escapeHtml(key)}">
                    <span class="micro-check" aria-hidden="true">${isDone ? "✓" : ""}</span>
                    <span class="micro-time">${escapeHtml(item.time)}</span>
                    <span class="micro-body">
                      <strong>${escapeHtml(item.label)} · ${item.minutes} min</strong>
                      <span>${escapeHtml(item.hint)}</span>
                    </span>
                  </button>
                  ${
                    content.length
                      ? `<button type="button" class="micro-detail-toggle" data-action="toggle-micro-detail" data-micro="${escapeHtml(item.id)}" aria-expanded="${open ? "true" : "false"}">
                          ${open ? "Masquer le détail" : `Voir les ${content.length} exercices`}
                        </button>`
                      : ""
                  }
                  ${
                    open && content.length
                      ? `<ol class="micro-detail">
                          ${content
                            .map(
                              (ex) => `
                              <li>
                                <strong>${escapeHtml(ex.name)}</strong>
                                <span class="micro-rx">${escapeHtml(ex.rx)}</span>
                                <span class="micro-how">${escapeHtml(ex.how)}</span>
                                ${ex.why ? `<span class="micro-why">${escapeHtml(ex.why)}</span>` : ""}
                              </li>
                            `
                            )
                            .join("")}
                        </ol>`
                      : ""
                  }
                </div>
              `;
            })
            .join("")}
        </div>
        <p class="small-text">Ces créneaux tiennent compte de ton rythme (lever 8 h, coucher 22 h). Ce sont des repères, pas des contraintes : l'important est de les faire, pas de les faire à l'heure exacte.</p>
      </section>
    `;
  }

  function microSummaryLine(key) {
    const items = microFor(key);
    if (!items.length) return "";
    const doneList = microDone(key);
    return items.map((item) => `${doneList.includes(item.id) ? "✓" : "○"} ${item.time} ${item.label} ${item.minutes} min`).join(" · ");
  }

  // ---- v5.9.0 : fiches de lecture des indicateurs ----
  // Un chiffre nu ne veut rien dire. Chaque tuile ouvre une fiche qui donne
  // l'échelle de référence, où l'athlète se situe, et la cible liée à SES objectifs.
  const ATHLETE = { heightCm: 171 };

  function scaleRow(zone, active) {
    return `<div class="metric-zone ${active ? "active" : ""} ${zone.tone}">
      <span class="metric-zone-range">${escapeHtml(zone.range)}</span>
      <span class="metric-zone-label">${escapeHtml(zone.label)}</span>
    </div>`;
  }

  function waistRatio(waistCm) {
    return Math.round((waistCm / ATHLETE.heightCm) * 1000) / 1000;
  }

  function waistHistory() {
    return Object.keys(state.journal || {})
      .filter((key) => Number(state.journal[key]?.waist) > 0)
      .sort()
      .reverse()
      .map((key) => ({ key, value: Number(state.journal[key].waist) }));
  }

  function metricSheetData(id) {
    const health = state.imports?.health || {};
    const weight = weightSummary();

    if (id === "waist") {
      const history = waistHistory();
      const current = history[0] || null;
      const ratio = current ? waistRatio(current.value) : null;
      const targetCm = Math.round(ATHLETE.heightCm * 0.5 * 10) / 10;
      const first = history[history.length - 1] || null;
      const delta = current && first && history.length > 1 ? Math.round((current.value - first.value) * 10) / 10 : null;
      const zones = [
        { range: "< 0,50", label: "Zone saine", tone: "good" },
        { range: "0,50 – 0,59", label: "Adiposité augmentée — « prendre soin »", tone: "watch" },
        { range: "≥ 0,60", label: "Adiposité élevée — « agir »", tone: "bad" },
      ];
      const activeIndex = ratio === null ? -1 : ratio < 0.5 ? 0 : ratio < 0.6 ? 1 : 2;
      return {
        title: "Tour de taille",
        current: current ? `${String(current.value).replace(".", ",")} cm` : "—",
        currentNote: current
          ? `Mesuré le ${formatFrDate(current.key)} · rapport tour de taille / stature = ${String(ratio).replace(".", ",")}`
          : "Aucune mesure enregistrée.",
        history:
          history.length > 1
            ? `${history.length} mesures · ${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")} cm depuis la première (${formatFrDate(first.key)}).`
            : "Une seule mesure : il faut au moins un mois pour lire une tendance.",
        scaleTitle: "Échelle de référence (NICE 2022, rapport tour de taille / stature)",
        zones,
        activeIndex,
        target: `Ta cible : passer sous ${String(targetCm).replace(".", ",")} cm — la règle est « garder son tour de taille sous la moitié de sa stature » (tu mesures ${ATHLETE.heightCm} cm).${
          current && current.value > targetCm
            ? ` Il te reste ${String(Math.round((current.value - targetCm) * 10) / 10).replace(".", ",")} cm à perdre, soit environ ${Math.ceil((current.value - targetCm) / 1.5)} mois à un rythme réaliste de 1 à 2 cm par mois.`
            : ""
        }`,
        why:
          "C'est le juge de paix numéro un de ta priorité n°2 (réduire la masse grasse). Il est plus fiable que le poids seul, qui varie avec l'eau et le glycogène. À mesurer une fois par mois, au réveil, à jeun, au niveau du nombril, sans rentrer le ventre.",
        cta: { label: "Mettre à jour la mesure", goto: "today:checkin", focus: "waist" },
      };
    }

    if (id === "weight") {
      const zones = [
        { range: "0 à −0,25 kg/sem", label: "Trop lent pour un déficit", tone: "watch" },
        { range: "−0,25 à −0,5 kg/sem", label: "Rythme cible du bloc", tone: "good" },
        { range: "au-delà de −0,7 kg/sem", label: "Trop rapide — risque de perte musculaire", tone: "bad" },
      ];
      const rate = weight.delta;
      const activeIndex = rate === null ? -1 : rate > -0.25 ? 0 : rate >= -0.7 ? 1 : 2;
      return {
        title: "Poids (moyenne 7 jours)",
        current: weight.avg7 ? `${String(weight.avg7).replace(".", ",")} kg` : "—",
        currentNote: weight.count7 ? `${weight.count7} pesée(s) sur les 7 derniers jours.` : "Aucune pesée cette semaine.",
        history:
          rate === null
            ? "Pas encore de comparaison possible : il faut deux semaines de pesées pour calculer un rythme."
            : `Variation de la moyenne 7 j : ${rate > 0 ? "+" : ""}${String(rate).replace(".", ",")} kg par rapport à la semaine précédente.`,
        scaleTitle: "Rythme de perte visé en recomposition",
        zones,
        activeIndex,
        target:
          "Ta cible : −0,25 à −0,5 kg par semaine, pas plus. Au-delà, le déficit devient assez agressif pour entamer le muscle — exactement ce que ta priorité n°1 cherche à éviter.",
        why:
          "Le poids d'un jour donné ne veut rien dire : il bouge de 1 à 2 kg avec l'hydratation, le sel et le contenu digestif. Seule la moyenne glissante sur 7 jours est lisible. Si tes charges baissent deux semaines de suite, on remonte les apports.",
        cta: { label: "Saisir mon poids", goto: "today:checkin", focus: "weight" },
      };
    }

    if (id === "rhr") {
      const value = health.rhr ? rounded(health.rhr) : null;
      const zones = [
        { range: "< 50 bpm", label: "Profil entraîné en endurance", tone: "good" },
        { range: "50 – 60 bpm", label: "Bonne condition cardiovasculaire", tone: "good" },
        { range: "60 – 70 bpm", label: "Correcte", tone: "watch" },
        { range: "> 70 bpm", label: "À surveiller", tone: "bad" },
      ];
      const activeIndex = value === null ? -1 : value < 50 ? 0 : value <= 60 ? 1 : value <= 70 ? 2 : 3;
      return {
        title: "Fréquence cardiaque de repos",
        current: value ? `${value} bpm` : "—",
        currentNote: value ? "Dernière valeur importée depuis Apple Santé." : "Aucune valeur importée.",
        history: (() => {
          if (!health.rhrAvg7 && !health.rhrAvg30) return "Aucun historique de FC de repos dans l'import.";
          const parts = [];
          if (health.rhrAvg7) parts.push(`moyenne 7 j : ${String(health.rhrAvg7).replace(".", ",")} bpm`);
          if (health.rhrAvg30) parts.push(`moyenne 30 j : ${String(health.rhrAvg30).replace(".", ",")} bpm`);
          if (value && health.rhrAvg30) {
            const delta = Math.round((value - health.rhrAvg30) * 10) / 10;
            parts.push(delta === 0 ? "tu es exactement sur ta moyenne" : `${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")} bpm par rapport à ta moyenne 30 j${delta >= 5 ? " — au-delà de +5 bpm plusieurs jours d'affilée, c'est un signal de fatigue" : ""}`);
          }
          return `${parts.join(" · ")} (${health.rhrDays || 0} jours mesurés).`;
        })(),
        scaleTitle: "Repères généraux",
        zones,
        activeIndex,
        target:
          "Ta vraie référence n'est pas cette échelle, c'est toi. Une FC de repos stable ou qui baisse doucement au fil du bloc signe une base aérobie qui progresse. Le signal à retenir : +5 bpm au-dessus de ton habitude pendant plusieurs jours = fatigue accumulée, nuit courte, alcool ou début d'infection — on allège.",
        why: "Un des marqueurs les plus simples de ta récupération, et il pèse 15 % du score de readiness.",
        cta: { label: "Importer Apple Santé", goto: "today:data" },
      };
    }

    if (id === "sleep") {
      const minutes = health.sleepMinutes ? rounded(health.sleepMinutes) : null;
      const zones = [
        { range: "< 6 h", label: "Insuffisant — récupération compromise", tone: "bad" },
        { range: "6 h – 7 h", label: "Juste", tone: "watch" },
        { range: "7 h – 9 h", label: "Recommandé pour un adulte", tone: "good" },
      ];
      const activeIndex = minutes === null ? -1 : minutes < 360 ? 0 : minutes < 420 ? 1 : 2;
      return {
        title: "Sommeil",
        current: minutes ? formatMinutes(minutes) : "—",
        currentNote: minutes ? "Dernière nuit importée." : "Aucune nuit importée.",
        history: (() => {
          if (!health.sleepAvg7 && !health.sleepAvg30) return "Aucun historique de sommeil dans l'import.";
          const parts = [];
          if (health.sleepAvg7) parts.push(`moyenne 7 j : ${formatMinutes(Math.round(health.sleepAvg7))}`);
          if (health.sleepAvg30) parts.push(`moyenne 30 j : ${formatMinutes(Math.round(health.sleepAvg30))}`);
          if (minutes && health.sleepAvg30) {
            const delta = Math.round(minutes - health.sleepAvg30);
            parts.push(`${delta > 0 ? "+" : ""}${delta} min par rapport à ta moyenne 30 j`);
          }
          return `${parts.join(" · ")} (${health.sleepDays || 0} nuits mesurées).`;
        })(),
        scaleTitle: "Repères de durée",
        zones,
        activeIndex,
        target:
          "Ta cible : 7 h à 8 h 30 par nuit. C'est le levier de récupération le plus puissant dont tu disposes, devant tous les compléments et protocoles — et il pèse 25 % du readiness.",
        why:
          "Sur un bloc en déficit calorique, le sommeil est ce qui protège le muscle et la qualité technique des séances lourdes. Une nuit courte se paie sur la séance du lendemain, pas le jour même.",
        cta: { label: "Importer Apple Santé", goto: "today:data" },
      };
    }

    if (id === "hrv") {
      return {
        title: "Variabilité cardiaque (HRV)",
        current: health.hrvMs ? `${rounded(health.hrvMs)} ms` : "—",
        currentNote: health.hrvMs ? "Dernière valeur importée." : "Aucune valeur : ta montre Garmin n'écrit pas le HRV dans Apple Santé.",
        history: "Indisponible.",
        scaleTitle: "Comment ça se lit",
        zones: [
          { range: "En absolu", label: "Ne se compare pas d'une personne à l'autre — inutilisable seul", tone: "bad" },
          { range: "En tendance", label: "Baisse marquée sur 3-4 jours = fatigue ou stress", tone: "watch" },
          { range: "Ta référence", label: "Ta propre moyenne sur 30 jours", tone: "good" },
        ],
        activeIndex: health.hrvMs ? 2 : -1,
        target:
          "Rien à faire pour l'instant. Garmin ne synchronise pas cette donnée vers Apple Santé — ce n'est pas un réglage à corriger, la fonction n'existe pas. Il faudrait une application tierce qui lit Garmin Connect et écrit dans Apple Santé.",
        why:
          "C'est le facteur le plus lourd du readiness (30 %), donc son absence plafonne mécaniquement la confiance du score. Le readiness reste calculé sur le sommeil, la FC de repos, la charge et ton ressenti — simplement avec une confiance moindre, ce que l'app affiche honnêtement.",
        cta: null,
      };
    }

    if (id === "steps") {
      const walk = walkStats(7);
      const perDay = health.stepsAvg ?? health.steps ?? null;
      const zones = [
        { range: "< 5 000", label: "Sédentaire", tone: "bad" },
        { range: "5 000 – 7 500", label: "Peu actif", tone: "watch" },
        { range: "7 500 – 10 000", label: "Actif", tone: "good" },
        { range: "> 10 000", label: "Très actif", tone: "good" },
      ];
      const activeIndex = perDay === null ? -1 : perDay < 5000 ? 0 : perDay < 7500 ? 1 : perDay <= 10000 ? 2 : 3;
      return {
        title: "Pas (moyenne par jour)",
        current: perDay ? `${perDay.toLocaleString("fr-FR")} pas` : "—",
        currentNote: "Somme des pas enregistrés, séances comprises.",
        history: "Sur les 7 derniers jours disponibles.",
        scaleTitle: "Repères d'activité quotidienne",
        zones,
        activeIndex,
        target:
          "Ta cible : rester au-dessus de 8 000 pas par jour. C'est de l'activité de fond (NEAT), pas de l'entraînement : ça soutient le déficit sans ajouter de fatigue à récupérer, contrairement à du cardio supplémentaire.",
        why:
          "Sur un bloc de recomposition, augmenter la marche est le levier le moins coûteux pour creuser le déficit — il ne concurrence ni tes séances lourdes ni ton mollet.",
        cta: null,
      };
    }

    return null;
  }

  function MetricSheetModal() {
    const id = state.openMetric;
    if (!id) return "";
    const data = metricSheetData(id);
    if (!data) return "";
    return `
      <div class="sheet-backdrop">
        <section class="sheet" role="dialog" aria-label="${escapeHtml(data.title)}" data-stop-close>
          <div class="sheet-head">
            <div>
              <p class="eyebrow">Lecture de l'indicateur</p>
              <h2>${escapeHtml(data.title)}</h2>
            </div>
            <button type="button" class="icon-button" data-action="close-metric" aria-label="Fermer">✕</button>
          </div>
          <div class="sheet-body">
            <div class="metric-current">
              <strong>${escapeHtml(data.current)}</strong>
              <span>${escapeHtml(data.currentNote)}</span>
            </div>
            <div class="sheet-block">
              <h3>Ton historique</h3>
              <p>${escapeHtml(data.history)}</p>
            </div>
            <div class="sheet-block">
              <h3>${escapeHtml(data.scaleTitle)}</h3>
              <div class="metric-scale">
                ${data.zones.map((zone, index) => scaleRow(zone, index === data.activeIndex)).join("")}
              </div>
              ${data.activeIndex >= 0 ? `<p class="small-text">La ligne mise en avant est celle où tu te situes aujourd'hui.</p>` : ""}
            </div>
            <div class="sheet-block">
              <h3>Ta cible</h3>
              <p>${escapeHtml(data.target)}</p>
            </div>
            <div class="sheet-block">
              <h3>Pourquoi ça compte</h3>
              <p>${escapeHtml(data.why)}</p>
            </div>
            ${
              data.cta
                ? `<button type="button" class="primary-button" data-action="metric-goto" data-goto="${escapeHtml(data.cta.goto)}"${
                    data.cta.focus ? ` data-goto-focus="${escapeHtml(data.cta.focus)}"` : ""
                  }>${escapeHtml(data.cta.label)}</button>`
                : ""
            }
          </div>
        </section>
      </div>
    `;
  }

  function GaugeGrid() {
    const health = state.imports?.health;
    const weight = weightSummary();
    const walk = walkStats(7);
    const tiles = [];

    // FC de repos : plus c'est bas, mieux c'est — plage usuelle 45-75 bpm.
    if (health?.rhr) {
      const rhr = rounded(health.rhr);
      tiles.push(
        GaugeTile({
          label: "FC de repos",
          value: rhr,
          unit: "bpm",
          position: positionIn(rhr, 40, 80),
          band: [positionIn(45, 40, 80), positionIn(70, 40, 80)],
          tone: rhr <= 62 ? "good" : rhr <= 70 ? "watch" : "bad",
          status: rhr <= 62 ? "Bonne" : rhr <= 70 ? "Correcte" : "Élevée",
          hint: "Plage usuelle 45-70",
          metric: "rhr",
        })
      );
    } else {
      tiles.push(
        GaugeTile({ label: "FC de repos", value: "—", unit: "", position: null, status: "À importer", hint: "Apple Santé", metric: "rhr" })
      );
    }

    if (health?.hrvMs) {
      const hrv = rounded(health.hrvMs);
      tiles.push(
        GaugeTile({
          label: "HRV",
          value: hrv,
          unit: "ms",
          position: positionIn(hrv, 20, 100),
          band: [positionIn(40, 20, 100), 100],
          tone: hrv >= 55 ? "good" : hrv >= 40 ? "watch" : "bad",
          status: hrv >= 55 ? "Bonne" : hrv >= 40 ? "Moyenne" : "Basse",
          hint: "Se lit en tendance, pas en absolu",
          metric: "hrv",
        })
      );
    } else {
      tiles.push(GaugeTile({ label: "HRV", value: "—", unit: "", position: null, status: "À importer", hint: "Apple Santé", metric: "hrv" }));
    }

    if (health?.sleepMinutes) {
      const minutes = rounded(health.sleepMinutes);
      tiles.push(
        GaugeTile({
          label: "Sommeil",
          value: formatMinutes(minutes),
          unit: "",
          position: positionIn(minutes, 240, 600),
          band: [positionIn(420, 240, 600), positionIn(510, 240, 600)],
          tone: minutes >= 420 ? "good" : minutes >= 360 ? "watch" : "bad",
          status: minutes >= 420 ? "Suffisant" : minutes >= 360 ? "Juste" : "Court",
          hint: "Cible 7 h à 8 h 30",
          metric: "sleep",
        })
      );
    } else {
      tiles.push(GaugeTile({ label: "Sommeil", value: "—", unit: "", position: null, status: "À importer", hint: "Apple Santé", metric: "sleep" }));
    }

    // Poids : pas de « plage normale », c'est la pente qui compte.
    if (weight.avg7 !== null) {
      const delta = weight.delta;
      tiles.push(
        GaugeTile({
          label: "Poids (moy. 7 j)",
          value: String(weight.avg7).replace(".", ","),
          unit: "kg",
          position: delta === null ? 50 : clamp(50 - delta * 40, 5, 95),
          band: [60, 70],
          tone: delta === null ? "watch" : delta <= -0.6 ? "watch" : delta <= -0.1 ? "good" : delta <= 0.1 ? "watch" : "bad",
          status:
            delta === null
              ? "Première semaine"
              : delta <= -0.6
                ? "Baisse rapide"
                : delta <= -0.1
                  ? "Bonne pente"
                  : delta <= 0.1
                    ? "Stable"
                    : "En hausse",
          hint: "Cible −0,25 à −0,5 kg/semaine",
          metric: "weight",
        })
      );
    } else {
      tiles.push(
        GaugeTile({ label: "Poids (moy. 7 j)", value: "—", unit: "", position: null, status: "À saisir", hint: "10 secondes le matin", metric: "weight" })
      );
    }

    // Dépense de fond : on privilégie les pas d'Apple Santé (toute la marche du
    // jour, pas seulement les sorties trackées), puis les minutes de marche Garmin.
    const steps = health?.stepsAvg ?? health?.steps ?? null;
    const perDayMin = walk.outings ? Math.round(walk.minutes / 7) : null;
    if (steps !== null) {
      tiles.push(
        GaugeTile({
          label: health?.stepsAvg ? "Pas (moy./jour)" : "Pas (dernier jour)",
          value: steps.toLocaleString("fr-FR"),
          unit: "pas",
          position: positionIn(steps, 0, 12000),
          band: [positionIn(8000, 0, 12000), 100],
          tone: steps >= 8000 ? "good" : steps >= 5000 ? "watch" : "bad",
          status: steps >= 8000 ? "Bon volume" : steps >= 5000 ? "À augmenter" : "Sédentaire",
          hint: "Cible 8 000 à 10 000/jour",
          metric: "steps",
        })
      );
    } else if (perDayMin !== null) {
      tiles.push(
        GaugeTile({
          label: "Marche (moy./jour)",
          value: perDayMin,
          unit: "min",
          position: positionIn(perDayMin, 0, 60),
          band: [positionIn(30, 0, 60), 100],
          tone: perDayMin >= 30 ? "good" : perDayMin >= 15 ? "watch" : "bad",
          status: perDayMin >= 30 ? "Bon volume" : perDayMin >= 15 ? "À augmenter" : "Faible",
          hint: "Cible 30 min/jour · marches Garmin",
          target: "today:data",
        })
      );
    } else {
      tiles.push(
        GaugeTile({ label: "Marche / pas", value: "—", unit: "", position: null, status: "À importer", hint: "Apple Santé ou Garmin", target: "today:data" })
      );
    }

    // Tour de taille : juge de paix de la recomposition.
    const waist = lastWaist();
    tiles.push(
      waist
        ? GaugeTile({
            label: "Tour de taille",
            value: String(waist.value).replace(".", ","),
            unit: "cm",
            position: waistDue() ? 88 : 50,
            band: [35, 65],
            tone: waistDue() ? "watch" : "good",
            status: waistDue() ? "À remesurer" : "À jour",
            hint: `Mesuré le ${formatShortDate(waist.key)}`,
            metric: "waist",
          })
        : GaugeTile({ label: "Tour de taille", value: "—", unit: "", position: null, status: "À mesurer", hint: "Référence de départ", metric: "waist" })
    );

    return `
      <section class="card">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Tes indicateurs</p>
            <h2>Où tu en es aujourd'hui</h2>
          </div>
          ${
            readinessMissingCount()
              ? GotoBadge(`${readinessMissingCount()} donnée manquante${readinessMissingCount() > 1 ? "s" : ""}`, "watch", morning().completed ? "data" : "checkin", morning().completed ? null : "fatigue")
              : StatusBadge("Complet", "good")
          }
        </div>
        <div class="gauge-grid">${tiles.join("")}</div>
        <p class="small-text">Touche une tuile pour ouvrir sa fiche de lecture : l'échelle de référence, où tu te situes et la cible liée à tes objectifs.</p>
      </section>
    `;
  }

  function readinessMissingCount() {
    const health = state.imports?.health;
    let missing = 0;
    if (!health?.hrvMs) missing += 1;
    if (!health?.sleepMinutes) missing += 1;
    if (!health?.rhr) missing += 1;
    if (!morning().completed) missing += 1;
    return missing;
  }

  // ---- v5.2 : marquer une séance faite ou non, en un appui ----
  // Le bilan du soir complet reste disponible ; ici on ne demande que le fait brut,
  // parce qu'une séance non déclarée est une donnée perdue pour l'adhérence.

  const QUICK_STATUSES = [
    { value: "complete", label: "Faite", tone: "good" },
    { value: "adaptee", label: "Adaptée", tone: "good" },
    { value: "partial", label: "Partielle", tone: "watch" },
    { value: "none", label: "Pas faite", tone: "bad" },
  ];

  function QuickStatusChips(key) {
    const entry = key === dateKey() ? day() : journalEntry(key) || day(key);
    const current = entry?.evening?.touched ? entry.evening.completion : null;
    return `
      <div class="quick-status">
        ${QUICK_STATUSES.map(
          (status) => `
          <button type="button" class="quick-chip ${current === status.value ? `active ${status.tone}` : ""}" data-action="set-completion" data-key="${key}" data-value="${status.value}">
            ${escapeHtml(status.label)}
          </button>`
        ).join("")}
      </div>
    `;
  }

  function QuickSessionCard() {
    const session = programActive() ? programSessionFor() : null;
    if (!session || session.kind === "repos") return "";
    const answered = evening().touched && evening().completion !== "none" ? true : evening().touched;
    return `
      <section class="card quick-card">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Séance du jour</p>
            <h2>${escapeHtml(session.title)}</h2>
            <p class="small-text">${answered ? "Tu peux corriger d'un appui." : "Tu l'as faite ? Un appui suffit, le détail viendra au bilan du soir."}</p>
          </div>
          ${answered ? StatusBadge(labelFor("completion", evening().completion), evening().completion === "none" ? "bad" : "good") : StatusBadge("À déclarer", "watch")}
        </div>
        ${QuickStatusChips(dateKey())}
        <div class="button-row" style="margin-top:12px">
          <button type="button" class="secondary-button" data-goto="today:evening" data-goto-focus="rpe">Ajouter le RPE et le détail</button>
        </div>
      </section>
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
        ${(() => {
          const next = missingItems()[0];
          if (!next) return "";
          return `<div class="button-row"><button type="button" class="primary-button" data-goto="today:${next.view}"${
            next.focus ? ` data-goto-focus="${next.focus}"` : ""
          }>${icon("check")}${escapeHtml(next.label)}</button></div>`;
        })()}
        <div class="decision-meta">
          <div class="meta-tile"><span>Séance prévue</span><strong>${escapeHtml(decision.planned)}</strong></div>
          <div class="meta-tile"><span>Intensite</span><strong>${escapeHtml(decision.intensity)}</strong></div>
          <div class="meta-tile"><span>Ajustement</span><strong>${escapeHtml(decision.adjustment)}</strong></div>
        </div>
        <p class="fineprint">Basé sur tes données personnelles · Ceci n'est pas un diagnostic médical</p>
      </section>
    `;
  }

  function MoveSessionPicker() {
    const todayKey = dateKey();
    const restoreRow = weekHasSwaps()
      ? `<div class="button-row"><button type="button" class="secondary-button" data-action="undo-move-session">Rétablir l'ordre initial de la semaine</button></div>`
      : "";

    if (!state.movePickerOpen) return restoreRow;

    const monday = mondayOfWeek(todayKey);
    const options = [];
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(monday, i);
      if (key <= todayKey) continue; // on n'échange qu'avec un jour à venir de la semaine
      const target = programSessionFor(key);
      if (!target) continue;
      const label = new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" });
      options.push(
        `<button type="button" class="secondary-button" data-action="confirm-move-session" data-target-key="${key}">${escapeHtml(label)} · ${escapeHtml(target.title)}</button>`
      );
    }

    return `
      <div class="notice">
        <strong>Déplacer la séance du jour</strong>
        <p>Choisis le jour avec lequel l'échanger. Conseil coach : garde les courses après un jour Haut (jamais après un jour Bas), et évite deux jours à impact d'affilée pour le mollet.</p>
        ${options.length ? `<div class="button-row">${options.join("")}</div>` : `<p class="small-text">Aucun jour disponible après aujourd'hui dans cette semaine.</p>`}
        <div class="button-row"><button type="button" class="secondary-button" data-action="close-move-session">Annuler</button></div>
      </div>
      ${restoreRow}
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
            ${StatusBadge(day().workoutStartedAt ? "En cours" : session.kind === "repos" ? "Repos" : "Prévue", day().workoutStartedAt ? "good" : decision.tone)}
          </div>
          <div class="stat-grid">
            <div class="stat-tile"><span>Semaine</span><strong>${week === 0 ? "Amorce" : `${week} / ${BLOC1.totalWeeks}`}</strong></div>
            <div class="stat-tile"><span>Durée</span><strong>${session.duration ? `${session.duration} min` : "—"}</strong></div>
            <div class="stat-tile"><span>RPE cible</span><strong>${escapeHtml(isDeloadWeek && session.kind !== "repos" ? "≤ 6 (deload)" : session.rpe)}</strong></div>
            <div class="stat-tile"><span>Phase</span><strong>${escapeHtml(programPhase(week)?.label || "—")}</strong></div>
          </div>
          ${day().workoutStartedAt ? LiveWorkoutBanner(session) : ""}
          ${
            session.exercises.length
              ? `<div class="exercise-list">
                  ${session.exercises.map((item) => (day().workoutStartedAt ? LiveExerciseRow(item) : ExerciseRow(item, "session"))).join("")}
                </div>
                <p class="small-text">${
                  day().workoutStartedAt
                    ? "Coche chaque exercice terminé. Le rond à gauche coche, le reste de la ligne ouvre la fiche."
                    : "Touche un exercice pour la fiche : exécution, erreurs à éviter et vidéo."
                }</p>`
              : ""
          }
          <p class="small-text">Mobilité et étirements du jour : voir la carte « Micro-sessions » juste en dessous.</p>
          ${
            session.kind === "muscu"
              ? `<div class="notice"><strong>Comment mener la séance</strong><p>Échauffement 8-10 min (mobilité + 2 séries légères du premier exercice), puis les exercices dans l'ordre affiché. Respecte les temps de repos : ils font partie de la charge. Le RPE est ton garde-fou — RPE 7 = il te reste 3 répétitions en réserve, RPE 8 = 2. Tu ne vas jamais à l'échec sur ce bloc. Douleur mollet > 3/10 → tu arrêtes l'exercice et tu le signales au bilan du soir.</p></div>`
              : session.kind === "course"
                ? `<div class="notice"><strong>Comment mener la séance</strong><p>Échauffement systématique : 5 min de marche rapide puis 5 min de trot très lent. Zone 2 = tu peux tenir une conversation en phrases complètes du début à la fin ; si tu es essoufflé, tu vas trop vite, ralentis même si l'allure te paraît ridicule. Douleur mollet > 3/10 → tu passes en marche et tu le notes au bilan.</p></div>`
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
                  ${
                    day().workoutStartedAt
                      ? ""
                      : `<button type="button" class="primary-button" data-action="start-workout">${icon("play")}Démarrer la séance</button>`
                  }
                  <button type="button" class="secondary-button" data-action="request-adaptation">${icon("tune")}Adapter la séance</button>
                  <button type="button" class="secondary-button" data-action="open-move-session">Déplacer</button>
                  <a class="secondary-button" href="${BLOC1.guideUrl}" target="_blank" rel="noopener" style="text-decoration:none">Guide des exercices</a>
                </div>`
              : `<div class="button-row">
                  <button type="button" class="secondary-button" data-action="open-move-session">Déplacer</button>
                  <a class="secondary-button" href="${BLOC1.guideUrl}" target="_blank" rel="noopener" style="text-decoration:none">Guide des exercices</a>
                </div>`
          }
          ${MoveSessionPicker()}
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
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Check-in du matin</p>
            <h2>Moins de 20 secondes</h2>
          </div>
          <div class="head-badges">${StatusBadge(morning().completed ? "Complete" : "A completer", morning().completed ? "good" : "watch")}${SaveBadge()}</div>
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
          <div class="field full">
            <label for="waist">Tour de taille (cm, une fois par semaine)${waistDue() ? " · à mesurer" : ""}</label>
            <input id="waist" type="number" inputmode="decimal" step="0.5" min="40" max="200" value="${day().waist ?? ""}" data-scope="day" data-key="waist" placeholder="Ex. 92" />
            <p class="small-text">${escapeHtml(waistTrendText())}</p>
          </div>
        </div>
      </section>
    `;
  }

  function EveningReview() {
    return `
      <section class="form-panel">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Bilan du soir</p>
            <h2>Ce qui a vraiment été réalisé</h2>
          </div>
          <div class="head-badges">${StatusBadge(labelFor("completion", evening().completion), "info")}${SaveBadge()}</div>
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
          <div class="field full">
            <div class="range-head"><label for="calfPain">Douleur mollet aujourd'hui</label><span class="range-value ${Number(evening().calfPain) > 3 ? "alert" : ""}">${evening().calfPain}/10</span></div>
            <input id="calfPain" type="range" min="0" max="10" value="${evening().calfPain}" data-scope="evening" data-key="calfPain" />
            <p class="small-text">${
              Number(evening().calfPain) > 3
                ? "⚠️ Au-dessus de 3/10 : la règle d'arrêt s'applique — la prochaine séance à impact (course, pliométrie) est remplacée par vélo ou marche, et on en parle au bilan."
                : "Règle du bloc : > 3/10 pendant une course ou la pliométrie → stop. Douleur au réveil le lendemain → séance à impact remplacée."
            }</p>
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
          : state.imports.garmin
            ? `Activités importées : ${state.imports.garmin.count} sur ${state.imports.garmin.days} jour(s). Sommeil, HRV et FC repos ne figurent pas dans cet export — ils viennent d'Apple Santé.`
            : "Non connecté. Les données Garmin apparaîtront après import du fichier Activities.csv.",
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

  // ---- Import Garmin « Activities.csv » (v4.7) ----
  // Export Garmin Connect : une ligne par activité. On ne stocke que ce qui sert
  // au coach, et les marches restent des activités libres (pas des séances).

  const GARMIN_SESSION_KINDS = {
    course: ["course à pied", "course", "trail", "tapis de course", "course sur tapis", "running"],
    velo: ["vélo", "velo", "cyclisme", "vtt", "vélo d'intérieur", "vélo d’intérieur"],
    muscu: ["musculation", "renforcement musculaire", "force", "entraînement en force"],
    natation: ["natation", "nage", "natation en piscine"],
    marche: ["marche à pied", "marche", "randonnée", "randonnee", "marche nordique"],
  };

  function garminKind(rawType) {
    const type = String(rawType || "").toLowerCase().trim();
    for (const [kind, names] of Object.entries(GARMIN_SESSION_KINDS)) {
      if (names.some((name) => type.includes(name))) return kind;
    }
    return "autre";
  }

  // CSV Garmin : champs entre guillemets, virgules de milliers ("1,010" pas), nombres décimaux au point.
  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    const clean = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (quoted) {
        if (char === '"') {
          if (clean[i + 1] === '"') {
            value += '"';
            i++;
          } else quoted = false;
        } else value += char;
        continue;
      }
      if (char === '"') quoted = true;
      else if (char === ",") {
        row.push(value);
        value = "";
      } else if (char === "\n") {
        row.push(value);
        if (row.some((cell) => cell.trim() !== "")) rows.push(row);
        row = [];
        value = "";
      } else value += char;
    }
    row.push(value);
    if (row.some((cell) => cell.trim() !== "")) rows.push(row);
    return rows;
  }

  function garminNumber(raw) {
    if (raw === undefined || raw === null) return null;
    const text = String(raw).trim();
    if (!text || text === "--") return null;
    const value = Number(text.replace(/\s/g, "").replace(/,/g, ""));
    return Number.isFinite(value) ? value : null;
  }

  // "00:57:00" ou "00:07:18.1" → minutes décimales
  function garminMinutes(raw) {
    const text = String(raw || "").trim();
    if (!text || text === "--") return null;
    const parts = text.split(":").map((part) => Number(part));
    if (parts.some((part) => !Number.isFinite(part))) return null;
    let minutes = null;
    if (parts.length === 3) minutes = parts[0] * 60 + parts[1] + parts[2] / 60;
    else if (parts.length === 2) minutes = parts[0] + parts[1] / 60;
    if (minutes === null) return null;
    return Math.round(minutes * 10) / 10;
  }

  function parseGarminActivities(text) {
    const rows = parseCsv(text);
    if (rows.length < 2) throw new Error("Fichier vide ou illisible.");
    const header = rows[0].map((cell) => cell.trim());
    const findColumn = (...candidates) =>
      header.findIndex((name) => {
        const lower = name.toLowerCase();
        return candidates.some((candidate) => lower.includes(candidate));
      });

    const columns = {
      type: findColumn("type d'activité", "type d’activité", "activity type"),
      date: findColumn("date"),
      title: findColumn("titre", "title"),
      distance: findColumn("distance"),
      calories: findColumn("calories"),
      duration: findColumn("durée", "duree", "time"),
      hrAvg: findColumn("fréquence cardiaque moyenne", "avg hr"),
      hrMax: findColumn("fréquence cardiaque maximale", "max hr"),
      steps: findColumn("pas", "steps"),
      reps: findColumn("total répétitions", "total reps"),
      sets: findColumn("total séries", "total sets"),
      pace: findColumn("allure moyenne", "avg pace"),
      ascent: findColumn("ascension totale", "total ascent"),
    };
    if (columns.type < 0 || columns.date < 0 || columns.duration < 0) {
      throw new Error("Ce fichier ne ressemble pas à un export Garmin « Activities.csv ».");
    }

    const activities = [];
    rows.slice(1).forEach((row) => {
      const rawDate = String(row[columns.date] || "").trim();
      const match = rawDate.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
      if (!match) return;
      const [, year, month, dayPart, hours, minutes] = match;
      const kind = garminKind(row[columns.type]);
      const duration = garminMinutes(row[columns.duration]);
      if (duration === null) return;
      activities.push({
        id: `garmin-${year}${month}${dayPart}-${hours}${minutes}-${kind}`,
        source: "garmin",
        dateKey: `${year}-${month}-${dayPart}`,
        time: `${hours}:${minutes}`,
        kind,
        neat: kind === "marche",
        title: String(row[columns.title] || "").trim() || String(row[columns.type] || "").trim(),
        duration,
        km: columns.distance >= 0 ? garminNumber(row[columns.distance]) : null,
        calories: columns.calories >= 0 ? garminNumber(row[columns.calories]) : null,
        hrAvg: columns.hrAvg >= 0 ? garminNumber(row[columns.hrAvg]) : null,
        hrMax: columns.hrMax >= 0 ? garminNumber(row[columns.hrMax]) : null,
        steps: columns.steps >= 0 ? garminNumber(row[columns.steps]) : null,
        reps: columns.reps >= 0 ? garminNumber(row[columns.reps]) : null,
        sets: columns.sets >= 0 ? garminNumber(row[columns.sets]) : null,
        ascent: columns.ascent >= 0 ? garminNumber(row[columns.ascent]) : null,
      });
    });
    if (!activities.length) throw new Error("Aucune activité datée n'a pu être lue dans ce fichier.");
    return activities;
  }

  async function importGarminFile(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      state.imports.error = "Choisis le fichier CSV exporté depuis Garmin Connect (Activités → Exporter au format CSV).";
      persistNow();
      render();
      return;
    }
    try {
      const activities = parseGarminActivities(await file.text());
      let added = 0;
      let sessions = 0;
      let walks = 0;
      const days = new Set();

      activities.forEach((activity) => {
        const entry = day(activity.dateKey);
        if (!Array.isArray(entry.activities)) entry.activities = [];
        // Ré-import du même fichier : on met à jour la ligne au lieu de la dupliquer.
        const index = entry.activities.findIndex((existing) => existing.id === activity.id);
        if (index >= 0) entry.activities[index] = activity;
        else {
          entry.activities.push(activity);
          added += 1;
        }
        entry.activities.sort((a, b) => String(a.time).localeCompare(String(b.time)));
        days.add(activity.dateKey);
        if (activity.neat) walks += 1;
        else sessions += 1;
      });

      const dates = activities.map((activity) => activity.dateKey).sort();
      state.imports.garmin = {
        fileName: file.name,
        importedAt: new Date().toISOString(),
        count: activities.length,
        sessions,
        walks,
        days: days.size,
        firstDate: dates[0],
        lastDate: dates[dates.length - 1],
      };
      state.imports.error = "";
      state.sources.garmin = "partial";
      state.sources.import = "connected";

      addCoachMessage(
        "coach",
        `Import Garmin : ${activities.length} activité(s) lues sur ${days.size} jour(s) (${sessions} séance(s), ${walks} marche(s)), du ${formatFrDate(dates[0])} au ${formatFrDate(dates[dates.length - 1])}. ${
          added ? `${added} nouvelle(s) entrée(s) ajoutée(s) au journal.` : "Rien de nouveau : ces activités étaient déjà dans le journal."
        } Les marches comptent comme activité libre, pas comme séances.`
      );
      logDecision(
        "import",
        "Activités Garmin importées",
        `${activities.length} activité(s) sur ${days.size} jour(s)`,
        `Fichier ${file.name}`,
        "Eleve"
      );
      persistNow();
      render();
    } catch (error) {
      state.imports.error = error.message || "Fichier illisible.";
      state.sources.import = "error";
      persistNow();
      render();
    }
  }

  // ---- Lectures dérivées des activités importées ----

  function dayActivities(key = dateKey()) {
    const entry = key === dateKey() ? day() : journalEntry(key);
    return Array.isArray(entry?.activities) ? entry.activities : [];
  }

  function daySessions(key = dateKey()) {
    return dayActivities(key).filter((activity) => !activity.neat);
  }

  function walkStats(daysBack = 7) {
    let minutes = 0;
    let km = 0;
    let steps = 0;
    let outings = 0;
    let activeDays = 0;
    for (let i = 0; i < daysBack; i++) {
      const walks = dayActivities(keyOffset(i)).filter((activity) => activity.neat);
      if (walks.length) activeDays += 1;
      walks.forEach((walk) => {
        minutes += walk.duration || 0;
        km += walk.km || 0;
        steps += walk.steps || 0;
        outings += 1;
      });
    }
    return {
      minutes: Math.round(minutes),
      km: Math.round(km * 10) / 10,
      steps: Math.round(steps),
      outings,
      activeDays,
      daysBack,
    };
  }

  const ACTIVITY_LABELS = {
    marche: "Marche",
    course: "Course",
    velo: "Vélo",
    muscu: "Musculation",
    natation: "Natation",
    autre: "Activité",
  };

  function ActivityLine(activity) {
    const bits = [];
    if (activity.km) bits.push(`${String(activity.km).replace(".", ",")} km`);
    bits.push(`${Math.round(activity.duration)} min`);
    if (activity.hrAvg) bits.push(`${activity.hrAvg} bpm moy`);
    if (activity.calories) bits.push(`${activity.calories} kcal`);
    if (activity.sets && activity.reps) bits.push(`${activity.sets} séries · ${activity.reps} reps`);
    return `${ACTIVITY_LABELS[activity.kind] || "Activité"} ${activity.time} — ${bits.join(" · ")}`;
  }

  function TodayActivitiesCard() {
    const activities = dayActivities();
    if (!activities.length) return "";
    const walk = walkStats(1);
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Activités importées · Garmin</p>
            <h2>${activities.length} activité${activities.length > 1 ? "s" : ""} aujourd'hui</h2>
          </div>
          ${StatusBadge("Montre", "good")}
        </div>
        ${
          walk.outings
            ? `<p class="small-text">Marche du jour : ${walk.outings} sortie${walk.outings > 1 ? "s" : ""} · ${walk.minutes} min · ${String(walk.km).replace(".", ",")} km${
                walk.steps ? ` · ${walk.steps} pas` : ""
              }. Comptée comme activité libre, pas comme séance.</p>`
            : ""
        }
        <div class="exercise-list">
          ${activities
            .map((activity) => `<div class="exercise-row"><strong>${escapeHtml(ActivityLine(activity))}</strong></div>`)
            .join("")}
        </div>
      </section>
    `;
  }

  function WalkVolumeCard() {
    if (!state.imports.garmin) return "";
    const week = walkStats(7);
    if (!week.outings) return "";
    const perDay = Math.round(week.minutes / week.daysBack);
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Activité libre · 7 jours</p>
            <h2>Marche et dépense de fond</h2>
          </div>
          ${StatusBadge(perDay >= 30 ? "Bon volume" : "À augmenter", perDay >= 30 ? "good" : "watch")}
        </div>
        <div class="stat-grid">
          <div class="stat-tile"><span>Temps de marche</span><strong>${week.minutes} min</strong></div>
          <div class="stat-tile"><span>Moyenne / jour</span><strong>${perDay} min</strong></div>
          <div class="stat-tile"><span>Distance</span><strong>${String(week.km).replace(".", ",")} km</strong></div>
          <div class="stat-tile"><span>Sorties</span><strong>${week.outings}</strong></div>
          <div class="stat-tile"><span>Jours actifs</span><strong>${week.activeDays}/7</strong></div>
          <div class="stat-tile"><span>Pas cumulés</span><strong>${week.steps ? week.steps.toLocaleString("fr-FR") : "—"}</strong></div>
        </div>
        <p class="small-text">La marche ne remplace pas une séance : elle soutient la dépense quotidienne et la récupération sans ajouter de fatigue neuromusculaire.</p>
      </section>
    `;
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
          ${(() => {
            const done = [health ? "Apple Santé" : null, state.imports.garmin ? "Garmin" : null].filter(Boolean);
            return StatusBadge(done.length ? `${done.join(" + ")} importé${done.length > 1 ? "s" : ""}` : "Aucun import", done.length ? "good" : "watch");
          })()}
        </div>
        <div class="import-drop">
          <strong>Garmin — activités</strong>
          <p>Dans Garmin Connect (site web) : <em>Activités → Toutes les activités → Exporter au format CSV</em>. Sélectionne le fichier <code>Activities.csv</code>.</p>
          <label class="primary-button file-button">
            ${icon("play")}Choisir Activities.csv
            <input type="file" accept=".csv,text/csv" data-import="garmin" />
          </label>
          ${
            state.imports.garmin
              ? `<p class="small-text">Dernier import : ${escapeHtml(state.imports.garmin.fileName)} · ${state.imports.garmin.count} activité(s) sur ${state.imports.garmin.days} jour(s), du ${formatFrDate(state.imports.garmin.firstDate)} au ${formatFrDate(state.imports.garmin.lastDate)}.</p>`
              : `<p class="small-text">Séances et marches rejoignent le journal du bon jour. Ré-importer le même fichier ne crée pas de doublon.</p>`
          }
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
          state.imports.progress
            ? `<div class="notice"><strong>Import en cours</strong><p id="import-progress">Analyse en cours : préparation…</p></div>`
            : ""
        }
        ${
          state.imports.summary && !state.imports.progress
            ? `<div class="notice">
                <strong>Dernier import : ${state.imports.summary.records.toLocaleString("fr-FR")} enregistrements lus</strong>
                <p><strong>Trouvé</strong> — ${escapeHtml(state.imports.summary.found.join(", ") || "rien d'exploitable")}.</p>
                ${state.imports.summary.missing.length ? `<p><strong>Absent</strong> — ${escapeHtml(state.imports.summary.missing.join(", "))}.</p>` : ""}
              </div>`
            : ""
        }
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
    const lowerName = file.name.toLowerCase();
    if (lowerName.endsWith(".zip")) {
      state.imports.error =
        "C'est encore le ZIP. Dans l'app Fichiers, touche le zip pour le décompresser : un dossier « apple_health_export » apparaît. Choisis le fichier export.xml qui est dedans.";
      persist();
      render();
      return;
    }
    if (lowerName.includes("cda")) {
      state.imports.error = "Ce fichier est export_cda.xml (format clinique, inutilisable ici). Choisis l'autre fichier : export.xml.";
      persist();
      render();
      return;
    }

    state.imports.error = "";
    state.imports.progress = 1;
    render();

    try {
      const parsed = await parseAppleHealthStream(file, (pct) => {
        const el = document.getElementById("import-progress");
        if (el) el.textContent = `Analyse en cours : ${pct} % de ${Math.max(1, Math.round(file.size / 1048576))} Mo — ne quitte pas cet écran.`;
      });
      state.imports.health = parsed;
      state.imports.error = "";
      state.imports.progress = 0;
      if (state.dataMode !== "demo") state.dataMode = "custom";
      state.sources.apple = "connected";
      state.sources.import = "connected";

      // Fusionne les pesées quotidiennes dans le journal, sans écraser une saisie manuelle.
      let mergedWeights = 0;
      Object.entries(parsed.dailyWeights || {}).forEach(([key, weight]) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        const entry = day(key);
        const current = Number(entry.weight);
        if (!Number.isFinite(current) || current <= 0) {
          entry.weight = Math.round(weight * 10) / 10;
          mergedWeights += 1;
        }
      });

      // v7.2.0 : bilan honnête. L'ancien message annonçait que le HRV alimentait
      // le readiness même quand il était absent — d'où le « rien ne se passe
      // quand j'importe » : l'app disait que ça marchait là où ça ne marchait pas.
      const found = [];
      const missing = [];
      if (parsed.rhr) found.push(`FC repos ${rounded(parsed.rhr)} bpm${parsed.rhrDays > 1 ? ` (${parsed.rhrDays} jours d'historique)` : ""}`);
      else missing.push("FC de repos");
      if (parsed.sleepMinutes) found.push(`sommeil ${formatMinutes(Math.round(parsed.sleepMinutes))}${parsed.sleepDays > 1 ? ` (${parsed.sleepDays} nuits)` : ""}`);
      else missing.push("sommeil");
      if (parsed.stepsAvg || parsed.steps) found.push(`pas ${(parsed.stepsAvg || parsed.steps).toLocaleString("fr-FR")}/jour`);
      if (mergedWeights) found.push(`${mergedWeights} pesée(s) ajoutée(s) au journal`);
      else if (!parsed.weightKg) missing.push("poids");
      if (!parsed.hrvMs) missing.push("HRV (Garmin ne l'écrit pas dans Apple Santé — aucun réglage ne corrige ça)");
      if (!parsed.vo2) missing.push("VO2max");
      state.imports.summary = {
        at: new Date().toISOString(),
        records: parsed.records,
        found,
        missing,
      };
      addCoachMessage(
        "coach",
        `Import terminé : ${parsed.records} enregistrements lus. Trouvé : ${found.join(", ") || "rien d'exploitable"}.${
          missing.length ? ` Absent : ${missing.join(", ")}.` : ""
        }`
      );
      persist();
      render();
    } catch (error) {
      state.imports.progress = 0;
      state.imports.error = error.message || "Le fichier n’a pas pu être importé.";
      persist();
      render();
    }
  }

  function parseAppleDate(value) {
    if (!value) return null;
    // Format Apple : "2026-07-10 07:12:34 +0200" → ISO fiable sur tous les navigateurs.
    const iso = value.replace(" ", "T").replace(/ ([+-])(\d{2}):?(\d{2})$/, "$1$2:$3");
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  async function parseAppleHealthStream(file, onProgress) {
    const CHUNK = 6 * 1024 * 1024;
    const TAIL_MAX = 1024 * 1024;
    let offset = 0;
    let tail = "";
    let records = 0;
    let sawAnyRecord = false;
    const latest = {};
    const dailySteps = new Map();
    const dailyDistance = new Map();
    const dailySleep = new Map();
    const dailyRhr = new Map(); // v7.2.0 : historique FC repos, pas seulement la dernière valeur
    const dailyWeights = {};
    const recordRe = /<Record\s[^>]*?\/>/g;

    const attr = (chunk, name) => {
      const marker = `${name}="`;
      const start = chunk.indexOf(marker);
      if (start === -1) return "";
      const end = chunk.indexOf('"', start + marker.length);
      return end === -1 ? "" : chunk.slice(start + marker.length, end);
    };

    const setLatest = (key, stamp, value) => {
      if (!stamp) return;
      if (!latest[key] || stamp > latest[key].date) latest[key] = { value, date: stamp };
    };

    while (offset < file.size) {
      const text = await file.slice(offset, offset + CHUNK).text();
      offset += CHUNK;
      const data = tail + text;
      let processable;
      if (offset >= file.size) {
        processable = data;
        tail = "";
      } else {
        const boundary = data.lastIndexOf("/>");
        if (boundary === -1) {
          tail = data.length > TAIL_MAX ? data.slice(-TAIL_MAX) : data;
          continue;
        }
        processable = data.slice(0, boundary + 2);
        tail = data.slice(boundary + 2);
        if (tail.length > TAIL_MAX) tail = tail.slice(-TAIL_MAX);
      }

      const matches = processable.match(recordRe);
      if (matches) {
        sawAnyRecord = true;
        for (const rec of matches) {
          const type = attr(rec, "type");
          const isWeight = type.includes("BodyMass") && !type.includes("BodyMassIndex");
          const interesting =
            isWeight ||
            type.includes("RestingHeartRate") ||
            type.includes("HeartRateVariabilitySDNN") ||
            type.includes("VO2Max") ||
            type.includes("StepCount") ||
            type.includes("DistanceWalkingRunning") ||
            type.includes("SleepAnalysis");
          if (!interesting) continue;
          records += 1;

          const rawValue = attr(rec, "value");
          const value = Number.parseFloat(rawValue);
          const startRaw = attr(rec, "startDate");
          const endRaw = attr(rec, "endDate") || startRaw;
          const dayKey = startRaw.slice(0, 10);
          const stamp = endRaw.slice(0, 19);

          if (isWeight && Number.isFinite(value)) {
            const unit = attr(rec, "unit");
            const kg = unit === "lb" ? value * 0.453592 : value;
            setLatest("weight", stamp, kg);
            if (dayKey) dailyWeights[dayKey] = kg;
          } else if (type.includes("RestingHeartRate") && Number.isFinite(value)) {
            setLatest("rhr", stamp, value);
            if (dayKey) dailyRhr.set(dayKey, value);
          } else if (type.includes("HeartRateVariabilitySDNN") && Number.isFinite(value)) {
            setLatest("hrv", stamp, value);
          } else if (type.includes("VO2Max") && Number.isFinite(value)) {
            setLatest("vo2", stamp, value);
          } else if (type.includes("StepCount") && Number.isFinite(value) && dayKey) {
            dailySteps.set(dayKey, (dailySteps.get(dayKey) || 0) + value);
          } else if (type.includes("DistanceWalkingRunning") && Number.isFinite(value) && dayKey) {
            const unit = attr(rec, "unit");
            const km = unit === "mi" ? value * 1.60934 : unit === "m" ? value / 1000 : value;
            dailyDistance.set(dayKey, (dailyDistance.get(dayKey) || 0) + km);
          } else if (type.includes("SleepAnalysis") && rawValue && rawValue.includes("Asleep")) {
            const start = parseAppleDate(startRaw);
            const end = parseAppleDate(endRaw);
            if (start && end && dayKey) {
              dailySleep.set(dayKey, (dailySleep.get(dayKey) || 0) + Math.max(0, (end - start) / 60000));
            }
          }
        }
      }

      if (onProgress) onProgress(Math.min(99, Math.round((offset / file.size) * 100)));
      // Laisse l'interface respirer entre deux tranches.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    if (!sawAnyRecord) {
      throw new Error("Ce fichier ne contient aucun enregistrement Apple Santé. Vérifie que tu as bien choisi export.xml (pas export_cda.xml).");
    }
    if (!records) {
      throw new Error("Fichier lu, mais aucune donnée exploitable (poids, sommeil, FC, HRV, pas). L'export semble vide pour ces catégories.");
    }

    const latestFromMap = (map) => {
      const keys = [...map.keys()].sort();
      const key = keys[keys.length - 1];
      return key ? { day: key, value: map.get(key) } : null;
    };
    const steps = latestFromMap(dailySteps);
    const distance = latestFromMap(dailyDistance);
    const sleep = latestFromMap(dailySleep);
    // v7.2.0 : moyennes personnelles sur les N derniers jours disponibles.
    // C'est la référence qui compte pour la FC de repos et le sommeil — pas la
    // plage de population affichée jusqu'ici dans les fiches.
    const averageOfLast = (map, n) => {
      const days = [...map.keys()].sort().slice(-n);
      const values = days.map((d) => map.get(d)).filter((v) => Number.isFinite(v) && v > 0);
      if (!values.length) return null;
      return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 10) / 10;
    };
    const history = (map, n) => {
      const days = [...map.keys()].sort().slice(-n);
      return days.map((d) => ({ day: d, value: Math.round(map.get(d) * 10) / 10 }));
    };

    // Moyenne des pas sur les 7 derniers jours disponibles (dépense de fond réelle).
    const stepsAvg = (() => {
      const days = [...dailySteps.keys()].sort().slice(-7);
      const values = days.map((day) => dailySteps.get(day)).filter((v) => Number.isFinite(v) && v > 0);
      if (!values.length) return null;
      return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
    })();

    return {
      source: "Apple Santé",
      fileName: file.name,
      importedAt: new Date().toISOString(),
      records,
      weightKg: latest.weight ? Math.round(latest.weight.value * 10) / 10 : null,
      rhr: latest.rhr?.value || null,
      hrvMs: latest.hrv?.value || null,
      vo2: latest.vo2?.value || null,
      steps: steps?.value || null,
      stepsAvg: stepsAvg,
      rhrAvg7: averageOfLast(dailyRhr, 7),
      rhrAvg30: averageOfLast(dailyRhr, 30),
      rhrHistory: history(dailyRhr, 30),
      sleepAvg7: averageOfLast(dailySleep, 7),
      sleepAvg30: averageOfLast(dailySleep, 30),
      sleepHistory: history(dailySleep, 14),
      rhrDays: dailyRhr.size,
      sleepDays: dailySleep.size,
      distanceKm: distance?.value || null,
      sleepMinutes: sleep?.value || null,
      dailyWeights,
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

  // ---- Fiches d'exercices (v5.0) ----
  // Extraites du guide du bloc : au lieu d'ouvrir le guide et d'y chercher l'exercice,
  // on touche la ligne de l'exercice et la fiche s'ouvre dans l'app.

  const EXERCISE_LIBRARY = {
    "Squat": {
      "title": "Squat barre",
      "rx": "4 × 4-6 · RPE 7→8 · repos 3 min",
      "exec": "barre sur les trapèzes, pieds largeur épaules pointes légèrement ouvertes. Inspire, gaine, descends en poussant les genoux dans l'axe des orteils jusqu'à cuisses sous la parallèle (ou ta profondeur propre), remonte en poussant le sol.",
      "err": "talons qui décollent, genoux qui rentrent, dos qui s'arrondit en bas. Si la cheville limite ta profondeur, petites cales sous les talons.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=Dr41gZwfTfM",
          "label": "Vidéo — Olymp'Fit (FR)"
        }
      ]
    },
    "Presse ou fentes marchées": {
      "title": "Presse à cuisses ou fentes marchées",
      "rx": "3 × 8-10 · RPE 7 · repos 2 min",
      "exec": "pieds milieu du plateau largeur épaules, descends jusqu'à ~90° de genou sans décoller le bas du dos du dossier, pousse sans verrouiller brutalement les genoux.",
      "err": "amplitude trop courte, bas du dos qui s'enroule en bas, genoux qui rentrent.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=aFoU2J4dru8",
          "label": "Vidéo presse — EspaceMusculation (FR)"
        },
        {
          "url": "https://www.youtube.com/watch?v=L7iPmk1GThE",
          "label": "Vidéo fentes — MaxiPerformance (FR)"
        }
      ]
    },
    "Leg curl": {
      "title": "Leg curl",
      "rx": "3 × 8-12 · RPE 8 · repos 90 s",
      "exec": "réglage machine pour que le genou soit aligné avec l'axe de rotation. Fléchis en contrôlant, serre en haut 1 s, redescends en 2-3 s sans laisser tomber la charge.",
      "err": "hanches qui décollent du banc, retour balistique.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=UHGYDxCQPoc",
          "label": "Vidéo — TeamSuperPhysique (FR)"
        }
      ]
    },
    "Mollets debout": {
      "title": "Mollets debout (genou tendu) ⚠",
      "rx": "3 × 10-12 · descente 3 s · repos 90 s",
      "exec": "pleine amplitude — étirement complet en bas (talon sous le niveau de l'appui), montée maximale sur pointes, descente lente en 3 secondes. C'est ton renforcement protecteur du gastrocnémien.",
      "err": "rebond en bas, amplitude partielle, aller trop lourd trop vite. Douleur > 3/10 → stop et signale-le.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=p8mRMZY0fB0",
          "label": "Vidéo — VP Coaching (FR)"
        }
      ]
    },
    "Gainage lesté": {
      "title": "Gainage lesté (planche ou roulette)",
      "rx": "3 séries · repos 60 s",
      "exec": "planche lestée 30-45 s (bassin rétroversé, fessiers serrés) ou roulette : à genoux, déroule vers l'avant en gardant le bassin verrouillé, reviens avec les abdos — pas avec les bras.",
      "err": "bas du dos qui creuse — c'est LE signal d'arrêt de la série.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=yJ2Or6zX3LM",
          "label": "Vidéo roulette — Olymp'Fit (FR)"
        }
      ]
    },
    "Extension lombaire (banc à lombaires)": {
      "title": "Extension lombaire au banc",
      "rx": "3 × 12 · RPE 7 · repos 90 s",
      "exec": "banc à 45°, appui sur les cuisses (crête du bassin libre), descends dos neutre, remonte jusqu'à l'alignement tronc-jambes en serrant fessiers et ischios — pas d'hyperextension.",
      "err": "monter trop haut (cambrure excessive), arrondir volontairement le dos en bas.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=7bDZtdQUj5A",
          "label": "Vidéo — TeamSuperPhysique (FR)"
        }
      ]
    },
    "Développé couché": {
      "title": "Développé couché barre",
      "rx": "4 × 4-6 · RPE 7→8 · repos 3 min",
      "exec": "omoplates serrées et abaissées, léger arc lombaire, pieds ancrés. Descends la barre vers le bas des pectoraux, coudes à ~45-70° du buste, pousse en ligne légèrement oblique vers les yeux.",
      "err": "coudes évasés à 90°, fesses qui décollent, rebond sur la poitrine.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=feWp7jZopI8",
          "label": "Vidéo — Olymp'Fit (FR)"
        }
      ]
    },
    "Tractions (lestées si > 8)": {
      "title": "Tractions (lestées si > 8 reps)",
      "rx": "4 × 5-8 · RPE 8 · repos 2-3 min",
      "exec": "départ bras tendus omoplates engagées, tire les coudes vers les hanches jusqu'au menton au-dessus de la barre, redescends en contrôlant jusqu'à l'extension complète.",
      "err": "demi-amplitude, balancement (kipping), épaules qui montent vers les oreilles.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=xxPt6sxC8xo",
          "label": "Vidéo — Amplitude Realm (FR)"
        }
      ]
    },
    "Tractions pronation": {
      "title": "Tractions (lestées si > 8 reps)",
      "rx": "4 × 5-8 · RPE 8 · repos 2-3 min",
      "exec": "départ bras tendus omoplates engagées, tire les coudes vers les hanches jusqu'au menton au-dessus de la barre, redescends en contrôlant jusqu'à l'extension complète.",
      "err": "demi-amplitude, balancement (kipping), épaules qui montent vers les oreilles.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=xxPt6sxC8xo",
          "label": "Vidéo — Amplitude Realm (FR)"
        }
      ]
    },
    "Développé militaire": {
      "title": "Développé militaire barre",
      "rx": "3 × 6-8 · RPE 7,5 · repos 2 min",
      "exec": "debout, fessiers et abdos serrés, barre au niveau des clavicules. Pousse verticalement en rentrant légèrement la tête puis en la repassant devant, verrouillage complet au-dessus du crâne.",
      "err": "cambrure lombaire excessive (pousser avec le dos), trajectoire vers l'avant.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=_JOHuViN9Mk",
          "label": "Vidéo — All-Musculation (FR)"
        }
      ]
    },
    "Rowing haltère unilatéral": {
      "title": "Rowing haltère unilatéral",
      "rx": "3 × 8-10 / bras · RPE 8 · repos 90 s",
      "exec": "main et genou opposés sur le banc, dos plat. Tire l'haltère vers la hanche (pas vers l'épaule), coude près du corps, serre l'omoplate en haut, descends en étirement complet.",
      "err": "rotation du buste pour tricher, tirer avec le biceps, dos rond.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=xJX8_oLf-Vo",
          "label": "Vidéo — Antoine MH (FR)"
        }
      ]
    },
    "Rowing barre": {
      "title": "Rowing haltère unilatéral",
      "rx": "3 × 8-10 / bras · RPE 8 · repos 90 s",
      "exec": "main et genou opposés sur le banc, dos plat. Tire l'haltère vers la hanche (pas vers l'épaule), coude près du corps, serre l'omoplate en haut, descends en étirement complet.",
      "err": "rotation du buste pour tricher, tirer avec le biceps, dos rond.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=xJX8_oLf-Vo",
          "label": "Vidéo — Antoine MH (FR)"
        }
      ]
    },
    "Face pull": {
      "title": "Face pull",
      "rx": "3 × 12-15 · RPE 8 · repos 60 s",
      "exec": "poulie hauteur visage, corde tirée vers le front/les yeux en écartant les mains, coudes hauts, rotation externe finale (poings vers l'arrière). Santé d'épaule = exercice clé.",
      "err": "trop lourd (ça devient un rowing), coudes qui tombent.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=67PKTDSKWWM",
          "label": "Vidéo — Guillaume Simon (FR)"
        }
      ]
    },
    "Face pull + gainage": {
      "title": "Face pull",
      "rx": "3 × 12-15 · RPE 8 · repos 60 s",
      "exec": "poulie hauteur visage, corde tirée vers le front/les yeux en écartant les mains, coudes hauts, rotation externe finale (poings vers l'arrière). Santé d'épaule = exercice clé.",
      "err": "trop lourd (ça devient un rowing), coudes qui tombent.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=67PKTDSKWWM",
          "label": "Vidéo — Guillaume Simon (FR)"
        }
      ]
    },
    "Curl biceps barre EZ": {
      "title": "Curl biceps barre EZ",
      "rx": "3 × 10-12 · RPE 8 · repos 75 s",
      "exec": "coudes fixes le long du corps, monte la barre en contractant, descends en 2-3 s jusqu'à l'extension quasi complète.",
      "err": "élan du buste, coudes qui avancent en haut du mouvement.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=l0hojGc8ss4",
          "label": "Vidéo — Toute la Musculation (FR)"
        }
      ]
    },
    "Soulevé de terre roumain": {
      "title": "Soulevé de terre roumain",
      "rx": "4 × 6-8 · RPE 7 · repos 3 min",
      "exec": "départ debout barre en main, genoux légèrement fléchis et FIXES. Pousse les hanches vers l'arrière, barre au ras des cuisses/tibias, descends jusqu'à l'étirement franc des ischios (mi-tibia environ), remonte en poussant les hanches vers l'avant.",
      "err": "dos qui s'arrondit, barre qui s'éloigne des jambes, plier les genoux (ça devient un soulevé classique).",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=QrgidWFKaYs",
          "label": "Vidéo — Myprotein France (FR)"
        }
      ]
    },
    "Squat bulgare": {
      "title": "Squat bulgare",
      "rx": "3 × 8-10 / jambe · RPE 8 · repos 90 s",
      "exec": "pied arrière sur un banc, pied avant à ~60-70 cm. Descends verticalement, genou avant dans l'axe du pied, jusqu'à ce que le genou arrière frôle le sol. Haltères en mains quand le poids du corps devient facile.",
      "err": "pied avant trop près (genou qui file devant), buste qui s'effondre, pousser avec la jambe arrière.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=2C-uNgKwPLE",
          "label": "Vidéo — ScottHermanFitness (EN)"
        }
      ]
    },
    "Hip thrust": {
      "title": "Hip thrust barre",
      "rx": "3 × 8-12 · RPE 8 · repos 2 min",
      "exec": "haut du dos sur le banc, barre sur les hanches (coussin), pieds à plat genoux à 90° en haut. Pousse par les talons jusqu'à l'alignement complet épaules-hanches-genoux, menton rentré, serre fort 1 s en haut.",
      "err": "hyperextension lombaire en haut (pousse avec les fessiers, pas le dos), amplitude coupée.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=IMPB5EMTcqI",
          "label": "Vidéo — Myprotein France (FR)"
        }
      ]
    },
    "Mollets assis (soléaire)": {
      "title": "Mollets assis (soléaire) ⚠",
      "rx": "3 × 12-15 · tempo contrôlé · repos 60 s",
      "exec": "genoux fléchis à 90° sous le boudin, pleine amplitude, montée complète et descente lente. Genou fléchi = c'est le soléaire qui travaille — LE muscle du coureur, ta priorité prévention.",
      "err": "rebonds rapides, amplitude partielle. Douleur > 3/10 → stop.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=6O5hh1rBtx8",
          "label": "Vidéo — Colossus Fitness (EN)"
        }
      ]
    },
    "Gainage anti-rotation": {
      "title": "Pallof press (anti-rotation)",
      "rx": "3 × 10 / côté · repos 60 s",
      "exec": "poulie hauteur poitrine, de profil, mains jointes au sternum. Tends les bras devant toi SANS laisser le buste tourner, tiens 2 s, reviens. La résistance essaie de te faire pivoter — tu résistes.",
      "err": "épaules qui tournent, se pencher, trop lourd.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=_2xWmYNnFS8",
          "label": "Vidéo — Colossus Fitness (EN)"
        }
      ]
    },
    "Abduction de hanche (machine ou bande élastique)": {
      "title": "Abduction de hanche",
      "rx": "3 × 15 / jambe · RPE 7 · repos 60 s",
      "exec": "machine (buste légèrement penché en avant pour cibler le moyen fessier) ou élastique au-dessus des genoux. Écarte en contrôlant, tiens 1 s, reviens lentement. Stabilité du bassin = genoux protégés en course.",
      "err": "mouvement balistique, se pencher en arrière.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=OjI5OpV6IWA",
          "label": "Vidéo — Colossus Fitness (EN)"
        }
      ]
    },
    "Développé incliné haltères": {
      "title": "Développé incliné haltères",
      "rx": "4 × 8-10 · RPE 8 · repos 2 min",
      "exec": "banc à 30°, omoplates serrées. Descends les haltères de part et d'autre de la poitrine haute, coudes à ~45°, pousse en rapprochant légèrement les haltères en haut sans les entrechoquer.",
      "err": "banc trop incliné (ça devient des épaules), amplitude coupée en bas.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=AQFvfZO3Rb4",
          "label": "Vidéo — TeamSuperPhysique (FR)"
        }
      ]
    },
    "Tirage vertical prise neutre": {
      "title": "Tirage vertical prise neutre",
      "rx": "3 × 8-12 · RPE 8 · repos 90 s",
      "exec": "poignées neutres (paumes face à face), buste légèrement incliné en arrière et fixe. Tire vers le haut des pectoraux en descendant les coudes, étirement complet en haut à chaque rep.",
      "err": "se balancer pour tirer, couper l'étirement du haut.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=kVB6SlEyjQM",
          "label": "Vidéo — Physique Development (EN)"
        }
      ]
    },
    "Élévations latérales": {
      "title": "Élévations latérales",
      "rx": "4 × 12-15 · RPE 8-9 · repos 60 s",
      "exec": "léger penché en avant, coudes à peine fléchis. Monte les haltères sur les côtés jusqu'à l'horizontale, comme si tu versais un verre d'eau, descends en 2 s.",
      "err": "élan des jambes, monter au-dessus de l'horizontale avec les trapèzes, trop lourd.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=q_DYeb_daeY",
          "label": "Vidéo — Olymp'Fit (FR)"
        }
      ]
    },
    "Rowing câble assis": {
      "title": "Rowing câble assis",
      "rx": "3 × 10-12 · RPE 8 · repos 90 s",
      "exec": "buste vertical et fixe, tire la poignée vers le nombril en serrant les omoplates, laisse revenir en étirement complet sans te faire emporter vers l'avant.",
      "err": "balancement avant-arrière du buste, épaules enroulées.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=w2Q7LbkhtLI",
          "label": "Vidéo — Olymp'Fit (FR)"
        }
      ]
    },
    "Curl incliné + triceps corde": {
      "title": "Superset : curl incliné + extension triceps corde",
      "rx": "3 × 10-12 chaque · repos 75 s",
      "exec": "",
      "err": "coudes qui avancent (curl), coudes qui s'écartent (triceps).",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=wBvTNeXcbxQ",
          "label": "Vidéo curl — Enzo TV (FR)"
        },
        {
          "url": "https://www.youtube.com/watch?v=n2FSCB4vRSA",
          "label": "Vidéo triceps — Colossus (EN)"
        }
      ]
    },
    "Élévations Y (banc incliné)": {
      "title": "Élévations Y sur banc incliné",
      "rx": "3 × 12-15 · RPE 7-8 · repos 60 s",
      "exec": "à plat ventre sur banc incliné, haltères légers, monte les bras en Y (pouces vers le ciel) en serrant le bas des trapèzes, redescends lentement. Santé d'épaule et posture.",
      "err": "trop lourd (c'est un exercice léger par nature), hausser les épaules.",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=yR7cIRWw9ZY",
          "label": "Vidéo — Live Lean TV (EN)"
        }
      ]
    },
    "Pliométrie · A-skip": {
      "title": "A-skip",
      "rx": "3 × 10 m",
      "exec": "montée de genou dynamique avec petit skip sur l'appui opposé, pied qui griffe le sol sous le bassin, bras en opposition. Rythme > vitesse.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=IBqY1eoDH8U",
          "label": "Vidéo — Road To Speed (FR)"
        }
      ]
    },
    "Pliométrie · Ankle bounces (pogo)": {
      "title": "Ankle bounces (pogo)",
      "rx": "3 × 10",
      "exec": "jambes quasi tendues, rebonds de faible amplitude uniquement par les chevilles, contacts brefs et élastiques. Prépare le mollet à la course sans les autres contraintes.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=c2LBofIzUqs",
          "label": "Vidéo — Live Lean TV (EN)"
        }
      ]
    },
    "Pliométrie · Médecine-ball rotation": {
      "title": "Lancer de médecine-ball en rotation",
      "rx": "3 × 6 / côté",
      "exec": "de profil face à un mur, pivote hanches puis buste et lance la balle explosivement contre le mur. La puissance part des hanches, pas des bras.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=NP2e1Szrj28",
          "label": "Vidéo — Live Lean TV (EN)"
        },
        {
          "url": "https://www.youtube.com/watch?v=7WgzHOQGgYw",
          "label": "Vidéo — Elevate Yourself (EN)"
        }
      ]
    },
    "Pliométrie · Bondissements latéraux": {
      "title": "Bondissements latéraux",
      "rx": "3 × 6 / côté",
      "exec": "pousse latéralement d'une jambe, atterris stable sur l'autre (genou aligné, 1 s de stabilisation), amplitude faible puis moyenne au fil des semaines.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=niEGdFUQ6sY",
          "label": "Vidéo — LPS Athletic (EN)"
        }
      ]
    },
    "Pliométrie · Départs sprint arrêtés": {
      "title": "Départs sprint arrêtés",
      "rx": "4 × 10-15 m à ~80 %",
      "exec": "position fendue, penche-toi et pousse fort les premiers appuis, corps incliné vers l'avant. Allure progressive, JAMAIS au max.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=GzZjzBm-56k",
          "label": "Vidéo — Simple Speed Coach (EN)"
        },
        {
          "url": "https://www.youtube.com/watch?v=_x1kw2WVoR4",
          "label": "Vidéo — Rehab My Patient (EN)"
        }
      ]
    },
    "Pliométrie · Bounding (bonds horizontaux)": {
      "title": "Bounding (bonds horizontaux)",
      "rx": "3 × 8 contacts",
      "exec": "foulées bondissantes exagérées, pousse complète de la jambe arrière, bras amples.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=eIjuMzIFREs",
          "label": "Vidéo — Simple Speed Coach (EN)"
        }
      ]
    },
    "Pliométrie · Sprints 20 m": {
      "title": "Sprints 20 m",
      "rx": "4 × à 85-90 %",
      "exec": "départ arrêté, accélération progressive sur 20 m, récupération marchée complète entre les reps.",
      "err": "",
      "videos": []
    },
    "Pliométrie · Saut vertical (CMJ)": {
      "title": "Saut vertical contremouvement (CMJ)",
      "rx": "3 × 5 — à noter dans l'app",
      "exec": "descente rapide en quart de squat, remonte immédiatement en sautant le plus haut possible, mains libres. C'est ta référence de puissance du bloc.",
      "err": "",
      "videos": [
        {
          "url": "https://www.youtube.com/watch?v=Jb63W4LQ8Ak",
          "label": "Vidéo — Strength-Forge (EN)"
        }
      ]
    },
    "Pliométrie · Sautillements unipodaux": {
      "title": "Sautillements unipodaux",
      "rx": "Test et exercice · contacts brefs",
      "exec": "Sur une jambe, sautillements de faible amplitude, uniquement par la cheville, genou légèrement fléchi et souple. Contacts brefs et silencieux : le bruit trahit un amorti mou. C'est le test de référence de ton mollet — 15 sautillements indolores sont un des deux critères de passage de palier pliométrique.",
      "err": "Réception talon, genou qui s'écrase, amplitude trop grande. Douleur > 3/10 → stop, et signale-le au bilan du soir.",
      "videos": []
    },
    "Pliométrie · Sauts de haies basses": {
      "title": "Sauts de haies basses",
      "rx": "Contacts brefs · récupération complète entre les séries",
      "exec": "Haies basses (20-30 cm) alignées. Franchis à pieds joints, réception sur l'avant du pied puis rebond immédiat vers la haie suivante. Objectif : temps de contact au sol le plus court possible, pas la hauteur.",
      "err": "Chercher la hauteur au lieu de la vitesse de rebond, réception talon, séries trop longues qui dégradent la qualité. Arrête la série dès que les contacts s'allongent.",
      "videos": []
    }
  };

  function exerciseSheet(name) {
    return EXERCISE_LIBRARY[name] || null;
  }

  function ExerciseRow(item, context = "") {
    const sheet = exerciseSheet(item.name);
    if (!sheet) {
      return `<div class="exercise-row"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.detail || "")}</span></div>`;
    }
    return `
      <button type="button" class="exercise-row tappable" data-action="open-exercise" data-exercise="${escapeHtml(item.name)}"${
        context ? ` data-exercise-detail="${escapeHtml(item.detail || "")}"` : ""
      }>
        <span class="exercise-main">
          <strong>${escapeHtml(item.name)}</strong>
          <span>${escapeHtml(item.detail || sheet.rx)}</span>
        </span>
        <span class="exercise-cue">Comment faire ›</span>
      </button>
    `;
  }

  let liveTimerId = null;

  // Le chrono se met à jour tout seul sans reconstruire l'écran.
  function syncLiveTimer() {
    const node = document.querySelector("[data-live-timer]");
    if (!node) {
      if (liveTimerId) {
        clearInterval(liveTimerId);
        liveTimerId = null;
      }
      return;
    }
    if (liveTimerId) return;
    liveTimerId = setInterval(() => {
      const target = document.querySelector("[data-live-timer]");
      if (!target) {
        clearInterval(liveTimerId);
        liveTimerId = null;
        return;
      }
      target.textContent = `${liveWorkoutMinutes()} min`;
    }, 20000);
  }

  function liveWorkoutMinutes() {
    const started = day().workoutStartedAt;
    if (!started) return 0;
    const startedAt = new Date(started).getTime();
    if (Number.isNaN(startedAt)) return 0;
    return Math.max(0, Math.round((Date.now() - startedAt) / 60000));
  }

  function isExerciseDone(name) {
    return (day().exercisesDone || []).includes(name);
  }

  // En séance : chaque exercice se coche d'un appui, et reste ouvrable pour sa fiche.
  function LiveExerciseRow(item) {
    const done = isExerciseDone(item.name);
    const hasSheet = Boolean(exerciseSheet(item.name));
    return `
      <div class="exercise-row live ${done ? "done" : ""}">
        <button type="button" class="ex-check ${done ? "done" : ""}" data-action="toggle-exercise-done" data-name="${escapeHtml(item.name)}" aria-pressed="${done}" aria-label="${done ? "Décocher" : "Cocher"} ${escapeHtml(item.name)}">
          ${done ? "✓" : ""}
        </button>
        <button type="button" class="ex-open" ${hasSheet ? `data-action="open-exercise" data-exercise="${escapeHtml(item.name)}" data-exercise-detail="${escapeHtml(item.detail || "")}"` : "disabled"}>
          <span class="exercise-main">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.detail || "")}</span>
          </span>
          ${hasSheet ? `<span class="exercise-cue">Fiche ›</span>` : ""}
        </button>
      </div>
    `;
  }

  function LiveWorkoutBanner(session) {
    const minutes = liveWorkoutMinutes();
    const total = (session.exercises || []).length;
    const done = (session.exercises || []).filter((item) => isExerciseDone(item.name)).length;
    return `
      <div class="live-banner">
        <div class="live-info">
          <span class="live-tag">Séance en cours</span>
          <strong data-live-timer>${minutes} min</strong>
          ${total ? `<span>${done} exercice${done > 1 ? "s" : ""} sur ${total}</span>` : ""}
        </div>
        <div class="live-actions">
          <button type="button" class="primary-button" data-action="finish-workout">Terminer</button>
          <button type="button" class="ghost-button" data-action="cancel-workout">Annuler</button>
        </div>
      </div>
    `;
  }

  function ExerciseSheetModal() {
    const name = state.openExercise;
    if (!name) return "";
    const sheet = exerciseSheet(name);
    if (!sheet) return "";
    const prescription = state.openExerciseDetail || sheet.rx;
    // Les fiches pliométriques du guide n'ont pas de rubrique « erreurs » :
    // avec un mollet qui sort de rééducation, la règle de sécurité doit rester visible.
    const errors =
      sheet.err ||
      (name.startsWith("Pliométrie")
        ? "Contacts au sol brefs et silencieux : un bruit sourd trahit un amorti mou. Qualité avant quantité — arrête la série dès que les contacts s'allongent. Douleur mollet > 3/10 pendant ou douleur au réveil le lendemain → stop, signale-le au bilan du soir et redescends d'un palier."
        : "");
    return `
      <div class="sheet-backdrop">
        <section class="sheet" role="dialog" aria-label="${escapeHtml(sheet.title)}" data-stop-close>
          <div class="sheet-head">
            <div>
              <p class="eyebrow">Fiche exercice</p>
              <h2>${escapeHtml(sheet.title)}</h2>
            </div>
            <button type="button" class="icon-button" data-action="close-exercise" aria-label="Fermer">✕</button>
          </div>
          ${prescription ? `<p class="sheet-rx">${escapeHtml(prescription)}</p>` : ""}
          <div class="sheet-body">
            <div class="sheet-block">
              <h3>Exécution</h3>
              <p>${escapeHtml(sheet.exec.charAt(0).toUpperCase() + sheet.exec.slice(1))}</p>
            </div>
            ${
              errors
                ? `<div class="sheet-block warn">
                    <h3>Erreurs à éviter</h3>
                    <p>${escapeHtml(errors)}</p>
                  </div>`
                : ""
            }
            ${
              sheet.videos.length
                ? `<div class="sheet-videos">
                    ${sheet.videos
                      .map((video) => `<a class="secondary-button" href="${escapeHtml(video.url)}" target="_blank" rel="noopener">▶ ${escapeHtml(video.label)}</a>`)
                      .join("")}
                  </div>`
                : ""
            }
            <p class="small-text">Progression : quand tu atteins le haut de la fourchette de reps sur toutes les séries au RPE cible, +2,5 kg (haut du corps) ou +5 kg (bas du corps) la séance suivante.</p>
          </div>
        </section>
      </div>
    `;
  }

  // ---- Météo (v5.6) ----
  // Open-Meteo : pas de clé, pas de compte, appel direct depuis le téléphone.
  // Sert à adapter la séance du jour, surtout les courses : la chaleur fait dériver
  // la fréquence cardiaque à allure égale, le froid rallonge l'échauffement du mollet.

  const DEFAULT_PLACE = { lat: 43.61, lon: 3.88, place: "Montpellier" };

  function formatClock(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    return `à ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function weatherFresh() {
    const weather = state.weather;
    if (!weather || weather.day !== dateKey()) return false;
    const age = Date.now() - new Date(weather.fetchedAt).getTime();
    return Number.isFinite(age) && age < 3 * 3600 * 1000;
  }

  async function fetchWeather({ lat, lon, place }) {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&hourly=temperature_2m,apparent_temperature,precipitation_probability,relative_humidity_2m,wind_speed_10m" +
      "&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m,relative_humidity_2m" +
      "&forecast_days=1&timezone=auto";
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error("Météo indisponible");
    const data = await response.json();
    const hours = (data.hourly?.time || []).map((time, index) => ({
      time: String(time).slice(11, 16),
      temp: data.hourly.temperature_2m?.[index] ?? null,
      feels: data.hourly.apparent_temperature?.[index] ?? null,
      rain: data.hourly.precipitation_probability?.[index] ?? null,
      humidity: data.hourly.relative_humidity_2m?.[index] ?? null,
      wind: data.hourly.wind_speed_10m?.[index] ?? null,
    }));
    state.weather = {
      lat,
      lon,
      place: place || state.weather?.place || "",
      day: dateKey(),
      fetchedAt: new Date().toISOString(),
      current: {
        temp: data.current?.temperature_2m ?? null,
        feels: data.current?.apparent_temperature ?? null,
        rain: data.current?.precipitation ?? null,
        wind: data.current?.wind_speed_10m ?? null,
        humidity: data.current?.relative_humidity_2m ?? null,
      },
      hours,
    };
    persistNow();
    render();
  }

  async function refreshWeather({ ask = false } = {}) {
    if (weatherFresh() && !ask) return;
    const stored = state.weather?.lat ? { lat: state.weather.lat, lon: state.weather.lon, place: state.weather.place } : null;
    if (stored && !ask) {
      try {
        await fetchWeather(stored);
      } catch (error) {
        // Hors ligne : on garde la dernière météo connue.
      }
      return;
    }
    if (ask && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather({
            lat: Math.round(position.coords.latitude * 100) / 100,
            lon: Math.round(position.coords.longitude * 100) / 100,
            place: "Ta position",
          }).catch(() => {});
        },
        () => {
          fetchWeather(DEFAULT_PLACE).catch(() => {});
        },
        { timeout: 8000, maximumAge: 600000 }
      );
      return;
    }
    try {
      await fetchWeather(stored || DEFAULT_PLACE);
    } catch (error) {
      // silencieux
    }
  }

  // Meilleur créneau de la journée pour courir : on pénalise la chaleur ressentie,
  // la pluie et le vent, sur les heures encore à venir.
  function bestRunWindow() {
    const hours = state.weather?.hours || [];
    if (!hours.length) return null;
    const nowHour = new Date().getHours();
    const candidates = hours
      .map((hour, index) => ({ ...hour, index }))
      .filter((hour) => hour.index >= Math.max(nowHour, 6) && hour.index <= 21 && hour.feels !== null);
    if (!candidates.length) return null;
    const scored = candidates.map((hour) => ({
      ...hour,
      score: Math.max(0, (hour.feels ?? 20) - 18) * 2 + (hour.rain ?? 0) * 0.6 + Math.max(0, (hour.wind ?? 0) - 20) * 0.5,
    }));
    scored.sort((a, b) => a.score - b.score);
    return scored[0];
  }

  function weatherAdvice(session) {
    const weather = state.weather;
    if (!weather) return [];
    const window = bestRunWindow();
    const reference = window || { feels: weather.current?.feels, rain: 0, wind: weather.current?.wind, time: "" };
    const feels = reference.feels ?? weather.current?.feels ?? null;
    const rain = reference.rain ?? 0;
    const wind = reference.wind ?? weather.current?.wind ?? 0;
    const isRun = session?.kind === "course";
    const notes = [];

    if (feels !== null && feels >= 32) {
      notes.push(
        isRun
          ? "Chaleur ressentie au-delà de 32 °C : ta fréquence cardiaque monte de 10 à 15 battements à allure égale. Cours à la sensation, jamais à l'allure, ou reporte à la fraîcheur — une zone 2 courue trop chaud devient une zone 3 sans bénéfice supplémentaire."
          : "Plus de 32 °C ressentis : allonge les temps de repos de 30 secondes, bois entre les séries, et ne juge pas ta forme sur les charges du jour."
      );
    } else if (feels !== null && feels >= 27) {
      notes.push(
        isRun
          ? "Entre 27 et 32 °C ressentis, attends-toi à 5 à 10 battements de plus qu'en temps frais pour la même allure. Reste sur ta zone 2 au ressenti : tu dois pouvoir parler en phrases complètes."
          : "Chaleur modérée : hydrate-toi entre les séries, la performance en force baisse un peu quand la température monte."
      );
    } else if (feels !== null && feels <= 6) {
      notes.push(
        "Moins de 6 °C ressentis : ton mollet sort de rééducation, allonge l'échauffement à 12-15 minutes et couvre le bas de jambe. Un tissu froid encaisse moins bien les changements de rythme."
      );
    }

    if (rain >= 60) {
      notes.push(
        isRun
          ? "Pluie probable : sol glissant. Pas de lignes droites ni d'accélérations aujourd'hui, garde une allure régulière — c'est sur les changements de rythme que le mollet se réveille."
          : "Pluie annoncée : si ta séance contient de la pliométrie en extérieur, fais-la à l'intérieur ou décale-la."
      );
    }

    if (wind >= 30 && isRun) {
      notes.push("Vent supérieur à 30 km/h : pars face au vent et rentre avec, sinon la seconde moitié te coûtera bien plus cher que prévu.");
    }

    // Le conseil principal vise le créneau recommandé ; si l'instant présent est
    // nettement plus chaud, on le dit, parce qu'on ne court pas toujours à l'heure idéale.
    const nowFeels = weather.current?.feels ?? null;
    if (isRun && nowFeels !== null && feels !== null && nowFeels >= 27 && nowFeels - feels >= 4) {
      notes.push(
        `Il fait ${Math.round(nowFeels)} °C ressentis en ce moment. Si tu ne peux pas caler la séance sur le créneau conseillé, réduis l'objectif : même durée mais allure libre, pilotée à la conversation, et de l'eau avant de partir.`
      );
    }

    if (!notes.length) {
      notes.push(
        isRun
          ? "Conditions favorables : rien à adapter, tiens ta zone 2 et laisse la fréquence cardiaque piloter."
          : "Conditions neutres pour une séance en salle : rien à adapter aujourd'hui."
      );
    }
    return notes;
  }

  function WeatherCard() {
    const session = programActive() ? programSessionFor() : null;
    const weather = state.weather;

    if (!weather) {
      return `
        <section class="card weather-card">
          <div class="card-head card-head--save">
            <div>
              <p class="eyebrow">Météo</p>
              <h2>Adapter la séance aux conditions</h2>
              <p class="small-text">Chaleur, pluie et vent changent la lecture d'une séance — surtout en course. Un appui, aucune donnée personnelle envoyée.</p>
            </div>
          </div>
          <div class="button-row">
            <button type="button" class="primary-button" data-action="enable-weather">Activer la météo</button>
          </div>
        </section>
      `;
    }

    const window = bestRunWindow();
    const current = weather.current || {};
    const notes = weatherAdvice(session);
    return `
      <section class="card weather-card">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Météo · ${escapeHtml(weather.place || "position")}</p>
            <h2>${current.temp !== null ? `${Math.round(current.temp)} °C` : "—"}${
              current.feels !== null && Math.abs((current.feels ?? 0) - (current.temp ?? 0)) >= 1
                ? ` · ${Math.round(current.feels)} °C ressentis`
                : ""
            }</h2>
          </div>
          ${StatusBadge(session?.kind === "course" ? "Course du jour" : session ? "Séance en salle" : "Repos", "info")}
        </div>
        ${
          window && session?.kind === "course"
            ? `<p class="weather-window"><strong>Meilleur créneau pour courir : ${escapeHtml(window.time)}</strong><span>${
                window.feels !== null ? `${Math.round(window.feels)} °C ressentis` : ""
              }${window.rain !== null ? ` · ${window.rain} % de pluie` : ""}${window.wind !== null ? ` · vent ${Math.round(window.wind)} km/h` : ""}</span></p>`
            : ""
        }
        <div class="weather-notes">
          ${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
        </div>
        <p class="small-text">Prévisions pour <strong>${escapeHtml(weather.place || "Montpellier")}</strong>${
          weather.place === "Ta position" ? " (position de ton téléphone)" : " — par défaut, tant que tu n'as pas partagé ta position"
        }. Mise à jour ${escapeHtml(formatClock(weather.fetchedAt))}.</p>
        <div class="button-row">
          <button type="button" class="secondary-button" data-action="enable-weather">${
            weather.place === "Ta position" ? "Actualiser" : "Utiliser ma position"
          }</button>
          ${weather.place === "Ta position" ? `<button type="button" class="ghost-button" data-action="weather-default">Revenir à Montpellier</button>` : ""}
        </div>
      </section>
    `;
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

    // v7.4.0 : quand une séance est prescrite, ce formulaire libre faisait
    // doublon — deux endroits pour saisir la même séance, dont un vide à
    // remplir entièrement à la main alors que l'autre est pré-rempli. Il se
    // replie derrière un bouton et ne sert plus qu'aux séances hors programme.
    const prescribed = hasPrescription();
    if (prescribed && !state.manualLogOpen) {
      return `
        <section class="form-panel manual-collapsed">
          <div class="card-head">
            <div>
              <p class="eyebrow">Journal des séances</p>
              <h2>Séance hors programme</h2>
            </div>
            ${StatusBadge("Repliée", "info")}
          </div>
          <p class="small-text">Ta séance du jour se saisit plus haut, dans « ${escapeHtml(prescribed)} » : les charges y sont déjà calculées et tu n'as qu'à corriger ce qui a différé. Ce formulaire ne sert que si tu as fait autre chose que ce qui était prévu.</p>
          <div class="button-row" style="margin-top:12px">
            <button type="button" class="secondary-button" data-action="toggle-manual-log">Enregistrer une séance hors programme</button>
          </div>
        </section>
      `;
    }

    return `
      <section class="form-panel">
        <div class="card-head card-head--save">
          <div>
            <p class="eyebrow">Journal des séances</p>
            <h2>${prescribed ? "Séance hors programme" : "Enregistrer ce que tu as fait"}</h2>
          </div>
          <div class="head-badges">${StatusBadge("Saisie manuelle", "info")}${SaveBadge()}</div>
        </div>
        ${
          prescribed
            ? `<p class="small-text">Rappel : ce que le programme prévoyait se saisit dans « ${escapeHtml(prescribed)} », plus haut. Ici, seulement ce que tu as fait en plus ou à la place.</p>`
            : ""
        }
        <div class="field" style="margin-top:14px">${modeButtons}</div>
        <div style="margin-top:14px">${isMuscu ? muscuForm : courseForm}</div>
        ${
          prescribed
            ? `<div class="button-row" style="margin-top:12px"><button type="button" class="ghost-button" data-action="toggle-manual-log">Replier la saisie libre</button></div>`
            : ""
        }
      </section>
    `;
  }

  // Titre de la carte qui porte déjà la prescription du jour, ou "" s'il n'y en a pas.
  function hasPrescription(key = dateKey()) {
    if (prescriptionFor(key).length) return "Séance prescrite";
    if (runPrescription(key)) return "Course prescrite";
    return "";
  }

  function TodayWorkoutsList() {
    const workouts = day().workouts || [];
    if (!workouts.length) return "";

    const liftRow = (exercise) => {
      const weight = Number(exercise.weight);
      const load = weight > 0 ? `${String(exercise.weight).replace(".", ",")} kg` : "Poids du corps";
      return `
        <div class="lift-row">
          <span class="lift-name">${escapeHtml(exercise.name)}</span>
          <span class="lift-metrics">
            <span class="lift-chip">${escapeHtml(load)}</span>
            <span class="lift-chip">${exercise.sets} × ${exercise.reps} reps</span>
            ${exercise.rpe === "" || exercise.rpe === undefined ? "" : `<span class="lift-chip">RPE ${String(exercise.rpe).replace(".", ",")}</span>`}
          </span>
        </div>
      `;
    };

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Séances enregistrées aujourd'hui</p>
            <h2>${workouts.length} séance${workouts.length > 1 ? "s" : ""}</h2>
          </div>
          ${StatusBadge("Journal", "good")}
        </div>
        <div class="logged-list">
          ${workouts
            .map((workout) => {
              if (workout.type === "muscu") {
                const exercises = workout.exercises || [];
                const sets = exercises.reduce((total, exercise) => total + (Number(exercise.sets) || 0), 0);
                return `
                  <article class="logged-workout">
                    <div class="logged-head">
                      <div class="logged-title">
                        <strong>Musculation</strong>
                        <span>${exercises.length} exercice${exercises.length > 1 ? "s" : ""} · ${sets} série${sets > 1 ? "s" : ""}</span>
                      </div>
                      <button type="button" class="ghost-button" data-action="delete-workout" data-id="${escapeHtml(workout.id)}">Supprimer</button>
                    </div>
                    <div class="lift-table">${exercises.map(liftRow).join("")}</div>
                  </article>
                `;
              }
              const km = Number(workout.km);
              const duration = Number(workout.duration);
              return `
                <article class="logged-workout">
                  <div class="logged-head">
                    <div class="logged-title">
                      <strong>${escapeHtml(RUN_KINDS[workout.kind] || "Course")}</strong>
                      <span>${String(workout.km).replace(".", ",")} km en ${workout.duration} min</span>
                    </div>
                    <button type="button" class="ghost-button" data-action="delete-workout" data-id="${escapeHtml(workout.id)}">Supprimer</button>
                  </div>
                  <div class="lift-table">
                    <div class="lift-row">
                      <span class="lift-name">${km > 0 ? "Allure moyenne" : "Durée"}</span>
                      <span class="lift-metrics">
                        <span class="lift-chip">${km > 0 ? escapeHtml(formatPace(duration / km)) : `${duration} min`}</span>
                        ${workout.hr ? `<span class="lift-chip">${workout.hr} bpm</span>` : ""}
                      </span>
                    </div>
                  </div>
                </article>
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
          ${
            readiness.missing
              ? GotoBadge(
                  `${readiness.missing} donnée manquante${readiness.missing > 1 ? "s" : ""}`,
                  "watch",
                  morning().completed ? "data" : "checkin",
                  morning().completed ? null : "fatigue"
                )
              : StatusBadge("Aucune donnée manquante", "good")
          }
        </div>
        <div class="metric-grid">
          ${
            readiness.factors.length
              ? readiness.factors.map(MetricCard).join("")
              : `<div class="empty-state">
                  <strong>Aucun facteur objectif importé</strong>
                  <p>Sommeil, HRV, FC repos et charge apparaîtront après import Apple Santé, Garmin ou saisie d’un historique.</p>
                  <button type="button" class="secondary-button" data-goto="today:data">Importer mes données santé</button>
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
            ${RingsRow(readiness)}
            ${QuickSessionCard()}
            ${CalfTestCard()}
            ${PrescriptionCard()}
            ${RunStepsCard()}
            ${RunPrescriptionCard()}
            ${NotFullCard()}
            ${MicroCard()}
            ${WeatherCard()}
            ${MissingCard()}
            ${GaugeGrid()}
            ${CoachDecisionCard(decision)}
            ${DeloadCard(signalsResult)}
          </div>
          <aside class="page-grid">
            ${SignalsCard(signalsResult)}
            ${factors}
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
          ${QuickSessionCard()}
          ${CalfTestCard()}
          ${PrescriptionCard()}
          ${RunStepsCard()}
          ${RunPrescriptionCard()}
          ${NotFullCard()}
          ${MicroCard()}
          ${WeatherCard()}
          <div class="section-grid">
            ${WorkoutCard(decision)}
            ${CoachSummary(decision, readiness)}
          </div>
          ${WorkoutLogCard()}
          ${TodayWorkoutsList()}
          ${TodayActivitiesCard()}
        </div>
      `,
      evening: `
        <div class="section-grid">
          ${EveningReview()}
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
          ${WalkVolumeCard()}
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

  function weekRangeLabel() {
    const monday = mondayOfWeek();
    const sunday = addDaysKey(monday, 6);
    const range = `${formatShortDate(monday)} → ${formatShortDate(sunday)}`;
    if (!programActive()) return `Semaine du ${range}`;
    const week = programWeek();
    // Une semaine calendaire n'est pas une semaine de bloc : pendant l'amorce,
    // le lundi au mercredi sont hors bloc, d'où le libellé neutre.
    return week === 0 ? `Semaine du ${range}` : `Semaine ${week} du bloc · ${range}`;
  }

  function RealWeeklyCalendar() {
    const monday = mondayOfWeek();
    const todayId = dateKey();
    const rows = [];
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(monday, i);
      const dayLabel = new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "");
      const dateLabel = new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "");
      const label = `${dayLabel}<span class="day-date">${escapeHtml(dateLabel)}</span>`;

      // Avant le début du bloc (amorce comprise), il n'y a rien de prévu :
      // afficher une séance du programme ces jours-là laissait croire à des séances manquées.
      if (!programActive(key)) {
        rows.push(`
          <article class="day-card outside">
            <div class="day-label">${label}</div>
            <div><h3>Hors bloc</h3><p>${
              key < programStartDate() ? "Rien n'était prévu ce jour-là." : "Bloc terminé."
            }</p></div>
          </article>
        `);
        continue;
      }

      const session = programSessionFor(key);
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
      const weekday = new Date(`${key}T12:00:00`).getDay();
      const expanded = state.expandedProgramDay === weekday;
      rows.push(`
        <article class="day-card ${expanded ? "expanded" : ""}" data-action="toggle-program-day" data-day="${weekday}" role="button" tabindex="0" aria-expanded="${expanded}">
          <div class="day-label">${label}</div>
          <div><h3>${escapeHtml(session.title)}</h3><p>${escapeHtml(session.focus)}</p></div>
          <div class="day-side">${StatusBadge(status, tone)}<span class="day-chevron">${expanded ? "▾" : "▸"}</span></div>
        </article>
        ${
          key <= todayId && session.kind !== "repos" && !journalEntry(key)?.evening?.touched
            ? `<div class="day-quick">
                <span class="day-quick-label">${key === todayId ? "Tu l'as faite ?" : `Et le ${escapeHtml(formatShortDate(key))} ?`}</span>
                ${QuickStatusChips(key)}
              </div>`
            : ""
        }
        ${
          expanded
            ? `<div class="day-detail">
                ${
                  session.exercises.length
                    ? `<div class="exercise-list">
                        ${session.exercises.map((item) => ExerciseRow(item, "calendrier")).join("")}
                      </div>
                      <p class="small-text">Progression : quand tu atteins le haut de la fourchette de reps sur toutes les séries au RPE cible → +2,5 kg (haut du corps) ou +5 kg (bas du corps) la séance suivante.</p>
                      ${microSummaryLine(key) ? `<p class="small-text">Micro-sessions · ${escapeHtml(microSummaryLine(key))}</p>` : ""}`
                    : `<p class="small-text">Repos complet : marche libre si tu veux, rien d'imposé. La progression se construit pendant la récupération.</p>
                      ${microSummaryLine(key) ? `<p class="small-text">Micro-sessions · ${escapeHtml(microSummaryLine(key))}</p>` : ""}`
                }
              </div>`
            : ""
        }
      `);
    }
    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">Calendrier hebdomadaire</p>
            <h2>${escapeHtml(weekRangeLabel())}</h2>
            <p class="small-text">${
              programActive() && programWeek() === 0
                ? `Amorce du ${escapeHtml(formatShortDate(BLOC1.amorceStart))} au ${escapeHtml(formatShortDate(addDaysKey(programStartDate(), -1)))} — les jours d'avant sont hors bloc. La semaine 1 démarre le ${escapeHtml(formatShortDate(programStartDate()))}.`
                : "Semaine du lundi au dimanche."
            }</p>
          </div>
          ${StatusBadge(programPhase()?.label || "Avant-bloc", "info")}
        </div>
        <p class="small-text">Touche une séance pour voir le détail des exercices, séries, répétitions et temps de repos.</p>
        <div class="calendar">${rows.join("")}</div>
      </section>
    `;
  }

  // « Qu'est-ce que je dois faire ? » — la réponse d'abord, les statistiques ensuite (v4.9).
  function NextUpBlock() {
    const todayKey = dateKey();
    const today = programActive() ? programSessionFor(todayKey) : null;

    let next = null;
    for (let i = 1; i <= 7; i++) {
      const key = keyOffset(-i);
      const session = programActive(key) ? programSessionFor(key) : null;
      if (session && session.kind !== "repos") {
        next = { key, session };
        break;
      }
    }

    const logged = (day().workouts || []).length > 0 || daySessions().length > 0;
    const todayLine = today
      ? today.kind === "repos"
        ? `<strong>Repos planifié</strong><span>${escapeHtml(today.focus)}</span>`
        : `<strong>${escapeHtml(today.title)}</strong><span>${escapeHtml(today.focus)}${today.duration ? ` · ${today.duration} min` : ""}${
            today.rpe ? ` · RPE ${escapeHtml(String(today.rpe))}` : ""
          }</span>`
      : `<strong>Le bloc démarre le ${escapeHtml(formatFrDate(programStartDate()))}</strong><span>D'ici là : check-ins quotidiens et mesure de référence.</span>`;

    return `
      <div class="nextup">
        <div class="nextup-row">
          <span class="nextup-tag">Aujourd'hui</span>
          <div class="nextup-text">${todayLine}</div>
          ${
            today && today.kind !== "repos"
              ? `<button type="button" class="${logged ? "secondary-button" : "primary-button"}" data-goto="today:workout">${
                  logged ? "Séance enregistrée" : "Ouvrir la séance"
                }</button>`
              : ""
          }
        </div>
        ${
          next
            ? `<div class="nextup-row secondary">
                <span class="nextup-tag">Ensuite</span>
                <div class="nextup-text">
                  <strong>${escapeHtml(formatFrDate(next.key))} — ${escapeHtml(next.session.title)}</strong>
                  <span>${escapeHtml(next.session.focus)}</span>
                </div>
              </div>`
            : ""
        }
      </div>
    `;
  }

  // ---- v7.5.0 : la semaine en calendrier, jour par jour ----
  // Retour de Ghislain : « on voit qu'on parle de la semaine, ce serait bien
  // qu'ici on voie le calendrier par jour ». La carte de bloc disait ce qu'il
  // y avait aujourd'hui et ensuite ; elle ne montrait jamais la semaine. Sept
  // lignes, une par jour, avec la séance, son créneau et ses micro-sessions.
  const WEEKDAY_SHORT = ["dim", "lun", "mar", "mer", "jeu", "ven", "sam"];

  function mondayOf(key) {
    const wd = actualWeekday(key);
    return addDaysKey(key, wd === 0 ? -6 : 1 - wd);
  }

  // Créneau conseillé, calé sur le rythme déclaré : lever 8 h, coucher 22 h,
  // séance le matin ou entre 12 h et 14 h. On propose 9 h et on borne la fin
  // avec la durée réelle de la séance — un créneau daté vaut mieux qu'un
  // « le matin » qui ne se réserve pas.
  function slotFor(session) {
    if (!session || session.kind === "repos") return "";
    const start = 9 * 60;
    const end = start + (session.duration || 60);
    const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
    return `${hhmm(start)}-${hhmm(end)}`;
  }

  // La journée en une ligne : micro-sessions et séance remises dans l'ordre
  // des horaires, pour que le calendrier se lise comme un emploi du temps.
  function dayTimeline(session, micro) {
    const items = micro.map((m) => ({ time: m.time, label: m.label.toLowerCase() }));
    const slot = slotFor(session);
    if (slot) items.push({ time: slot.slice(0, 5), label: "séance", range: slot });
    return items
      .sort((a, b) => a.time.localeCompare(b.time))
      .map((i) => `${i.range || i.time} ${i.label}`)
      .join(" · ");
  }

  // Ce que le journal dit du jour, une fois qu'il est passé.
  function dayStatus(key, session) {
    const today = dateKey();
    if (key > today) return { label: "", tone: "" };
    if (key === today) return { label: "Aujourd'hui", tone: "good" };
    if (!session || session.kind === "repos") return { label: "", tone: "" };
    const entry = journalEntry(key);
    if ((entry?.workouts || []).length) return { label: "Faite", tone: "good" };
    // ⚠️ `completion` vaut "none" par défaut : sans `touched`, tout jour non
    // rempli serait affiché « manquée ». C'est `touched` qui fait foi.
    const ev = entry?.evening;
    if (!ev?.touched) return { label: "Non renseignée", tone: "watch" };
    const map = {
      complete: ["Faite", "good"],
      adaptee: ["Adaptée", "good"],
      partial: ["Partielle", "watch"],
      none: ["Manquée", "bad"],
      rest: ["Repos", "info"],
    };
    const [label, tone] = map[ev.completion] || ["Non renseignée", "watch"];
    return { label, tone };
  }

  function weekCalendarDays(offset = 0) {
    const start = addDaysKey(mondayOf(dateKey()), offset * 7);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const key = addDaysKey(start, i);
      const session = programActive(key) ? programSessionFor(key) : null;
      days.push({ key, session, micro: microFor(key), status: dayStatus(key, session) });
    }
    return { start, days };
  }

  function WeekCalendarCard() {
    const offset = state.calWeekOffset || 0;
    const { start, days } = weekCalendarDays(offset);
    const end = addDaysKey(start, 6);
    const week = programWeek(start);
    const sessions = days.filter((d) => d.session && d.session.kind !== "repos");
    // Même règle que partout ailleurs dans l'app : une séance adaptée compte
    // comme faite (`programStats()`, l'adhérence). Seules « partielle » et
    // « manquée » ne comptent pas.
    const done = sessions.filter((d) => d.status.label === "Faite" || d.status.label === "Adaptée").length;
    const fmt = (key) =>
      new Date(`${key}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

    return `
      <section class="card">
        <div class="card-head">
          <div>
            <p class="eyebrow">${
              inAmorce(start) ? "Semaine d'amorce" : week ? `Semaine ${week} sur ${BLOC1.totalWeeks}` : "Avant le bloc"
            }</p>
            <h2>${escapeHtml(fmt(start))} → ${escapeHtml(fmt(end))}</h2>
          </div>
          ${StatusBadge(`${done}/${sessions.length} séances`, done === sessions.length && sessions.length ? "good" : "info")}
        </div>
        <div class="cal-nav">
          <button type="button" class="ghost-button" data-action="cal-week" data-delta="-1" aria-label="Semaine précédente">‹</button>
          <button type="button" class="ghost-button ${offset === 0 ? "muted" : ""}" data-action="cal-week" data-delta="0">${
            offset === 0 ? "Semaine en cours" : "Revenir à cette semaine"
          }</button>
          <button type="button" class="ghost-button" data-action="cal-week" data-delta="1" aria-label="Semaine suivante">›</button>
        </div>
        <div class="week-cal">
          ${days
            .map((d) => {
              const isToday = d.key === dateKey();
              const s = d.session;
              const rest = !s || s.kind === "repos";
              const timeline = dayTimeline(rest ? null : s, d.micro);
              return `
                <div class="cal-day ${isToday ? "today" : ""} ${rest ? "rest" : ""}">
                  <div class="cal-date">
                    <span class="cal-wd">${WEEKDAY_SHORT[actualWeekday(d.key)]}</span>
                    <span class="cal-num">${new Date(`${d.key}T12:00:00`).getDate()}</span>
                  </div>
                  <div class="cal-body">
                    <div class="cal-title-row">
                      <strong>${escapeHtml(s ? s.title : "Hors bloc")}</strong>
                      ${d.status.label ? StatusBadge(d.status.label, d.status.tone) : ""}
                    </div>
                    <span class="cal-focus">${escapeHtml(s ? s.focus : "Aucune séance programmée")}</span>
                    ${
                      rest
                        ? ""
                        : `<span class="cal-meta">${s.duration ? `${s.duration} min` : ""}${
                            s.rpe ? ` · RPE ${escapeHtml(String(s.rpe))}` : ""
                          }</span>`
                    }
                    ${timeline ? `<span class="cal-micro">${escapeHtml(timeline)}</span>` : ""}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
        <p class="small-text">Les créneaux suivent ton rythme déclaré (lever 8 h, coucher 22 h, séance le matin ou entre 12 h et 14 h). Le créneau de 9 h est une proposition : la fenêtre 12 h-14 h convient tout aussi bien. Ce qui compte est de faire la séance, pas de la faire à l'heure exacte. Le détail exécutable des micro-sessions est dans Aujourd'hui → Synthèse.</p>
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
          <div class="card-head card-head--save">
            <div>
              <p class="eyebrow">${escapeHtml(BLOC1.name)}</p>
              <h2>${
                upcoming
                  ? `Départ ${escapeHtml(formatFrDate(programStartDate()))}`
                  : week === 0
                    ? `Semaine d'amorce · ${escapeHtml(formatFrDate(BLOC1.amorceStart))} → ${escapeHtml(formatFrDate(addDaysKey(programStartDate(), -1)))}`
                    : `Semaine ${week} sur ${BLOC1.totalWeeks}`
              }</h2>
              ${
                week === 0 && !upcoming
                  ? `<p class="small-text">Phase de calibration. La semaine 1 du bloc démarre le ${escapeHtml(formatFrDate(programStartDate()))}.</p>`
                  : ""
              }
            </div>
            ${
              upcoming
                ? StatusBadge(`J-${daysUntilBlockStart()}`, "info")
                : stats.planned
                  ? StatusBadge(`${stats.completion} % du bloc`, "info")
                  : StatusBadge(escapeHtml(phase?.label || "Amorce"), "info")
            }
          </div>
          <p class="small-text">${escapeHtml(BLOC1.goal)}</p>
          ${NextUpBlock()}
          ${
            phase
              ? `<div class="notice"><strong>Objectif de la semaine</strong><p>${escapeHtml(phase.weeklyGoal)}</p></div>`
              : `<div class="notice"><strong>D'ici le départ</strong><p>Check-ins quotidiens pour construire ta base de readiness, export CSV Hevy au coach pour calibrer les charges, tour de taille de référence à mesurer.</p></div>`
          }
          <p class="small-text">Bloc de ${BLOC1.totalWeeks} semaines · ${stats.totalPlanned} séances prévues · deload en semaine ${BLOC1.deloadWeek}${
            stats.planned ? ` · ${stats.done} séance${stats.done > 1 ? "s" : ""} conforme${stats.done > 1 ? "s" : ""} sur ${stats.planned} à ce stade` : ""
          }.</p>
          <p class="small-text"><a href="${BLOC1.guideUrl}" target="_blank" rel="noopener">Guide complet du bloc → chaque exercice expliqué, avec sa vidéo de démonstration</a></p>
          ${
            upcoming
              ? `<div class="button-row" style="margin-top:14px"><button type="button" class="secondary-button" data-action="start-block-now">${icon("play")}Commencer dès cette semaine</button></div>`
              : ""
          }
        </section>
        ${WeekCalendarCard()}
        ${
          stats.planned
            ? ProgressRing({
                value: stats.completion,
                label: week === 0 ? "Semaine d'amorce" : `Semaine ${week} sur ${BLOC1.totalWeeks}`,
                sublabel: "Séances conformes depuis le début du bloc",
                accent: "var(--indigo)",
              })
            : ""
        }
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
          <div class="stat-tile"><span>Temps semaine</span><strong>${running.minutesWeek} min</strong></div>
          <div class="stat-tile"><span>Séances 7 j</span><strong>${running.sessionsWeek}</strong></div>
          <div class="stat-tile"><span>FC moyenne</span><strong>${running.avgHr ? `${running.avgHr} bpm` : "—"}</strong></div>
          <div class="stat-tile"><span>Distance semaine</span><strong>${running.kmWeek > 0 ? `${String(running.kmWeek).replace(".", ",")} km` : "—"}</strong></div>
        </div>
        <p class="small-text">Minutes de course par semaine, sur 8 semaines — c'est le temps passé en zone 2 qui construit la base aérobie, la distance n'est qu'une conséquence.${
          running.avgPace !== "—" ? ` Allure moyenne indicative : ${escapeHtml(running.avgPace)}.` : ""
        }</p>
        ${TrendChart(running.weeklyMinutes, "var(--blue)")}
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
          ${VolumeCard()}
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
        ${VolumeCard()}
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

  // ---- Briefing texte : ce que l'athlète transmet au coach (Claude) ----
  // Remplace l'ancien chat local (matcher de mots-clés) retiré en v5.8.0 :
  // l'app collecte et met en forme, le raisonnement se fait dans la conversation.
  function briefingDayKeys(days) {
    const keys = [];
    for (let i = 0; i < days; i++) keys.push(addDaysKey(dateKey(), -i));
    return keys.filter((key) => {
      const entry = state.journal?.[key];
      if (!entry) return false;
      return (
        entry.morning?.completed ||
        entry.evening?.touched ||
        entry.nutrition?.touched ||
        (entry.workouts || []).length ||
        (entry.activities || []).length ||
        (entry.microDone || []).length ||
        Number(entry.weight) > 0 ||
        Number(entry.waist) > 0
      );
    });
  }

  function briefingWorkoutLines(entry) {
    const out = [];
    (entry.workouts || []).forEach((workout) => {
      if (workout.type === "course") {
        const bits = [];
        if (workout.prescribed && workout.compliance) bits.push(`${workout.compliance} vs prévu`);
        if (workout.prescribed && workout.rpe) bits.push(`RPE ${workout.rpe}`);
        if (Number(workout.duration) > 0) bits.push(`${workout.duration} min${workout.prescribed ? " (estimé depuis le plan)" : ""}`);
        if (Number(workout.km) > 0) bits.push(`${String(workout.km).replace(".", ",")} km`);
        if (Number(workout.duration) > 0 && Number(workout.km) > 0) bits.push(formatPace(workout.duration / workout.km));
        if (Number(workout.hr) > 0) bits.push(`FC ${workout.hr}`);
        if (workout.kind) bits.push(String(workout.kind));
        out.push(`- Course : ${bits.join(" · ") || "sans détail"}`);
        return;
      }
      out.push(`- Muscu${workout.prescribed ? " (saisie par écart sur la prescription)" : ""} :`);
      (workout.exercises || []).forEach((ex) => {
        const charge = Number(ex.weight) > 0 ? `${ex.weight} kg` : "poids de corps";
        const rpe = ex.rpe ? ` RPE ${ex.rpe}` : " RPE non renseigné";
        out.push(`  - ${ex.name || "exercice sans nom"} — ${charge} × ${ex.reps || "?"} reps × ${ex.sets || "?"} séries${rpe}`);
      });
      if (!(workout.exercises || []).length) out.push("  - aucune charge saisie");
    });
    (entry.activities || []).forEach((activity) => {
      out.push(`- Activité libre : ${activity.name || activity.type || "non nommée"}${activity.duration ? ` (${activity.duration} min)` : ""}`);
    });
    return out;
  }

  function buildBriefing(days = 14) {
    const lines = [];
    const today = dateKey();
    const week = programWeek();
    const phase = programPhase(week);
    const health = state.imports?.health || null;

    lines.push(`# Briefing Athlete OS — ${formatFrDate(today)}`);
    lines.push("");

    const ctx = [BLOC1.name];
    if (inAmorce()) ctx.push("semaine d'amorce (avant S1)");
    else if (week === 0) ctx.push(`bloc non démarré, départ le ${formatFrDate(programStartDate())}`);
    else if (week) ctx.push(`semaine ${week}/${BLOC1.totalWeeks}${phase ? ` — ${phase.label}` : ""}`);
    lines.push(`**Programme** : ${ctx.join(" · ")}`);

    const session = programSessionFor(today);
    if (session) lines.push(`**Séance prévue aujourd'hui** : ${session.title || session.name || "—"}`);
    const presc = prescriptionFor(today);
    if (presc.length) {
      lines.push("");
      lines.push("**Charges prescrites aujourd'hui** (double progression) :");
      presc.forEach((item) => {
        lines.push(`- ${item.name} : ${item.weight === null ? "à calibrer" : `${String(item.weight).replace(".", ",")} kg`} — ${item.why}`);
      });
    }

    if (state.deload?.activeUntil) lines.push(`**Deload actif** jusqu'au ${formatFrDate(state.deload.activeUntil)}`);

    lines.push("");
    lines.push("## Repères actuels");
    const latestWeight = latestJournalValue("weight");
    const latestWaist = latestJournalValue("waist");
    if (latestWeight) lines.push(`- Poids : ${latestWeight.value} kg (le ${formatFrDate(latestWeight.key)})`);
    if (latestWaist) lines.push(`- Tour de taille : ${latestWaist.value} cm (le ${formatFrDate(latestWaist.key)})`);
    if (health) {
      if (health.rhr) lines.push(`- FC repos : ${health.rhr} bpm`);
      if (health.hrvMs) lines.push(`- HRV : ${health.hrvMs} ms`);
      else lines.push("- HRV : non disponible (Garmin ne synchronise pas le HRV vers Apple Santé)");
      if (health.sleepMinutes) lines.push(`- Sommeil (dernière nuit importée) : ${Math.round(health.sleepMinutes / 60)} h ${Math.round(health.sleepMinutes % 60)} min`);
      if (health.vo2) lines.push(`- VO2max estimée : ${health.vo2}`);
      lines.push(`- Import Apple Santé : ${health.records || 0} enregistrements, le ${formatFrDate(String(health.importedAt || "").slice(0, 10))}`);
    } else {
      lines.push("- Aucun import Apple Santé pour l'instant");
    }

    const load = acwr();
    if (load.ratio !== null) {
      const verdict = acwrVerdict(load.ratio);
      lines.push(`- Charge d'entraînement (ACWR 7 j / 28 j) : ${String(load.ratio).replace(".", ",")} — ${verdict.label}`);
    }
    const runPlan = runStepsFor(today);
    if (runPlan) {
      lines.push(`- Course du jour : ${runPlan.steps.filter((step) => step.minutes).map((step) => `${step.label} ${step.minutes} min`).join(" → ")}`);
    }

    const keys = briefingDayKeys(days);
    lines.push("");
    lines.push(`## Journal des ${days} derniers jours (${keys.length} jour(s) renseigné(s))`);
    if (!keys.length) {
      lines.push("");
      lines.push("Aucune saisie sur la période.");
    }
    keys.forEach((key) => {
      const entry = state.journal[key];
      lines.push("");
      const head = [`### ${formatFrDate(key)}`];
      if (entry.readinessScore) head.push(`readiness ${entry.readinessScore}${entry.readinessConfidence ? ` (confiance ${String(entry.readinessConfidence).toLowerCase()})` : ""}`);
      lines.push(head.join(" — "));
      if (entry.decisionLabel) lines.push(`Décision du jour : ${entry.decisionLabel}`);
      const mesures = [];
      if (Number(entry.weight) > 0) mesures.push(`poids ${entry.weight} kg`);
      if (Number(entry.waist) > 0) mesures.push(`tour de taille ${entry.waist} cm`);
      if (mesures.length) lines.push(`Mesures : ${mesures.join(" · ")}`);
      if (entry.morning?.completed) {
        lines.push(
          `Check-in matin : fatigue ${entry.morning.fatigue}/5 · motivation ${entry.morning.motivation}/5 · énergie ${entry.morning.energy} · douleur ${entry.morning.pain} · sommeil ${entry.morning.sleepQuality} · muscles ${entry.morning.muscleQuality}`
        );
      }
      const workoutLines = briefingWorkoutLines(entry);
      if (workoutLines.length) {
        lines.push("Séances :");
        workoutLines.forEach((line) => lines.push(line));
      }
      if (entry.evening?.touched) {
        const bits = [`complétion ${entry.evening.completion}`];
        if (entry.evening.duration) bits.push(`${entry.evening.duration} min`);
        if (entry.evening.rpe) bits.push(`RPE ${entry.evening.rpe}`);
        bits.push(`douleur ${entry.evening.pain}`);
        bits.push(`mollet ${entry.evening.calfPain ?? 0}/10${Number(entry.evening.calfPain) > 3 ? " ⚠️ règle d'arrêt" : ""}`);
        if (entry.evening.satisfaction) bits.push(`satisfaction ${entry.evening.satisfaction}/5`);
        lines.push(`Bilan du soir : ${bits.join(" · ")}`);
        if (entry.evening.reason) lines.push(`  Raison notée : ${entry.evening.reason}`);
        if (entry.evening.comment) lines.push(`  Commentaire : ${entry.evening.comment}`);
      }
      if (entry.calfTest?.done) {
        const t = entry.calfTest;
        const repsTxt = t.raisesReps !== "" && t.raisesReps !== null ? `${t.raisesReps} élévations${t.raisesPain ? " AVEC douleur" : " sans douleur"}` : "élévations non comptées";
        const hopsTxt = t.hopsOk === true ? "sautillements sans douleur" : t.hopsOk === false ? "sautillements DOULOUREUX" : "sautillements non renseignés";
        lines.push(`Tests mollet : ${repsTxt} · ${hopsTxt}${t.note ? ` · ${t.note}` : ""}`);
      }
      const micro = microStats(key);
      if (micro.total) {
        const faits = micro.items.filter((item) => (entry.microDone || []).includes(item.id)).map((item) => item.label);
        lines.push(`Micro-sessions : ${micro.done}/${micro.total}${faits.length ? ` (${faits.join(", ")})` : " — aucune cochée"}`);
      }
      if (entry.nutrition?.touched) {
        lines.push(
          `Nutrition : ${entry.nutrition.meals || "?"} repas dont ${entry.nutrition.proteinMeals || "?"} protéinés · végétaux ${entry.nutrition.plants} · qualité ${entry.nutrition.diet} · faim ${entry.nutrition.hunger} · digestion ${entry.nutrition.digestion} · alcool ${entry.nutrition.alcohol}${entry.nutrition.foods ? ` · ${entry.nutrition.foods}` : ""}`
        );
      }
    });

    const decisions = (state.decisions || []).slice(0, 8);
    if (decisions.length) {
      lines.push("");
      lines.push("## Décisions enregistrées (8 dernières)");
      decisions.forEach((item) => {
        lines.push(`- ${formatFrDate(item.date)} — ${item.label} (${item.reason}) · source : ${item.dataUsed} · confiance ${item.confidence}`);
      });
    }

    const missing = [];
    if (!health) missing.push("import Apple Santé");
    if (!latestWaist) missing.push("tour de taille");
    const withoutRpe = keys.filter((key) => (state.journal[key].workouts || []).some((w) => w.type === "muscu" && (w.exercises || []).some((ex) => !ex.rpe)));
    if (withoutRpe.length) missing.push(`RPE manquant sur ${withoutRpe.length} séance(s) muscu`);
    const withoutEvening = keys.filter((key) => !state.journal[key].evening?.touched);
    if (withoutEvening.length) missing.push(`bilan du soir absent sur ${withoutEvening.length} jour(s)`);
    const microSkipped = keys.filter((key) => microStats(key).total && !microStats(key).done);
    if (microSkipped.length) missing.push(`aucune micro-session cochée sur ${microSkipped.length} jour(s)`);
    const mondaysNoTest = keys.filter((key) => calfTestDay(key) && !state.journal[key]?.calfTest?.done);
    if (mondaysNoTest.length) missing.push(`tests mollet du lundi non renseignés (${mondaysNoTest.length} lundi(s))`);
    if (missing.length) {
      lines.push("");
      lines.push("## Données manquantes à signaler au coach");
      missing.forEach((item) => lines.push(`- ${item}`));
    }

    lines.push("");
    lines.push(`_Généré par Athlete OS v${APP_VERSION}._`);
    return lines.join("\n");
  }

  function latestJournalValue(field) {
    const keys = Object.keys(state.journal || {})
      .filter((key) => Number(state.journal[key]?.[field]) > 0)
      .sort()
      .reverse();
    if (!keys.length) return null;
    return { key: keys[0], value: state.journal[keys[0]][field] };
  }

  function renderExport() {
    const confidenceLabel = (value) => ({ Eleve: "élevée", Moyen: "moyenne", Faible: "faible" }[value] || value || "moyenne");
    const decisionHistory = state.decisions || [];
    const briefing = buildBriefing(14);
    const journalDays = Object.keys(state.journal || {}).length;
    const appLog = (state.chat || []).filter((message) => message.role === "coach").slice(-6);
    return `
      <div class="page-grid">
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Briefing</p>
              <h2>Transmettre mes données au coach</h2>
            </div>
            ${StatusBadge(hasAnyData() ? "Prêt" : "En attente de données", hasAnyData() ? "good" : "watch")}
          </div>
          <p class="small-text">Athlete OS collecte et met en forme ; l'analyse se fait dans la conversation avec le coach. Copie ce briefing et colle-le dans le fil, ou envoie la sauvegarde JSON complète.</p>
          <div class="button-row">
            <button type="button" class="primary-button" data-action="copy-briefing">${icon("message")}Copier le briefing</button>
            <button type="button" class="ghost-button" data-action="download-briefing">${icon("chart")}Télécharger en .md</button>
            <button type="button" class="ghost-button" data-action="export-data">${icon("chart")}Sauvegarde JSON complète</button>
          </div>
          <pre class="briefing-preview">${escapeHtml(briefing)}</pre>
          <p class="small-text">14 derniers jours · ${journalDays} jour(s) au journal au total.</p>
        </section>
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Historique des décisions</p>
              <h2>Journal des adaptations</h2>
            </div>
            ${StatusBadge("Mémoire locale", "info")}
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
        <section class="card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Journal de l'app</p>
              <h2>Derniers enregistrements</h2>
            </div>
          </div>
          <div class="decision-list">
            ${
              appLog.length
                ? appLog.map((message) => `<article class="timeline-item"><p>${escapeHtml(message.text)}</p></article>`).join("")
                : `<div class="empty-state"><strong>Rien pour l'instant</strong><p>Les confirmations d'enregistrement (séance, course, import, sauvegarde) s'affichent ici.</p></div>`
            }
          </div>
          <p class="small-text">Confirmations techniques de l'app. Ce ne sont pas des conseils d'entraînement.</p>
        </section>
      </div>
    `;
  }

  function renderContent() {
    if (state.activeTab === "program") return renderProgram();
    if (state.activeTab === "performance") return renderPerformance();
    if (state.activeTab === "health") return renderHealth();
    if (state.activeTab === "export") return renderExport();
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
        <p class="small-text"><strong>Athlete OS version ${APP_VERSION}</strong>${
          pendingVersion ? ` · <button type="button" class="link-button" data-action="apply-update">version ${escapeHtml(pendingVersion)} disponible, mettre à jour</button>` : " · à jour"
        } · programme v2 (amorce + pliométrie par paliers + mobilité/étirements), journal par date, coach à signaux multi-jours, saisie des séances, sauvegarde JSON, enregistrement automatique de la saisie, thème sombre premium.</p>
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
        <div class="danger-zone">
          <strong>Zone sensible</strong>
          <p>Repartir de zéro efface définitivement ${Object.keys(state.journal).length} jour(s) de journal, ${state.decisions.length} décision(s), tes imports et tes mesures. C'est irréversible et il n'y a pas d'annulation : exporte une sauvegarde avant.</p>
          <button type="button" class="danger-button" data-action="reset-blank">Repartir de zéro — tout effacer</button>
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
        ${UpdateBanner()}
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
        ${RestTimerBar()}
        ${ExerciseSheetModal()}
        ${MetricSheetModal()}
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
    applyPendingFocus();
    syncLiveTimer();
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
    // Sécurité : si un champ est encore en cours de saisie au moment du clic,
    // on récupère sa valeur avant toute reconstruction du DOM.
    flushInputs();

    // Fiche exercice : un appui en dehors de la carte referme, un appui dedans ne fait rien.
    if (event.target.closest(".sheet-backdrop") && !event.target.closest(".sheet")) {
      state.openExercise = null;
      state.openExerciseDetail = "";
      state.openMetric = null;
      persistNow();
      render();
      return;
    }

    const gotoButton = event.target.closest("[data-goto]");
    if (gotoButton) {
      state.openMetric = null; // un raccourci depuis une fiche la referme
      gotoTarget(gotoButton.dataset.goto, gotoButton.dataset.gotoFocus);
      return;
    }

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

    if (action === "enable-weather") {
      refreshWeather({ ask: true });
      return;
    }
    if (action === "weather-default") {
      state.weather = null;
      fetchWeather(DEFAULT_PLACE).catch(() => {});
      return;
    }
    if (action === "apply-update") {
      applyUpdate();
      return;
    }
    if (action === "set-completion") {
      const key = actionButton.dataset.key || dateKey();
      const value = actionButton.dataset.value;
      const entry = day(key);
      entry.evening = { ...entry.evening, touched: true, completion: value };
      const done = value === "complete" || value === "adaptee";
      const label = labelFor("completion", value).toLowerCase();
      addCoachMessage(
        "coach",
        key === dateKey()
          ? done
            ? `Séance du jour notée « ${label} ». Pense au RPE et à la douleur mollet dans le bilan du soir : c'est ce qui me permet d'ajuster la semaine prochaine.`
            : `Séance du jour notée « ${label} ». Une séance manquée n'est pas un problème isolément — je regarde la tendance sur la semaine avant de proposer quoi que ce soit.`
          : `Séance du ${formatFrDate(key)} notée « ${label} ». L'historique et l'adhérence sont à jour.`
      );
      logDecision("adherence", `Séance ${formatShortDate(key)} : ${label}`, "Déclaration rapide de l'athlète", "Saisie manuelle", "Eleve");
    }
    if (action === "open-exercise") {
      state.openExercise = actionButton.dataset.exercise;
      state.openExerciseDetail = actionButton.dataset.exerciseDetail || "";
    }
    if (action === "close-exercise") {
      state.openExercise = null;
      state.openExerciseDetail = "";
    }
    if (action === "toggle-not-full") {
      state.notFullOpen = state.notFullOpen === dateKey() ? "" : dateKey();
    }
    if (action === "apply-not-full") {
      const session = programSessionFor();
      logDecision(
        "adaptation",
        "Version allégée adoptée",
        "Journée déclarée « pas à 100 % » par l'athlète",
        "Déclaration volontaire avant la séance",
        "Eleve"
      );
      day().adaptationConfirmed = true;
      state.notFullOpen = "";
      addCoachMessage(
        "coach",
        session?.kind === "course"
          ? "Version allégée notée : durée réduite d'un tiers, zone 2 stricte. C'est tracé dans l'historique des décisions."
          : "Version allégée notée : une série de moins par exercice, RPE plafonné à 6, pas d'impact. Les charges restent identiques."
      );
    }
    if (action === "toggle-warmup") {
      harvestPrescribed();
      const draft = sessionDraft();
      draft.openWarmup = draft.openWarmup === actionButton.dataset.name ? "" : actionButton.dataset.name;
    }
    if (action === "start-rest") {
      state.restTimer = { name: actionButton.dataset.name, endsAt: Date.now() + Number(actionButton.dataset.seconds) * 1000 };
      scheduleRestTick();
    }
    if (action === "stop-rest") {
      state.restTimer = null;
    }
    if (action === "run-compliance") {
      harvestPrescribed();
      if (state.runDraft) state.runDraft.compliance = actionButton.dataset.value;
    }
    if (action === "save-prescribed") {
      harvestPrescribed();
      const draft = sessionDraft();
      const exercises = Object.entries(draft.rows)
        .map(([name, row]) => ({
          name,
          weight: Number(row.weight),
          reps: Number(row.reps),
          sets: Number(row.sets) || 1,
          rpe: row.rpe === "" ? "" : Number(row.rpe),
        }))
        .filter((ex) => Number.isFinite(ex.weight) && ex.weight >= 0 && ex.reps > 0);
      if (!exercises.length) {
        draft.error = "Il me faut au moins une charge et un nombre de répétitions pour enregistrer la séance.";
      } else if (exercises.some((ex) => ex.rpe === "")) {
        draft.error = "Renseigne le RPE de chaque exercice : c'est lui qui calcule la charge de la séance suivante.";
      } else {
        draft.error = "";
        day().workouts.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "muscu",
          prescribed: true,
          exercises,
        });
        state.sessionDraft = null;
        addCoachMessage("coach", `Séance enregistrée (${exercises.length} exercices avec RPE). Les charges de la prochaine séance sont recalculées.`);
      }
    }
    if (action === "save-prescribed-run") {
      harvestPrescribed();
      const presc = runPrescription();
      const draft = state.runDraft;
      if (!presc || !draft?.compliance) {
        if (draft) draft.error = "Indique d'abord si la course a été conforme, plus longue ou plus courte que prévu.";
      } else {
        draft.error = "";
        const factor = draft.compliance === "plus" ? 1.15 : draft.compliance === "moins" ? 0.7 : 1;
        day().workouts.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "course",
          km: "",
          duration: Math.round(presc.duration * factor),
          hr: "",
          kind: /fraction/i.test(presc.title) ? "fractionne" : "zone2",
          prescribed: true,
          compliance: draft.compliance,
          rpe: draft.rpe === "" ? "" : Number(draft.rpe),
        });
        if (draft.calf !== "") evening().calfPain = Number(draft.calf);
        markScopeTouched("evening");
        state.runDraft = null;
        addCoachMessage("coach", `Course enregistrée (${draft.compliance} par rapport aux ${presc.duration} min prévues). Les chiffres exacts restent sur ta montre.`);
      }
    }
    if (action === "calf-hops") {
      day().calfTest.hopsOk = actionButton.dataset.value === "ok";
      day().calfTest.done = true;
    }
    if (action === "cal-week") {
      const delta = Number(actionButton.dataset.delta);
      state.calWeekOffset = delta === 0 ? 0 : (state.calWeekOffset || 0) + delta;
    }
    if (action === "toggle-manual-log") {
      state.manualLogOpen = !state.manualLogOpen;
    }
    if (action === "toggle-micro-detail") {
      state.openMicro = state.openMicro === actionButton.dataset.micro ? "" : actionButton.dataset.micro;
    }
    if (action === "toggle-micro") {
      toggleMicro(actionButton.dataset.day || dateKey(), actionButton.dataset.micro);
    }
    if (action === "open-metric") {
      state.openMetric = actionButton.dataset.metric;
    }
    if (action === "close-metric") {
      state.openMetric = null;
    }
    if (action === "toggle-theme") {
      state.theme = state.theme === "dark" ? "light" : "dark";
    }
    if (action === "toggle-settings") {
      state.settingsOpen = !state.settingsOpen;
    }
    if (action === "reset-blank") {
      const days = Object.keys(state.journal).length;
      if (
        window.confirm(
          `Effacer définitivement toutes tes données Athlete OS ?\n\n${days} jour(s) de journal, ${state.decisions.length} décision(s), imports Garmin et Apple Santé, poids et tour de taille.\n\nAucune annulation possible.`
        )
      ) {
        resetToBlank();
      }
    }
    if (action === "close-settings") {
      state.settingsOpen = false;
    }
    if (action === "start-workout") {
      day().workoutStarted = true;
      day().workoutStartedAt = new Date().toISOString();
      day().exercisesDone = [];
      state.activeTab = "today";
      state.activeTodayView = "workout";
      addCoachMessage("user", "Je démarre la séance.");
      addCoachMessage("coach", "C'est parti. Coche chaque exercice terminé, garde le RPE cible et arrête un mouvement si une douleur monte au-delà de 3/10.");
    }
    if (action === "toggle-exercise-done") {
      const name = actionButton.dataset.name;
      const list = day().exercisesDone || [];
      day().exercisesDone = list.includes(name) ? list.filter((item) => item !== name) : [...list, name];
    }
    if (action === "cancel-workout") {
      day().workoutStartedAt = null;
      day().workoutStarted = false;
      addCoachMessage("coach", "Séance annulée, rien n'a été enregistré. Tu peux la relancer ou la déplacer sur un autre jour.");
    }
    if (action === "finish-workout") {
      const minutes = liveWorkoutMinutes();
      const session = programActive() ? programSessionFor() : null;
      const total = session?.exercises?.length || 0;
      const done = (session?.exercises || []).filter((item) => isExerciseDone(item.name)).length;
      const completion = total && done < total ? (done >= Math.ceil(total / 2) ? "adaptee" : "partial") : "complete";
      day().workoutStartedAt = null;
      day().workoutStarted = false;
      day().evening = {
        ...day().evening,
        touched: true,
        completion,
        duration: minutes > 0 ? minutes : day().evening.duration,
      };
      logDecision(
        "adherence",
        `Séance terminée : ${labelFor("completion", completion).toLowerCase()}`,
        `${done}/${total || "—"} exercice(s), ${minutes} min`,
        "Séance suivie dans l'app",
        "Eleve"
      );
      addCoachMessage(
        "coach",
        `Séance terminée en ${minutes} min${total ? `, ${done} exercice(s) sur ${total}` : ""}. C'est enregistré comme « ${labelFor("completion", completion).toLowerCase()} ». Il ne me manque que ton RPE et l'état du mollet au bilan du soir.`
      );
      state.activeTodayView = "evening";
      pendingFocus = "rpe";
    }
    if (action === "request-adaptation") {
      day().adaptationPending = true;
    }
    if (action === "open-move-session") {
      state.movePickerOpen = true;
    }
    if (action === "close-move-session") {
      state.movePickerOpen = false;
    }
    if (action === "confirm-move-session") {
      const todayKey = dateKey();
      const targetKey = actionButton.dataset.targetKey;
      if (targetKey && targetKey !== todayKey) {
        const before = programSessionFor(todayKey)?.title || "Séance";
        const after = programSessionFor(targetKey)?.title || "Séance";
        state.program.swaps = state.program.swaps || {};
        const todayEff = effectiveWeekday(todayKey);
        const targetEff = effectiveWeekday(targetKey);
        state.program.swaps[todayKey] = targetEff;
        state.program.swaps[targetKey] = todayEff;
        if (state.program.swaps[todayKey] === actualWeekday(todayKey)) delete state.program.swaps[todayKey];
        if (state.program.swaps[targetKey] === actualWeekday(targetKey)) delete state.program.swaps[targetKey];
        state.movePickerOpen = false;
        logDecision(
          "deplacement",
          `Séances échangées : « ${before} » ↔ « ${after} »`,
          `Déplacement demandé par l'athlète : la séance du ${formatFrDate(todayKey)} et celle du ${formatFrDate(targetKey)} sont échangées. La structure de la semaine reste identique, seul l'ordre change.`,
          "Contrainte d'agenda signalée par l'athlète",
          "—"
        );
        addCoachMessage(
          "coach",
          `C'est noté : « ${after} » aujourd'hui, « ${before} » le ${formatFrDate(targetKey)}. Rappel : garde les courses après un jour Haut, et si les deux jours deviennent des jours à impact d'affilée, sois attentif au mollet (règle > 3/10 inchangée).`
        );
      }
    }
    if (action === "undo-move-session") {
      clearWeekSwaps();
      state.movePickerOpen = false;
      logDecision(
        "deplacement",
        "Ordre initial de la semaine rétabli",
        "Les déplacements de séances de la semaine en cours ont été annulés à la demande de l'athlète.",
        "Demande de l'athlète",
        "—"
      );
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
    if (action === "copy-briefing") {
      copyBriefingToClipboard();
    }
    if (action === "download-briefing") {
      downloadBriefing();
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
    if (action === "toggle-program-day") {
      const dayIndex = Number(actionButton.dataset.day);
      state.expandedProgramDay = state.expandedProgramDay === dayIndex ? null : dayIndex;
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

  // v7.0.0 : récupère les champs pré-remplis (séance prescrite + course par écart)
  function harvestPrescribed() {
    const draft = sessionDraft();
    document.querySelectorAll("[data-presc]").forEach((input) => {
      const row = draft.rows[input.dataset.presc];
      if (!row) return;
      row[input.dataset.field] = input.value;
    });
    if (state.runDraft) {
      document.querySelectorAll("[data-run-draft]").forEach((input) => {
        state.runDraft[input.dataset.runDraft] = input.value;
      });
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

    // Journal des séances : la saisie brouillon est désormais sauvegardée à la frappe.
    if (target.dataset.draftEx !== undefined || target.dataset.draftCourse !== undefined) {
      harvestDraft();
      persistSoon();
      return;
    }

    // v7.0.0 : brouillon de séance prescrite et de course par écart
    if (target.dataset.presc !== undefined || target.dataset.runDraft !== undefined) {
      harvestPrescribed();
      persistSoon();
      return;
    }

    if (!target.dataset.scope || !target.dataset.key) return;

    if (target.type === "range") {
      updateStateFromField(target);
      persistNow();
      render();
      return;
    }

    // Champs texte / nombre / textarea : on enregistre sans re-rendre,
    // sinon le DOM serait reconstruit sous les doigts et le focus perdu.
    updateStateFromField(target);
    persistSoon();
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
    if (target.dataset.import === "garmin") {
      importGarminFile(target.files?.[0]);
      return;
    }
    if (!target.dataset.scope || !target.dataset.key) return;
    updateStateFromField(target);
    persistNow();
    // Un champ texte perd le focus quand on touche un autre bouton : re-rendre ici
    // détacherait ce bouton du DOM avant que son clic ne soit traité (premier appui ignoré).
    // La valeur est déjà enregistrée ; le rendu suivra au prochain clic.
    if (target.type === "range" || target.type === "checkbox" || target.tagName === "SELECT") render();
  }

  function markScopeTouched(scope) {
    if (scope === "morning") morning().completed = true;
    if (scope === "evening") evening().touched = true;
    if (scope === "nutrition") nutrition().touched = true;
    if (scope === "calfTest") day().calfTest.done = true; // saisir un résultat vaut « tests faits »
  }

  function updateStateFromField(target) {
    const scope = target.dataset.scope;
    const key = target.dataset.key;
    let value = target.value;
    if (target.type === "checkbox") {
      value = target.checked; // v6.1.0 : cases à cocher des tests mollet
    } else if (target.type === "range" || target.type === "number") {
      value = target.value === "" ? "" : Number(target.value);
      if (value !== "" && !Number.isFinite(value)) value = "";
    }
    scopeTarget(scope)[key] = value;
    markScopeTouched(scope);
  }

  // v7.0.0 : le minuteur de repos a besoin d'un battement, l'app ne re-rend
  // qu'à l'interaction. On s'arrête dès que le repos est écoulé depuis 10 s.
  let restTick = null;
  function scheduleRestTick() {
    if (restTick) clearInterval(restTick);
    restTick = setInterval(() => {
      const timer = state.restTimer;
      if (!timer?.endsAt) {
        clearInterval(restTick);
        restTick = null;
        return;
      }
      if (Date.now() - timer.endsAt > 10000) {
        state.restTimer = null;
        clearInterval(restTick);
        restTick = null;
      }
      render();
    }, 1000);
  }

  // v5.8.0 : plus aucun formulaire de chat. Conservé pour ne pas casser app.onsubmit.
  function handleSubmit() {}

  function copyBriefingToClipboard() {
    const text = buildBriefing(14);
    const done = () => addCoachMessage("coach", "Briefing copié. Colle-le dans la conversation avec ton coach.");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
      return;
    }
    fallbackCopy(text, done);
  }

  function fallbackCopy(text, done) {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      done();
    } catch (error) {
      addCoachMessage("coach", "Copie impossible sur cet appareil. Utilise « Télécharger en .md ».");
    }
  }

  function downloadBriefing() {
    const blob = new Blob([buildBriefing(14)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `athlete-os-briefing-${dateKey()}.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    addCoachMessage("coach", "Briefing téléchargé en .md.");
  }

  function addCoachMessage(role, text) {
    state.chat = [...state.chat, { role, text }].slice(-12);
  }


  // ---- Ouverture sur le bon moment de la journée (v4.8) ----
  // L'app n'atterrit plus systématiquement sur la Synthèse : au lancement, elle ouvre
  // ce qu'il y a à faire maintenant. La navigation manuelle reprend la main ensuite.

  function suggestedTodayView() {
    const hour = new Date().getHours();
    const session = programActive() ? programSessionFor() : null;
    const hasSession = Boolean(session) && session.kind !== "repos";
    const sessionLogged = (day().workouts || []).length > 0 || daySessions().length > 0;

    if (!morning().completed && hour < 14) return "checkin";
    if (hasSession && !sessionLogged && hour >= 10 && hour < 21) return "workout";
    if (hour >= 17 && !evening().touched) return "evening";
    return "summary";
  }

  function applyLaunchView() {
    // Uniquement au démarrage : on ne veut pas déplacer l'athlète pendant qu'il navigue.
    if (state.activeTab !== "today") return;
    state.activeTodayView = suggestedTodayView();
  }

  // Filet de sécurité iOS : l'app peut être balayée, verrouillée ou mise en arrière-plan
  // pendant une saisie. On force alors l'enregistrement de ce qui est à l'écran.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushInputs({ force: true });
  });
  window.addEventListener("pagehide", () => flushInputs({ force: true }));
  window.addEventListener("beforeunload", () => flushInputs({ force: true }));
  window.addEventListener("blur", () => flushInputs());

  initPlatform();
  applyLaunchView();
  render();
  persist();
})();
