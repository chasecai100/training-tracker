/* Training Tracker. Plain JavaScript, no build step. */
'use strict';
(function () {
  const CFG = window.TT_CONFIG;
  const DEF = window.TT_DEFAULTS;
  const DAYS = ['Push', 'Pull', 'Legs', 'Shoulders'];
  const VERSION = '3.9.0';
  const WORKOUT_V = 3;
  const KEYS = { settings: 'tt.settings', library: 'tt.library', current: 'tt.current', pending: 'tt.pending' };

  // Exercise names from earlier versions, so exercises you created yourself can be told apart.
  const OLD_NAMES = [
    'Machine Press (Weight stack)', 'Machine Press (Plate)', 'Incline Smith Bench', 'Landmine Press', 'Pec Deck',
    'Smith Shoulder Press', 'Dumbbell Shoulder Press', 'Dumbbell Pullover', 'Tricep Overhead Extension', 'Ab Raise',
    'Pull-up', 'Chin-up', 'Seated Row', 'Supported Row', 'Lat Pulldown (Single)', 'Lat Pulldown (Double)',
    'Reverse Fly (Double)', 'Reverse Fly (Single)', 'Cable Biceps', 'Supported Biceps (Single)', 'Face Pull', 'Ab Crunch',
    'Leg Press', 'Machine Calf Raise', 'Hamstring Curl', 'Leg Extension', 'Adductor', 'Lateral Raise', 'Machine Press',
    'Incline Bench', 'Shoulder Press', 'Triceps', 'Lat Pulldown', 'Reverse Fly', 'Biceps', 'Calves',
  ];
  // Old names in your history are read as the new ones, so "last time" and PRs carry over.
  const NAME_ALIAS = {
    'Pull-up': 'Pull-Up', 'Chin-up': 'Chin-Up', Triceps: 'Tricep', 'Tricep Overhead Extension': 'Tricep',
    'Incline Bench': 'Incline Smith Bench', 'Pec Deck': 'Pec Deck Fly',
  };
  const CORE_ALIAS = { 'Ab Raise': 'Ab Raise', 'Ab Crunch': 'Ab Crunch' };
  const VAR_ALIAS = {
    'Seated Row': { 'Close MAG grip': 'Close MAG Grip', 'Medium MAG grip': 'Medium MAG Grip' },
    'Lat Pulldown': { 'Close MAG grip': 'Close MAG Grip', 'Medium MAG grip': 'Medium MAG Grip', 'Single arm': 'Single Hand' },
    'Machine Press': { 'Weight stack': 'Weight Stack', 'Plate-loaded': 'Plate Loaded' },
    'Reverse Fly': { Double: 'Machine · Double', 'Single arm': 'Machine · Single' },
    Biceps: { Cable: 'Cable · Double', 'Supported single arm': 'Bench Supported · Single' },
    // Before Pushdown was added, every Tricep set was an overhead extension.
    Tricep: {
      'Overhead extension': 'Overhead Extension · Single Rope',
      'Single Rope · Rope': 'Overhead Extension · Single Rope',
      'Double Cable · Rope': 'Overhead Extension · Double Cable',
      'Single Rope · V-Bar': 'Overhead Extension · V Bar',
      'Double Cable · V-Bar': 'Overhead Extension · V Bar',
    },
  };
  // Exercises renamed in place: [old name, new name, the new default choices].
  const RENAMED = [['Tricep Overhead Extension', 'Tricep', { Setup: 'Overhead Extension', Attachment: 'Single Rope' }]];

  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M6 15.5l4-5 3 3 5-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8.5 20h7M10 17h4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  const SOUNDS = [
    ['bleep', 'Bleep Test'],
    ['bell', 'Boxing Bell'],
    ['chirp', 'Double Chirp'],
    ['pips', 'Race Pips'],
    ['beep', 'Classic Beep'],
    ['off', 'Off'],
  ];
  // A working set shorter than this was almost certainly started late (forgot to tap Start).
  const SHORT_SET = 5;
  // Set styles. (A drop set can be added to any set with "+ Drop Set" while it's the active set.)
  const STYLES = [
    ['normal', 'Normal'],
    ['double', 'Two-Weight Drop Every Set'],
    ['ultimate', 'Ultimate Drop Set'],
  ];

  // ---------- Small helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const hms = (d) => `${hm(d)}:${pad(d.getSeconds())}`;
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const num = (v) => {
    if (v === '' || v == null) return null;
    const n = parseFloat(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (n) => (n == null ? '' : String(Math.round(n * 100) / 100));
  const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s);
  /** Capitalises every word, including after hyphens: "warm-up set" -> "Warm-Up Set". */
  const tc = (s) => String(s || '').replace(/(^|[\s\-/(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
  const clock = (sec) => {
    sec = Math.max(0, Math.floor(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
  };
  /** e.g. "Pacific/Auckland (UTC+13:00)": the phone's time zone at that moment. */
  const timeZoneLabel = (d) => {
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? '+' : '-';
    const name = (Intl.DateTimeFormat().resolvedOptions().timeZone || '').trim();
    const utc = `UTC${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`;
    return name ? `${name} (${utc})` : utc;
  };
  const parseDay = (str) => new Date(str + 'T00:00:00');
  const daysAgo = (str) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const n = Math.round((today - parseDay(str)) / 86400000);
    return n <= 0 ? 'today' : n === 1 ? 'yesterday' : `${n} days ago`;
  };
  const niceDate = (str) => {
    const d = parseDay(str);
    if (isNaN(d)) return str;
    return d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const load = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch (e) {
      return d;
    }
  };
  const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  // IndexedDB holds the full history copy (it can grow past localStorage's limit).
  const idb = (() => {
    let dbp = null;
    const open = () =>
      dbp ||
      (dbp = new Promise((resolve, reject) => {
        const r = indexedDB.open('training-tracker', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('kv');
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      }));
    const run = async (mode, fn) => {
      const db = await open();
      return new Promise((resolve, reject) => {
        const t = db.transaction('kv', mode);
        const req = fn(t.objectStore('kv'));
        t.oncomplete = () => resolve(req.result);
        t.onerror = () => reject(t.error);
      });
    };
    return { get: (k) => run('readonly', (s) => s.get(k)), set: (k, v) => run('readwrite', (s) => s.put(v, k)) };
  })();

  // ---------- Exercise definitions ----------
  /** Choices can be written as plain names or { name, oneArm }. */
  function normalizeEx(e) {
    const x = clone(e);
    if (Array.isArray(x.attachments)) x.variations = x.attachments;
    if (Array.isArray(x.variations)) {
      x.options = [{ label: x.label || 'Type', choices: x.variations }];
      delete x.variations;
      delete x.attachments;
      delete x.label;
    }
    (x.options || []).forEach((g) => (g.choices = g.choices.map((c) => (typeof c === 'string' ? { name: c } : c))));
    return x;
  }

  // ---------- State ----------
  let notice = '';
  const S = {
    settings: Object.assign(
      { pass: '', restSec: 120, warmRest: 60, sound: 'bleep', keepAwake: true, supersets: false, partials: true, bodyKg: 0 },
      load(KEYS.settings, {})
    ),
    library: loadLibrary(),
    current: loadCurrent(),
    pending: Object.assign({ sets: {}, deleteSets: [], sessions: {}, deleteSessions: [], notes: {} }, load(KEYS.pending, {})),
    history: { sets: [], sessions: [], notes: [] },
    tab: 'workout',
    modal: null,
    sync: 'idle',
    page: { name: null, variation: '' },
    editingNote: null,
    reorder: false,
    pairing: null,
    setupOpen: null,
    review: null, // the past workout open on the Workout tab
    recentAll: false,
  };
  if (typeof S.settings.sound !== 'string') S.settings.sound = S.settings.sound ? 'bleep' : 'off';
  // Rest is set per exercise in Workout Setup; these are only the fallbacks.
  S.settings.restSec = 120;
  S.settings.warmRest = 60;

  function loadLibrary() {
    let lib = load(KEYS.library, null);
    if (!lib || lib.version !== DEF.version) {
      // A new split came with this version: start from it, keeping exercises you created yourself.
      const known = new Set(OLD_NAMES.concat(DEF.exercises.map((e) => e.name)));
      const custom = lib && Array.isArray(lib.exercises) ? lib.exercises.filter((e) => !known.has(e.name)) : [];
      lib = { version: DEF.version, exercises: DEF.exercises.concat(custom).map(normalizeEx), days: clone(DEF.days) };
      if (load(KEYS.library, null)) notice = 'Your new split and Workout Setup are loaded. Fine-tune them in Settings.';
    } else {
      // A renamed exercise takes its new name and options, keeping its place in your list and Workout Setup.
      RENAMED.forEach(([from, to, choices]) => {
        if (!lib.exercises.some((e) => e.name === from)) return;
        lib.exercises = lib.exercises.filter((e) => e.name !== to);
        lib.exercises[lib.exercises.findIndex((e) => e.name === from)] = clone(DEF.exercises.find((e) => e.name === to));
        DAYS.forEach((d) =>
          (lib.days[d] || []).forEach((it) => {
            if (!(it.names || []).includes(from)) return;
            it.names = it.names.map((n) => (n === from ? to : n));
            it.choices = Object.assign({}, it.choices, { [to]: choices });
            delete it.choices[from];
          })
        );
      });
      lib.exercises = lib.exercises.map(normalizeEx);
      const have = new Set(lib.exercises.map((e) => e.name));
      DEF.exercises.forEach((e) => !have.has(e.name) && lib.exercises.push(normalizeEx(e)));
      DAYS.forEach((d) => {
        if (!Array.isArray(lib.days[d])) lib.days[d] = clone(DEF.days[d] || []);
      });
    }
    // "Drop Set On Last Set" was retired: drops can now be added to any active set.
    DAYS.forEach((d) => (lib.days[d] || []).forEach((it) => it.style === 'dropLast' && delete it.style));
    // Ultimate drop sets now always go down to 2.5 kg, so the per-set lowest weights are gone.
    DAYS.forEach((d) => (lib.days[d] || []).forEach((it) => delete it.floors));
    store(KEYS.library, lib);
    return lib;
  }

  function loadCurrent() {
    const c = load(KEYS.current, null);
    if (c && c.v !== WORKOUT_V) {
      store(KEYS.current, null);
      notice = 'The app was updated, so your open workout was closed. Sets you had finished are saved.';
      return null;
    }
    if (c) {
      RENAMED.forEach(([from, to, choices]) =>
        Object.values(c.items || {}).forEach((it) => it.name === from && Object.assign(it, { name: to, choices: clone(choices) }))
      );
    }
    return c;
  }

  const persist = () => store(KEYS.current, S.current);
  const savePending = () => store(KEYS.pending, S.pending);
  const saveSettings = () => store(KEYS.settings, S.settings);
  const saveLibrary = () => store(KEYS.library, S.library);
  const exDef = (name) => S.library.exercises.find((e) => e.name === name) || { name };
  const groupsOf = (def) => def.options || [];
  const hasOptions = (def) => groupsOf(def).length > 0;
  const choiceOf = (def, label, name) => {
    const g = groupsOf(def).find((x) => x.label === label);
    return g ? g.choices.find((c) => c.name === name) : null;
  };
  const variationFrom = (def, choices) => groupsOf(def).map((g) => (choices && choices[g.label]) || g.choices[0].name).join(' · ');
  const oneArmFor = (def, choices) =>
    !!def.oneArm || groupsOf(def).some((g) => (choiceOf(def, g.label, (choices && choices[g.label]) || g.choices[0].name) || {}).oneArm);
  const hasPending = () =>
    Object.keys(S.pending.sets).length +
    S.pending.deleteSets.length +
    Object.keys(S.pending.sessions).length +
    S.pending.deleteSessions.length +
    Object.keys(S.pending.notes).length;

  // ---------- History queries ----------
  let memoSets = null;
  let memoNotes = null;
  const memoHist = new Map();
  function invalidate() {
    memoSets = null;
    memoNotes = null;
    memoHist.clear();
  }

  /** Reads an old row under today's names, so history from earlier versions still lines up. */
  function normalizeRow(r) {
    let ex = NAME_ALIAS[r.Exercise] || r.Exercise;
    let v = r.Variation || '';
    if (CORE_ALIAS[ex]) {
      v = CORE_ALIAS[ex];
      ex = 'Core Exercise';
    }
    if (VAR_ALIAS[ex] && VAR_ALIAS[ex][v]) v = VAR_ALIAS[ex][v];
    const def = exDef(ex);
    if (!v && hasOptions(def)) v = variationFrom(def, {});
    if (ex === r.Exercise && v === (r.Variation || '')) return r;
    return Object.assign({}, r, { Exercise: ex, Variation: v });
  }

  /** Every set we know about: the sheet's copy plus changes not uploaded yet. */
  function allSets() {
    if (memoSets) return memoSets;
    const del = new Set(S.pending.deleteSets);
    const map = new Map();
    S.history.sets.forEach((r) => {
      if (r.ID && !del.has(r.ID)) map.set(r.ID, normalizeRow(r));
    });
    Object.values(S.pending.sets).forEach((r) => map.set(r.ID, normalizeRow(r)));
    return (memoSets = [...map.values()]);
  }

  function notesMap() {
    if (memoNotes) return memoNotes;
    const m = {};
    // A note saved under an exercise's old name shows under its new one, unless the new name has its own.
    S.history.notes.forEach((r) => NAME_ALIAS[r.Exercise] && (m[NAME_ALIAS[r.Exercise]] = r.Note || ''));
    S.history.notes.forEach((r) => !NAME_ALIAS[r.Exercise] && (m[r.Exercise] = r.Note || ''));
    Object.values(S.pending.notes).forEach((r) => (m[r.Exercise] = r.Note || ''));
    return (memoNotes = m);
  }
  const noteOf = (name) => notesMap()[name] || '';

  // ---------- Fresh or pre-fatigued ----------
  // How hard an exercise was done depends on what came before it in the workout: Incline after
  // Machine Press is weaker than Incline first. So each exercise in each workout is either "fresh"
  // or "pre-fatigued" (2+ working sets earlier in the workout hit any of its muscles), and hints and
  // up/down markers compare against past workouts in the same state.
  const PREFATIGUE_SETS = 2;
  const musclesOf = (name) => (window.TT_MUSCLES && window.TT_MUSCLES[name]) || [name];
  const shareMuscle = (a, b) => musclesOf(a).some((m) => musclesOf(b).includes(m));
  /** Every row of one workout. */
  function sessionRows(id) {
    let idx = memoHist.get('sessIdx');
    if (!idx) {
      idx = new Map();
      allSets().forEach((r) => (idx.get(r.Session) || idx.set(r.Session, []).get(r.Session)).push(r));
      memoHist.set('sessIdx', idx);
    }
    return idx.get(id) || [];
  }
  /** Was this exercise pre-fatigued in that workout? (null when its times weren't recorded) */
  function wasFatigued(id, name) {
    const rows = sessionRows(id);
    const hard = (r) => r.Type !== 'Warm-up' && !num(r.Drop) && r.Side !== 'R';
    const starts = rows.filter((r) => r.Exercise === name && hard(r)).map((r) => toSec(r.Start)).filter((x) => x != null);
    if (!starts.length) return null;
    const first = Math.min(...starts);
    const before = rows.filter((r) => r.Exercise !== name && hard(r) && toSec(r.Start) != null && toSec(r.Start) < first && shareMuscle(r.Exercise, name));
    return before.length >= PREFATIGUE_SETS;
  }
  /** Is this exercise pre-fatigued in the open workout: by the time it started, or so far if not started yet. */
  function liveFatigued(k) {
    const it = S.current.items[k];
    const started = it.sets
      .filter((s) => !s.warm && s.start)
      .map((s) => s.start)
      .sort()[0];
    let n = 0;
    forEachSet((kk, ii, x) => {
      if (kk === k || x.warm || !x.end || x.side === 'R' || (started && x.end > started)) return;
      if (shareMuscle(S.current.items[kk].name, it.name)) n++;
    });
    return n >= PREFATIGUE_SETS;
  }
  const stateLabel = (f) => (f === true ? 'pre-fatigued' : f === false ? 'fresh' : '');

  /** Earlier sessions of one exercise, newest first; working sets and warm-ups grouped separately. */
  function historyFor(name, variation) {
    const cur = S.current ? S.current.session : '';
    const key = `${name}|${variation || ''}|${cur}`;
    if (memoHist.has(key)) return memoHist.get(key);
    const by = new Map();
    allSets().forEach((r) => {
      if (r.Exercise !== name || r.Session === cur) return;
      if (variation && r.Variation !== variation) return;
      let s = by.get(r.Session);
      if (!s) by.set(r.Session, (s = { session: r.Session, date: r.Date, time: r.Time || '', rows: [] }));
      if (`${r.Date} ${r.Time}` < `${s.date} ${s.time}`) {
        s.date = r.Date;
        s.time = r.Time || '';
      }
      s.rows.push(r);
    });
    const out = [...by.values()]
      .map((s) =>
        Object.assign(s, {
          entries: groupSets(s.rows.filter((r) => r.Type !== 'Warm-up')),
          warmups: groupSets(s.rows.filter((r) => r.Type === 'Warm-up')),
          fatigued: wasFatigued(s.session, name),
        })
      )
      .filter((s) => s.entries.length)
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    memoHist.set(key, out);
    return out;
  }

  /** Turns rows (one per side for one-arm sets, one per drop) into one entry per set. */
  function groupSets(rows) {
    const by = new Map();
    rows
      .slice()
      .sort((a, b) => num(a.Set) - num(b.Set) || (num(a.Drop) || 0) - (num(b.Drop) || 0))
      .forEach((r) => {
        const k = num(r.Set);
        const e = by.get(k) || { set: k, kg: null, kgR: null, variation: '', reps: null, repsR: null, partials: null, rest: null, drops: [] };
        by.set(k, e);
        const dn = num(r.Drop) || 0;
        const right = r.Side === 'R';
        if (dn > 0) {
          const d = e.drops[dn - 1] || (e.drops[dn - 1] = { kg: null, reps: null, repsR: null, partials: null });
          if (right) d.repsR = num(r.Reps);
          else {
            d.reps = num(r.Reps);
            d.partials = num(r.Partials);
          }
          if (d.kg == null) d.kg = num(r.kg);
          return;
        }
        if (!e.variation) e.variation = r.Variation || '';
        if (right) {
          e.repsR = num(r.Reps);
          e.kgR = num(r.kg);
        } else {
          e.reps = num(r.Reps);
          e.partials = num(r.Partials);
          e.rest = num(r['Rest (s)']);
        }
        if (e.kg == null) e.kg = num(r.kg);
      });
    return [...by.values()].map((e) => Object.assign(e, { drops: e.drops.filter(Boolean) }));
  }

  function weightLabel(e, def) {
    if (def.bodyweight) {
      const v = e.variation || 'Bodyweight';
      if (v === 'Weighted') return `+${fmt(e.kg)} kg`;
      if (v.indexOf('Band') === 0) return `${v.replace(/^Band:?\s*/, '') || 'Band'} band`;
      return 'BW';
    }
    return e.kg != null ? `${def.kgLabel ? '+' : ''}${fmt(e.kg)} kg` : '';
  }
  function repsLabel(e) {
    const r = (x) => (x == null ? '–' : x);
    const p = e.partials ? `+${e.partials}p` : '';
    return e.repsR != null ? `L${r(e.reps)}/R${r(e.repsR)}` : `${r(e.reps)}${p}`;
  }
  const dropsLabel = (e) =>
    e.drops && e.drops.length ? ' ↓ ' + e.drops.map((d) => `${d.kg != null ? fmt(d.kg) + '×' : ''}${repsLabel(d)}`).join(' ↓ ') : '';
  function summary(entries, def) {
    if (!entries.length) return '';
    const ws = entries.map((e) => weightLabel(e, def));
    if (ws.every((w) => w === ws[0])) return `${ws[0] ? ws[0] + ' × ' : ''}${entries.map((e) => repsLabel(e) + dropsLabel(e)).join(', ')}`;
    return entries.map((e, i) => `${ws[i] ? ws[i] + ' × ' : ''}${repsLabel(e)}${dropsLabel(e)}`).join(', ');
  }
  function avgRest(entries) {
    const r = entries.map((e) => e.rest).filter((x) => x != null && x > 0);
    return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null;
  }
  function cmp(kg, reps, pkg, preps) {
    if (reps == null || preps == null) return null;
    const a = kg || 0;
    const b = pkg || 0;
    if (a !== b) return { dir: a > b ? 1 : -1, text: `${a > b ? '+' : '−'}${fmt(Math.abs(a - b))} kg` };
    if (reps !== preps) {
      const d = reps - preps;
      return { dir: Math.sign(d), text: `${d > 0 ? '+' : '−'}${Math.abs(d)} rep${Math.abs(d) === 1 ? '' : 's'}` };
    }
    return { dir: 0, text: 'same' };
  }

  // ---------- Workout model ----------
  // A workout has blocks (cards). A block holds one exercise, or two for a superset.
  // Each exercise in a block is an "item" with its settings (cfg), picker choices and set rows.
  // One-arm exercises have one row per side (L then R), each timed on its own.
  // Warm-up rows (s.warm) sit at the front and never count toward progress.
  const orderedKeys = () => S.current.blocks.reduce((a, b) => a.concat(b.keys), []);
  const blockOf = (k) => S.current.blocks.find((b) => b.keys.includes(k));
  const itemDef = (k) => exDef(S.current.items[k].name);
  const oneArm = (k) => oneArmFor(itemDef(k), S.current.items[k].choices);
  const sidesOf = (k) => (oneArm(k) ? ['L', 'R'] : ['']);
  const varFilter = (k) => (hasOptions(itemDef(k)) ? variationFrom(itemDef(k), S.current.items[k].choices) : '');
  /**
   * The past workout to go by for this exercise: your last one in the same state (fresh or
   * pre-fatigued). With none yet, your last one in the other state, marked with the factor that
   * converts its strength to this state (your own fresh-to-tired ratio).
   */
  function refFor(k) {
    const hs = historyFor(S.current.items[k].name, varFilter(k));
    if (!hs.length) return null;
    const st = liveFatigued(k);
    const same = hs.find((h) => h.fatigued === st || h.fatigued == null);
    if (same) return { s: same, same: true, factor: 1 };
    return { s: hs[0], same: false, factor: st ? fatigueRatio() : 1 / fatigueRatio() };
  }
  const lastOf = (k) => {
    const r = refFor(k);
    return r ? r.s : null;
  };
  const workRows = (it) => it.sets.filter((s) => !s.warm).length;
  const warmRows = (it) => it.sets.filter((s) => s.warm).length;
  const unitsOf = (k) => Math.ceil(workRows(S.current.items[k]) / sidesOf(k).length);
  function countBefore(k, i, warm) {
    const sets = S.current.items[k].sets;
    let n = 0;
    for (let j = 0; j < i; j++) if (!!sets[j].warm === warm) n++;
    return n;
  }
  /** Which set (0-based) a row belongs to among its kind (warm-up or working). */
  const unitIndex = (k, i) => Math.floor(countBefore(k, i, !!S.current.items[k].sets[i].warm) / sidesOf(k).length);
  /** Row indexes of working set u. */
  function unitRows(k, u) {
    const out = [];
    const size = sidesOf(k).length;
    S.current.items[k].sets.forEach((s, i) => {
      if (!s.warm && Math.floor(countBefore(k, i, false) / size) === u) out.push(i);
    });
    return out;
  }
  function setNo(k, i) {
    const it = S.current.items[k];
    const u = unitIndex(k, i) + 1;
    if (it.sets[i].warm) return u;
    // Set numbers carry on across a repeat of the same exercise and type (e.g. Calves twice on Legs).
    let off = 0;
    for (const key of orderedKeys()) {
      if (key === k) break;
      if (S.current.items[key].name === it.name && varFilter(key) === varFilter(k)) off += unitsOf(key);
    }
    return off + u;
  }
  const setLabel = (k, i) => {
    const s = S.current.items[k].sets[i];
    return (s.warm ? 'W' : '') + setNo(k, i) + (s.side || '');
  };
  function entryFor(k, i) {
    const last = lastOf(k);
    if (!last) return null;
    const no = setNo(k, i);
    const list = S.current.items[k].sets[i].warm ? last.warmups : last.entries;
    return list.find((e) => e.set === no) || null;
  }
  /** Last time's numbers for this row's side. */
  function sideEntry(k, i) {
    const p = entryFor(k, i);
    if (!p) return null;
    const s = S.current.items[k].sets[i];
    if (s.side !== 'R') return p;
    return Object.assign({}, p, { kg: p.kgR != null ? p.kgR : p.kg, reps: p.repsR, drops: p.drops.map((d) => Object.assign({}, d, { reps: d.repsR })) });
  }
  function forEachSet(fn) {
    if (!S.current) return;
    orderedKeys().forEach((k) => S.current.items[k].sets.forEach((s, i) => fn(k, i, s)));
  }
  function runningSet() {
    let found = null;
    forEachSet((k, i, s) => {
      if (s.start && !s.end) found = { k, i, s };
    });
    return found;
  }

  function variationOf(k, s) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    if (!def.bodyweight) return hasOptions(def) ? variationFrom(def, it.choices) : '';
    if (s.mode === 'Weighted') return 'Weighted';
    if (s.mode === 'Band') return 'Band: ' + (cap((s.band || '').trim()) || 'Purple');
    return 'Bodyweight';
  }

  function newSet(k, opts) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = Object.assign(
      { id: uid(), warm: false, side: '', kg: '', reps: '', partials: '', mode: 'Bodyweight', band: it.cfg.band || 'Purple', start: null, end: null, rest: null, drops: [] },
      opts || {}
    );
    if (def.bodyweight && !s.warm) {
      const u = opts && opts.unit != null ? opts.unit : 0;
      const modes = it.cfg.modes || [];
      if (modes[u]) s.mode = modes[Math.min(u, modes.length - 1)];
      else {
        const last = historyFor(it.name, '')[0];
        const p = last && (last.entries[u] || last.entries[last.entries.length - 1]);
        if (p) {
          const v = p.variation || 'Bodyweight';
          s.mode = v === 'Weighted' ? 'Weighted' : v.indexOf('Band') === 0 ? 'Band' : 'Bodyweight';
          if (s.mode === 'Band') s.band = v.replace(/^Band:?\s*/, '') || s.band;
        }
      }
    }
    delete s.unit;
    return s;
  }

  /** Builds an item's rows: warm-ups first, then working sets; one row per side for one-arm exercises. */
  function buildSets(k, units, warmUnits) {
    const it = S.current.items[k];
    it.sets = [];
    const sides = sidesOf(k);
    for (let w = 0; w < warmUnits; w++) sides.forEach((side) => it.sets.push(newSet(k, { warm: true, side })));
    for (let u = 0; u < units; u++) sides.forEach((side) => it.sets.push(newSet(k, { side, unit: u })));
    applyStyle(k);
  }

  function defaultCfg(name) {
    const last = historyFor(name, '')[0];
    return { sets: Math.max(1, Math.min(last ? last.entries.length : 3, 8)), warmups: 0, style: 'normal' };
  }

  function addBlock(names, cfg, open = true) {
    const c = S.current;
    const b = { id: uid(), keys: [] };
    c.blocks.push(b);
    names.forEach((n) => {
      const k = uid();
      const def = exDef(n);
      const choices = {};
      groupsOf(def).forEach((g) => {
        const want = cfg.choices && cfg.choices[n] && cfg.choices[n][g.label];
        choices[g.label] = choiceOf(def, g.label, want) ? want : g.choices[0].name;
      });
      const partials = cfg.partials != null ? !!cfg.partials : !!def.partials;
      c.items[k] = { name: n, choices, cfg: clone(cfg), partials, sets: [] };
      b.keys.push(k);
    });
    b.keys.forEach((k) => buildSets(k, cfg.sets || 3, cfg.warmups || 0));
    if (open) c.open = b.id;
    return b;
  }

  function startWorkout(day) {
    const now = new Date();
    S.review = null;
    S.current = {
      v: WORKOUT_V,
      session: `${ymd(now)}-${pad(now.getHours())}${pad(now.getMinutes())}`,
      day: day === 'Other' ? 'Workout' : day,
      created: now.toISOString(),
      blocks: [],
      items: {},
      open: null,
      firstStart: null,
      lastEnd: null,
      restCountdown: false,
      restBase: 0,
      restExtra: 0,
      beepedAt: null,
    };
    invalidate();
    (S.library.days[day] || []).forEach((it) => addBlock(it.names, it, false));
    S.current.open = S.current.blocks.length ? S.current.blocks[0].id : null;
    S.tab = 'workout';
    persist();
    unlockAudio();
    keepAwake(true);
    render();
    window.scrollTo(0, 0);
  }

  // ---------- Set styles and drops ----------
  const newDrop = (kg) => ({ id: uid(), kg: kg == null ? '' : fmt(kg), reps: '', partials: '' });
  const canDrop = (k) => !itemDef(k).bodyweight;
  /** A working set with drops (planned by the set style, or added with "+ Drop Set"). */
  const isDropSet = (k, s) => !s.warm && (s.drops || []).length > 0 && canDrop(k);
  const dropUntouched = (s) => !s.start && !s.end && (s.drops || []).every((d) => !d.reps);

  /** Adds the drop rows the exercise's set style asks for, without touching rows already in use. */
  function applyStyle(k) {
    const it = S.current.items[k];
    if (!canDrop(k)) return;
    const style = it.cfg.style || 'normal';
    const units = unitsOf(k);
    for (let u = 0; u < units; u++) {
      unitRows(k, u).forEach((i) => {
        const s = it.sets[i];
        if (!dropUntouched(s)) return;
        if (style === 'double') {
          if (!s.drops.length) s.drops = [newDrop()];
        } else if (style === 'ultimate') {
          regenUltimate(k, i);
        }
      });
    }
  }

  /**
   * Ultimate drop set: from the set's weight, step down by `step` kg all the way to the lightest
   * plate (2.5 kg) on every set. Remove the drops you don't get to.
   */
  const ULTIMATE_FLOOR = 2.5;
  function regenUltimate(k, i) {
    const it = S.current.items[k];
    const s = it.sets[i];
    if (s.warm || it.cfg.style !== 'ultimate' || s.drops.some((d) => d.reps)) return;
    const start = num(s.kg) != null ? num(s.kg) : placeholder(k, i).kg;
    const step = num(it.cfg.step) || 2.5;
    const ws = [];
    if (start) for (let w = Math.round((start - step) * 100) / 100; w >= ULTIMATE_FLOOR - 1e-9 && ws.length < 30; w = Math.round((w - step) * 100) / 100) ws.push(w);
    // Until the set is done its ladder stays as hints, so it follows the weight you pick.
    s.drops = ws.map((w, j) => Object.assign(s.drops[j] || newDrop(), { kg: s.end ? fmt(w) : '' }));
  }
  /** Re-ladders every ultimate set not started yet (their hints follow the sets before them). */
  function regenUpcoming(k) {
    if (S.current.items[k].cfg.style !== 'ultimate') return;
    S.current.items[k].sets.forEach((x, n) => !x.start && !x.end && regenUltimate(k, n));
  }

  /** Hints for a drop: last time's same drop, else carry on the step down. */
  function dropPlaceholder(k, i, j) {
    const it = S.current.items[k];
    const s = it.sets[i];
    const p = sideEntry(k, i);
    const pd = p && p.drops[j];
    if (it.cfg.style === 'ultimate') {
      // The ladder: step down from the set's weight.
      const start = num(s.kg) != null ? num(s.kg) : placeholder(k, i).kg;
      const step = num(it.cfg.step) || 2.5;
      return { kg: start ? Math.round((start - step * (j + 1)) * 100) / 100 : null, reps: pd ? pd.reps : null, partials: pd ? pd.partials : null };
    }
    // The same drop as the set before once it's done; else last time's same drop, scaled by how
    // today's weight compares with last time's; else carry on the step down.
    const src = carrySource(k, i);
    let kg = src && src.drops[j] && num(src.drops[j].kg) != null ? num(src.drops[j].kg) : null;
    if (kg == null && pd && pd.kg != null) {
      const main = num(s.kg) != null ? num(s.kg) : placeholder(k, i).kg;
      kg = p.kg && main && main !== p.kg ? snapKg(it.name, pd.kg * (main / p.kg), pd.kg) : pd.kg;
    }
    if (kg == null && j > 0) {
      const at = (jj) => (jj < 0 ? (num(s.kg) != null ? num(s.kg) : placeholder(k, i).kg) : num(s.drops[jj].kg) != null ? num(s.drops[jj].kg) : dropPlaceholder(k, i, jj).kg);
      const a = at(j - 1);
      const b = at(j - 2);
      if (a != null && b != null && b > a && a - (b - a) > 0) kg = Math.round((a - (b - a)) * 100) / 100;
    }
    return { kg, reps: pd ? pd.reps : null, partials: pd ? pd.partials : null };
  }

  /**
   * The finished set a row takes its weights from: the set before it on the same side once that's
   * done, or for the first set of a side, the set just before it (the other side) once that's done.
   */
  function carrySource(k, i) {
    const sets = S.current.items[k].sets;
    const s = sets[i];
    if (s.warm) return null;
    let same = null;
    let any = null;
    for (let j = i - 1; j >= 0 && !same; j--) {
      const x = sets[j];
      if (x.warm) continue;
      if (!any) any = x;
      if ((x.side || '') === (s.side || '')) same = x;
    }
    const ok = (x) => !!x && !!x.end && x.mode === s.mode;
    return ok(same) ? same : !same && ok(any) ? any : null;
  }

  /** The row you're on in an exercise: the set that's running, else the first one not yet started. */
  function activeRow(k) {
    const sets = S.current.items[k].sets;
    const run = sets.findIndex((s) => s.start && !s.end);
    return run >= 0 ? run : sets.findIndex((s) => !s.start && !s.end);
  }

  function placeholder(k, i) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    const p = sideEntry(k, i);
    const wantsKg = (x) => !def.bodyweight || x.mode === 'Weighted';
    if (s.warm) {
      // Warm-up hint: last time's same warm-up, else a lighter share of the working weight.
      let kg = p && wantsKg(s) ? p.kg : null;
      const first = it.sets.findIndex((x) => !x.warm && (x.side || '') === (s.side || ''));
      if (kg == null && first >= 0 && !def.bodyweight) {
        const base = num(it.sets[first].kg) != null ? num(it.sets[first].kg) : placeholder(k, first).kg;
        const share = [0.5, 0.7, 0.85][Math.min(unitIndex(k, i), 2)];
        if (base) kg = Math.max(2.5, Math.round((base * share) / 2.5) * 2.5);
      }
      return { kg, reps: p ? p.reps : null, partials: p ? p.partials : null };
    }
    // Weight hint: the set before once it's done; else the weight suggested from your history
    // (suggestKg); else the set before (same side); else your last workout's final set.
    const src = wantsKg(s) ? carrySource(k, i) : null;
    let kg = src && num(src.kg) != null ? num(src.kg) : null;
    let reps = p ? p.reps : null;
    if (kg == null && wantsKg(s)) {
      const sug = suggestKg(k, i, p);
      if (sug) [kg, reps] = [sug.kg, sug.reps];
    }
    if (kg == null) {
      for (let j = i - 1; j >= 0 && kg == null; j--) {
        const x = it.sets[j];
        if (x.warm || (x.side || '') !== (s.side || '') || !wantsKg(x)) continue;
        kg = num(x.kg) != null ? num(x.kg) : placeholder(k, j).kg;
      }
    }
    const last = lastOf(k);
    if (kg == null && last && wantsKg(s)) {
      const pool = last.entries.filter((e) => e.kg != null && (!def.bodyweight || e.variation === 'Weighted'));
      if (pool.length) kg = pool[pool.length - 1].kg;
    }
    return { kg, reps, partials: p ? p.partials : null };
  }

  // ---------- Suggested weights ----------
  const midOf = (xs) => {
    const v = xs.slice().sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  };
  /** How much weaker you are pre-fatigued than fresh: from your own workouts (the middle across exercises), else 0.9. */
  function fatigueRatio() {
    if (memoHist.has('fatigueRatio')) return memoHist.get('fatigueRatio');
    const ratios = [];
    [...new Set(allSets().map((r) => r.Exercise))]
      .filter((n) => !exDef(n).bodyweight)
      .forEach((name) => {
        const def = exDef(name);
        const hs = historyFor(name, '');
        const top = (f) => hs.filter((h) => h.fatigued === f).map((h) => score(h.entries, def).value).filter((v) => v > 0);
        const fresh = top(false);
        const tired = top(true);
        if (fresh.length && tired.length) ratios.push(midOf(tired) / midOf(fresh));
      });
    const r = ratios.length ? Math.min(1, Math.max(0.75, midOf(ratios))) : 0.9;
    memoHist.set('fatigueRatio', r);
    return r;
  }
  /** The weight steps you use on an exercise (the smallest gap between weights you've logged), 1–5 kg. */
  function kgStep(name) {
    const key = `step|${name}`;
    if (memoHist.has(key)) return memoHist.get(key);
    const ws = [...new Set(allSets().filter((r) => r.Exercise === name && !num(r.Drop) && num(r.kg) > 0).map((r) => num(r.kg)))].sort((a, b) => a - b);
    const gaps = ws.slice(1).map((w, n) => Math.round((w - ws[n]) * 100) / 100).filter((d) => d >= 0.5);
    const step = gaps.length ? Math.min(5, Math.max(1, Math.min(...gaps))) : 2.5;
    memoHist.set(key, step);
    return step;
  }
  /** Rounds to a weight you'd actually load: steps of kgStep away from a weight you've used. */
  const snapKg = (name, kg, base) => {
    const step = kgStep(name);
    return Math.max(step, Math.round((base + Math.round((kg - base) / step) * step) * 100) / 100);
  };
  /** Your usual reps on this set: the middle of your last few workouts in the same state (else any). */
  function usualReps(k, i) {
    const it = S.current.items[k];
    const s = it.sets[i];
    const no = setNo(k, i);
    const hs = historyFor(it.name, varFilter(k));
    const st = liveFatigued(k);
    const same = hs.filter((h) => h.fatigued === st || h.fatigued == null);
    const reps = (same.length >= 2 ? same : hs)
      .slice(0, 5)
      .map((h) => h.entries.find((e) => e.set === no))
      .filter(Boolean)
      .map((e) => (s.side === 'R' ? e.repsR : e.reps))
      .filter((x) => x != null && x > 0);
    return reps.length ? Math.round(midOf(reps)) : null;
  }
  /**
   * The weight to try on a set, from your history (p = that set in the workout refFor picked):
   * - your strength there (estimated 1-rep max from its weight and reps), converted to today's
   *   state if that workout was in the other one (fresh vs pre-fatigued);
   * - the weight you'd get your usual reps on this set with: beat your usual reps last time and it
   *   steps up, fall short and it steps down;
   * - kept within -15% / +10% of last time, and snapped to the weights you use.
   * Added-weight exercises (pull-ups, landmine) just carry the weight over, converted if needed.
   * Returns { kg, reps } (reps: the target that goes with the weight) or null.
   */
  function suggestKg(k, i, p) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const ref = refFor(k);
    if (!ref || !p || !p.kg || (def.bodyweight && p.variation !== 'Weighted')) return null;
    const base = p.kg * ref.factor;
    if (def.bodyweight || def.kgLabel) return { kg: snapKg(it.name, base, p.kg), reps: p.reps };
    const usual = usualReps(k, i) || p.reps;
    let kg = p.reps && usual ? (e1rm(p.kg, p.reps) * ref.factor) / (1 + usual / 30) : base;
    kg = Math.min(Math.max(kg, base * 0.85), base * 1.1);
    const out = snapKg(it.name, kg, p.kg);
    return { kg: out, reps: out === p.kg ? p.reps : usual };
  }

  function compareSet(k, i) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    if (s.warm) return null;
    // Only against a past workout where this exercise was in the same state (fresh or pre-fatigued).
    const ref = refFor(k);
    if (!ref || !ref.same) return null;
    const p = sideEntry(k, i);
    if (!p) return null;
    if (def.bodyweight && variationOf(k, s) !== (p.variation || 'Bodyweight')) return null;
    const kg = def.bodyweight && s.mode !== 'Weighted' ? null : num(s.kg);
    return cmp(kg, num(s.reps), p.kg, p.reps);
  }

  // Estimated 1-rep max (Epley), and the reps that count for a set (the weaker side for one-arm sets).
  const e1rm = (kg, reps) => (kg && reps ? kg * (1 + reps / 30) : 0);
  const repsOf = (e) => (e.repsR != null ? Math.min(e.reps || 0, e.repsR || 0) : e.reps);

  // ---------- Sheet rows ----------
  const dropBase = (s, d) => `${s.id}-${d.id}`;
  /** Every sheet row id a set can own: its own row plus one per drop. */
  const rowIds = (k, s) => [s.id].concat((s.drops || []).map((d) => dropBase(s, d)));

  function rowsFor(k, i) {
    const c = S.current;
    const it = c.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    const en = new Date(s.end);
    const st = s.start ? new Date(s.start) : en;
    const dur = s.start ? Math.max(0, Math.round((en - st) / 1000)) : '';
    let kg = num(s.kg);
    if (def.bodyweight && s.mode !== 'Weighted') kg = null;
    const base = {
      Date: ymd(st),
      Time: hm(st),
      Day: c.day,
      Exercise: it.name,
      Variation: variationOf(k, s),
      Type: s.warm ? 'Warm-up' : '',
      Set: setNo(k, i),
      Drop: '',
      Side: s.side || '',
      kg: kg == null ? '' : kg,
      Reps: num(s.reps),
      Partials: num(s.partials) == null ? '' : num(s.partials),
      Start: hms(st),
      End: hms(en),
      'Set (s)': dur,
      'Rest (s)': s.rest == null ? '' : s.rest,
      Session: c.session,
      ID: s.id,
    };
    const rows = [base];
    // Drops share the set's number, side and times; only drops with reps or partials typed are saved.
    let n = 0;
    (s.drops || []).forEach((d) => {
      const dkg = num(d.kg);
      const dr = num(d.reps);
      const dp = num(d.partials);
      if (dr == null && dp == null) return;
      n++;
      rows.push(Object.assign({}, base, { Drop: n, kg: dkg == null ? '' : dkg, Reps: dr == null ? '' : dr, Partials: dp == null ? '' : dp, 'Set (s)': '', 'Rest (s)': '', ID: dropBase(s, d) }));
    });
    return rows;
  }

  /** Queues a finished set's rows, and removes rows it no longer has (emptied or removed drops). */
  function syncSetRows(k, i) {
    const s = S.current.items[k].sets[i];
    const rows = rowsFor(k, i);
    const keep = new Set(rows.map((r) => r.ID));
    const stale = rowIds(k, s).filter((id) => !keep.has(id));
    if (stale.length) unqueueRows(stale);
    queueRows(rows);
  }
  function queueRows(rows) {
    const ids = new Set(rows.map((r) => r.ID));
    rows.forEach((r) => (S.pending.sets[r.ID] = r));
    S.pending.deleteSets = S.pending.deleteSets.filter((x) => !ids.has(x));
    savePending();
    invalidate();
  }
  function unqueueRows(ids) {
    ids.forEach((id) => {
      delete S.pending.sets[id];
      if (!S.pending.deleteSets.includes(id)) S.pending.deleteSets.push(id);
    });
    savePending();
    invalidate();
  }
  /** Re-sends every finished set of these exercises (their set numbers may have shifted). */
  function requeueNames(names) {
    forEachSet((k, i, s) => {
      if (s.end && names.includes(S.current.items[k].name)) syncSetRows(k, i);
    });
  }

  function sessionStats() {
    let first = null;
    let last = null;
    let sets = 0;
    let work = 0;
    let rest = 0;
    let rests = 0;
    let any = 0;
    forEachSet((k, i, s) => {
      if (!s.end) return;
      any++;
      if (!s.warm && s.side !== 'R') sets++;
      const en = new Date(s.end);
      const st = s.start ? new Date(s.start) : en;
      if (!first || st < first) first = st;
      if (!last || en > last) last = en;
      work += (en - st) / 1000;
      if (s.rest) {
        rest += s.rest;
        rests++;
      }
    });
    return { first, last, sets, any, work, rest, avgRest: rests ? rest / rests : null };
  }
  function queueSession() {
    const c = S.current;
    const st = sessionStats();
    if (!st.any) {
      dropSession(c.session);
      return;
    }
    // All times are your phone's local time; the time zone is stored alongside.
    const secs = Math.max(0, Math.round((st.last - st.first) / 1000));
    S.pending.sessions[c.session] = {
      Session: c.session,
      Date: ymd(st.first),
      Day: c.day,
      Start: hms(st.first),
      End: hms(st.last),
      Duration: `${Math.floor(secs / 3600)}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`,
      'Time Zone': timeZoneLabel(st.first),
      'Length (min)': Math.max(1, Math.round((st.last - st.first) / 60000)),
      Sets: st.sets,
      'Work (min)': Math.round(st.work / 6) / 10,
      'Rest (min)': Math.round(st.rest / 6) / 10,
    };
    S.pending.deleteSessions = S.pending.deleteSessions.filter((x) => x !== c.session);
    savePending();
  }
  function dropSession(id) {
    delete S.pending.sessions[id];
    if (!S.pending.deleteSessions.includes(id)) S.pending.deleteSessions.push(id);
    savePending();
  }

  const requeueTimers = {};
  function requeueSoon(k, sid) {
    clearTimeout(requeueTimers[sid]);
    requeueTimers[sid] = setTimeout(() => {
      const it = S.current && S.current.items[k];
      const i = it ? it.sets.findIndex((x) => x.id === sid) : -1;
      if (i >= 0 && it.sets[i].end) {
        syncSetRows(k, i);
        scheduleSync();
        refreshFooter(k, i);
      }
    }, 800);
  }
  /** Redraws just the line under a set (markers, PR, timing) without touching the boxes being typed in. */
  function refreshFooter(k, i) {
    const it = S.current && S.current.items[k];
    const s = it && it.sets[i];
    if (!s) return;
    const el = document.getElementById('ft-' + s.id);
    const b = blockOf(k);
    if (el) el.outerHTML = footerHtml(k, i, b && b.keys.length > 1);
  }

  // ---------- Start, end and undo a set ----------
  function startSet(k, i) {
    const c = S.current;
    const s = c.items[k].sets[i];
    if (runningSet()) {
      toast('End The Set That’s Running First');
      return;
    }
    const now = new Date();
    s.start = now.toISOString();
    s.rest = c.lastEnd ? Math.round((now - new Date(c.lastEnd)) / 1000) : null;
    if (!c.firstStart) c.firstStart = s.start;
    unlockAudio();
    keepAwake(true);
    persist();
    render();
  }

  /** Rest after a row: warm-up rest, the in-round rest of a superset, or the exercise's rest (0 = no timer). */
  function restAfter(k, s) {
    const it = S.current.items[k];
    if (s.warm) return S.settings.warmRest;
    const b = blockOf(k);
    if (b && b.keys[b.keys.length - 1] !== k) return it.cfg.restBetween || 0;
    if (it.cfg.rest === 0) return 0;
    return it.cfg.rest || S.settings.restSec;
  }

  function endSet(k, i) {
    const c = S.current;
    const it = c.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    s.end = new Date().toISOString();
    const ph = placeholder(k, i);
    if (s.kg === '' && (!def.bodyweight || s.mode === 'Weighted') && ph.kg != null) {
      s.kg = fmt(ph.kg);
      if (it.cfg.style === 'ultimate') regenUltimate(k, i);
    }
    s.drops.forEach((d, j) => {
      if (d.kg === '') {
        const dp = dropPlaceholder(k, i, j);
        if (dp.kg != null) d.kg = fmt(dp.kg);
      }
    });
    if (s.mode === 'Band' && !String(s.band || '').trim()) s.band = it.cfg.band || 'Purple';
    // The sets after this one now hint this set's weights (see placeholder), shown dim until you're on them.
    regenUpcoming(k);
    c.lastEnd = s.end;
    c.lastEndKey = k;
    const target = restAfter(k, s);
    c.restCountdown = target > 0;
    c.restBase = target;
    c.restWarm = !!s.warm;
    c.restExtra = 0;
    c.beepedAt = null;
    unlockAudio();
    syncSetRows(k, i);
    queueSession();
    persist();
    render();
    scheduleSync();
    const reps = document.querySelector(`.set-row [data-k="${k}"][data-i="${i}"][data-f="reps"]`);
    if (reps && !reps.value && !s.warm) reps.focus();
  }

  /** True once every set of the exercise (or superset) you last finished a set in is done. */
  function finishedMovement() {
    const c = S.current;
    const b = c && c.lastEndKey && c.items[c.lastEndKey] ? blockOf(c.lastEndKey) : null;
    return !!b && b.keys.every((k) => c.items[k].sets.every((s) => s.end));
  }
  /** The next exercise with sets still to do: after the finished one if possible, else any. */
  function nextOpenBlock() {
    const c = S.current;
    const unfinished = (b) => b.keys.some((k) => c.items[k].sets.some((s) => !s.end));
    const from = c.lastEndKey ? c.blocks.indexOf(blockOf(c.lastEndKey)) : -1;
    return c.blocks.slice(from + 1).find(unfinished) || c.blocks.find(unfinished) || null;
  }

  // ---------- Fixing a set's time ----------
  const setSecs = (s) => (s.start && s.end ? Math.max(0, Math.round((new Date(s.end) - new Date(s.start)) / 1000)) : 0);
  /** "45" = 0:45, "130" or "1:30" or "1.30" = 1:30. */
  function parseDur(v) {
    const t = String(v || '').trim().replace('.', ':');
    let m = t.match(/^(\d{1,2}):(\d{1,2})$/);
    if (m) return +m[1] * 60 + +m[2];
    m = t.match(/^\d{1,4}$/);
    if (!m) return null;
    return t.length <= 2 ? +t : +t.slice(0, -2) * 60 + +t.slice(-2);
  }
  /** Your usual time for a working set of this exercise (the middle of your recent ones). */
  function usualSetTime(name) {
    const xs = allSets()
      .filter((r) => r.Exercise === name && r.Type !== 'Warm-up' && !num(r.Drop) && num(r['Set (s)']) >= SHORT_SET)
      .map((r) => num(r['Set (s)']))
      .slice(-30)
      .sort((a, b) => a - b);
    return xs.length ? xs[Math.floor(xs.length / 2)] : null;
  }
  /**
   * Longer than logged: you forgot to tap Start, so the set began earlier and the rest before it was shorter.
   * Shorter: you forgot to tap End, so it finished earlier and the rest after it (before the next set) was longer.
   */
  function fixSetTime(k, i, dur) {
    const c = S.current;
    const s = c.items[k].sets[i];
    const end = new Date(s.end);
    const d = dur - setSecs(s);
    if (!d) return;
    if (d > 0) {
      s.start = new Date(end - dur * 1000).toISOString();
      if (s.rest != null) s.rest = Math.max(0, s.rest - d);
      if (!c.firstStart || s.start < c.firstStart) c.firstStart = s.start;
    } else {
      const oldEnd = s.end;
      s.end = new Date(end.getTime() + d * 1000).toISOString();
      if (c.lastEnd === oldEnd) c.lastEnd = s.end;
      let next = null;
      forEachSet((kk, ii, x) => {
        if (x !== s && x.start && x.start >= oldEnd && (!next || x.start < next.x.start)) next = { kk, ii, x };
      });
      if (next && next.x.rest != null) {
        next.x.rest -= d;
        if (next.x.end) syncSetRows(next.kk, next.ii);
      }
    }
    syncSetRows(k, i);
    queueSession();
    persist();
    scheduleSync();
  }

  function undoSet(k, i) {
    const c = S.current;
    const s = c.items[k].sets[i];
    unqueueRows(rowIds(k, s));
    s.start = null;
    s.end = null;
    s.rest = null;
    let last = null;
    let first = null;
    forEachSet((kk, ii, x) => {
      if (x.end && (!last || x.end > last)) last = x.end;
      if (x.start && (!first || x.start < first)) first = x.start;
    });
    c.lastEnd = last;
    c.firstStart = first;
    queueSession();
    persist();
    render();
    scheduleSync();
  }

  function saveFinish() {
    const run = runningSet();
    if (run) endSet(run.k, run.i);
    const c = S.current;
    const saved = sessionStats().any;
    if (saved) {
      queueSession();
      toast('Workout Saved');
    } else {
      dropSession(c.session);
    }
    // Land on the workout's summary, with Edit right there for anything logged wrong.
    if (saved) S.review = { session: c.session, edit: false, drafts: [] };
    closeWorkout();
  }
  function discardWorkout() {
    forEachSet((k, i, s) => s.end && unqueueRows(rowIds(k, s)));
    dropSession(S.current.session);
    toast('Workout Discarded');
    closeWorkout();
  }
  function closeWorkout() {
    S.current = null;
    S.modal = null;
    S.reorder = false;
    S.pairing = null;
    persist();
    invalidate();
    keepAwake(false);
    render();
    window.scrollTo(0, 0);
    sync().then(() => refreshHistory(true));
  }

  // ---------- Notes ----------
  function saveNote(name, text) {
    const now = new Date();
    S.pending.notes[name] = { Exercise: name, Note: text.trim(), Updated: `${ymd(now)} ${hm(now)}` };
    savePending();
    invalidate();
    S.editingNote = null;
    render();
    scheduleSync();
    toast(text.trim() ? 'Note Saved' : 'Note Removed');
  }

  // ---------- Sync with the Google Sheet ----------
  async function api(action, extra, pass) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 25000);
    try {
      const body = Object.assign({ action, pass: pass == null ? S.settings.pass : pass }, extra || {});
      const res = await fetch(CFG.backendUrl, { method: 'POST', body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      if (!data.ok) {
        const err = new Error(data.error || 'error');
        err.code = data.error;
        throw err;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  let syncTimer = null;
  let syncing = null;
  let retryTimer = null;
  function scheduleSync(delay = 1500) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, delay);
  }
  function upsertLocal(list, key, row) {
    const i = list.findIndex((r) => r[key] === row[key]);
    if (i >= 0) list[i] = row;
    else list.push(row);
  }
  const parseSetRow = (r) => Object.assign({}, r, { Set: num(r.Set), kg: num(r.kg), Reps: num(r.Reps) });

  function sync() {
    if (syncing) return syncing;
    syncing = doSync().finally(() => {
      syncing = null;
    });
    return syncing;
  }
  async function doSync() {
    if (!S.settings.pass) return;
    const p = S.pending;
    const sets = Object.values(p.sets);
    const sessions = Object.values(p.sessions);
    const notes = Object.values(p.notes);
    const deleteSets = p.deleteSets.slice();
    const deleteSessions = p.deleteSessions.slice();
    if (!sets.length && !sessions.length && !notes.length && !deleteSets.length && !deleteSessions.length) {
      setSync('idle');
      return;
    }
    if (!navigator.onLine) {
      setSync('offline');
      return;
    }
    setSync('syncing');
    try {
      await api('sync', { sets, sessions, notes, deleteSets, deleteSessions });
      sets.forEach((r) => {
        if (p.sets[r.ID] === r) delete p.sets[r.ID];
        upsertLocal(S.history.sets, 'ID', parseSetRow(r));
      });
      sessions.forEach((r) => {
        if (p.sessions[r.Session] === r) delete p.sessions[r.Session];
        upsertLocal(S.history.sessions, 'Session', r);
      });
      notes.forEach((r) => {
        if (p.notes[r.Exercise] === r) delete p.notes[r.Exercise];
        upsertLocal(S.history.notes, 'Exercise', r);
      });
      const ds = new Set(deleteSets);
      const dss = new Set(deleteSessions);
      p.deleteSets = p.deleteSets.filter((x) => !ds.has(x));
      p.deleteSessions = p.deleteSessions.filter((x) => !dss.has(x));
      S.history.sets = S.history.sets.filter((r) => !ds.has(r.ID) || p.sets[r.ID]);
      S.history.sessions = S.history.sessions.filter((r) => !dss.has(r.Session) || p.sessions[r.Session]);
      savePending();
      invalidate();
      idb.set('history', S.history).catch(() => {});
      setSync('idle');
      if (hasPending()) scheduleSync(500);
    } catch (e) {
      if (e.code === 'wrong_passphrase') setSync('auth');
      else setSync(navigator.onLine ? 'error' : 'offline');
      clearTimeout(retryTimer);
      retryTimer = setTimeout(sync, 30000);
    }
  }

  let lastFetch = 0;
  let fetching = false;
  async function refreshHistory(force) {
    if (!S.settings.pass || !navigator.onLine || fetching) return;
    if (!force && Date.now() - lastFetch < 60000) return;
    fetching = true;
    try {
      await sync();
      const d = await api('history');
      const toObjects = (t) => (t ? t.rows.map((r) => Object.fromEntries(t.headers.map((h, i) => [h, r[i]]))) : []);
      S.history = {
        sets: toObjects(d.sets).filter((r) => r.ID).map(parseSetRow),
        sessions: toObjects(d.sessions).filter((r) => r.Session),
        notes: toObjects(d.notes).filter((r) => r.Exercise),
      };
      lastFetch = Date.now();
      idb.set('history', S.history).catch(() => {});
      invalidate();
      if (S.sync === 'auth') setSync('idle');
      if (!isTyping()) render();
    } catch (e) {
      if (e.code === 'wrong_passphrase') setSync('auth');
    } finally {
      fetching = false;
    }
  }
  const isTyping = () => {
    const a = document.activeElement;
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA');
  };

  function setSync(state) {
    S.sync = state;
    document.querySelectorAll('.syncline').forEach((el) => (el.innerHTML = syncText()));
  }
  function syncText() {
    const n = hasPending();
    const changes = `${n} change${n === 1 ? '' : 's'}`;
    if (S.sync === 'auth') return '<span class="bad">Your sheet rejected the passphrase. Update it in Settings.</span>';
    if (S.sync === 'syncing') return '<span>Saving to your sheet…</span>';
    if (!n) return '<span class="ok">Everything is saved to your sheet</span>';
    if (!navigator.onLine || S.sync === 'offline') return `<span class="warn">No signal: ${changes} kept on this device, uploading later</span>`;
    if (S.sync === 'error') return `<span class="warn">Upload failed, retrying soon: ${changes} waiting</span>`;
    return `<span>${changes} waiting to upload</span>`;
  }

  // ---------- Sounds, screen and timers ----------
  let actx = null;
  function unlockAudio() {
    try {
      // "transient" asks iOS to dip other audio (your music) while the short sound plays.
      if (navigator.audioSession) navigator.audioSession.type = 'transient';
    } catch (e) {}
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== 'running') actx.resume();
    } catch (e) {}
  }
  function tone(t0, freq, dur, opts) {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = (opts && opts.type) || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (opts && opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t0 + dur);
    const peak = (opts && opts.gain) || 0.6;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(actx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }
  function bell(t0, base) {
    [1, 2.76, 5.4].forEach((m, n) => tone(t0, base * m, 1.1 - n * 0.3, { gain: 0.45 / (n + 1) }));
  }
  function playSound(name) {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (!actx || name === 'off') return;
    try {
      if (actx.state !== 'running') actx.resume();
      const t = actx.currentTime + 0.05;
      if (name === 'bleep') {
        // The fitness "beep test" double tone, played twice.
        [0, 0.7].forEach((d) => {
          tone(t + d, 1040, 0.16, { type: 'square', gain: 0.25 });
          tone(t + d + 0.2, 1040, 0.32, { type: 'square', gain: 0.25 });
        });
      } else if (name === 'bell') {
        [0, 0.32, 0.64].forEach((d) => bell(t + d, 1100));
      } else if (name === 'chirp') {
        [0, 0.18, 0.6, 0.78].forEach((d) => tone(t + d, 700, 0.14, { to: 1600, gain: 0.5 }));
      } else if (name === 'pips') {
        [0, 0.35, 0.7].forEach((d) => tone(t + d, 1000, 0.1, { gain: 0.55 }));
        tone(t + 1.05, 1000, 0.5, { gain: 0.55 });
      } else {
        [0, 0.28, 0.56].forEach((d, n) => tone(t + d, n === 2 ? 1320 : 880, 0.22, { gain: 0.7 }));
      }
    } catch (e) {}
  }

  let wakeLock = null;
  async function keepAwake(on) {
    try {
      if (on && S.settings.keepAwake && 'wakeLock' in navigator && document.visibilityState === 'visible') {
        if (!wakeLock) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => (wakeLock = null));
        }
      } else if (!on && wakeLock) {
        await wakeLock.release();
        wakeLock = null;
      }
    } catch (e) {
      wakeLock = null;
    }
  }

  const restTarget = () => ((S.current && S.current.restBase) || S.settings.restSec) + ((S.current && S.current.restExtra) || 0);

  function tickClock() {
    const c = S.current;
    if (!c) return;
    const now = Date.now();
    const w = $('#wclock');
    if (w) w.textContent = c.firstStart ? clock((now - new Date(c.firstStart)) / 1000) : '0:00';
    const t = $('#st-time');
    const run = runningSet();
    if (run) {
      const el = clock((now - new Date(run.s.start)) / 1000);
      if (t) t.textContent = el;
      const rb = document.getElementById('rt-' + run.s.id);
      if (rb) rb.textContent = el;
      return;
    }
    if (!c.lastEnd) return;
    const el = (now - new Date(c.lastEnd)) / 1000;
    if (!c.restCountdown || finishedMovement()) {
      if (t) t.textContent = clock(el);
      return;
    }
    const target = restTarget();
    const left = target - el;
    const over = left <= 0;
    const st = $('#status');
    if (st) st.classList.toggle('over', over);
    if (t) t.textContent = over ? '+' + clock(-left) : clock(Math.ceil(left));
    const lb = $('#st-label');
    if (lb) lb.textContent = over ? 'Rest Over · Start Your Next Set' : c.restWarm ? 'Next Set In (After Warm-Up)' : 'Next Set In';
    const bar = $('#st-bar');
    if (bar) bar.style.width = `${Math.min(100, (el / target) * 100)}%`;
    const tg = $('#st-target');
    if (tg) tg.textContent = `Rest ${clock(target)}`;
    if (over && c.beepedAt !== c.lastEnd) {
      c.beepedAt = c.lastEnd;
      persist();
      if (-left < 5) playSound(S.settings.sound);
    }
  }

  // ---------- Views ----------
  function render() {
    const app = $('#app');
    let html;
    if (!S.settings.pass) html = connectView();
    else if (S.tab === 'exercises') html = exercisesView();
    else if (S.tab === 'settings') html = settingsView();
    else html = S.current ? workoutView() : S.review ? reviewView() : startView();
    if (S.modal && S.modal.type === 'time') html += timeModal();
    app.innerHTML = html;
    const tabs = $('#tabs');
    tabs.hidden = !S.settings.pass;
    tabs.innerHTML = S.settings.pass ? tabsHtml() : '';
    tickClock();
    const ta = $('#note-input');
    if (ta && document.activeElement !== ta) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }

  function tabsHtml() {
    const t = (id, icon, label) =>
      `<button class="${S.tab === id ? 'on' : ''}" data-action="tab" data-tab="${id}" aria-current="${S.tab === id ? 'page' : 'false'}">${icon}<span>${label}</span></button>`;
    return t('workout', ICON.lift, S.current ? 'Workout ●' : 'Workout') + t('exercises', ICON.chart, 'Exercises') + t('settings', ICON.gear, 'Settings');
  }

  function connectView() {
    return `<div class="connect">
      <img class="logo" src="icon.svg" alt="">
      <h1>Training Tracker</h1>
      <p class="muted">Enter the passphrase you set in your Training Log sheet. You only do this once on each device.</p>
      <input id="pass" type="password" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Passphrase" enterkeyhint="go">
      <p id="connect-err" class="err-text" role="alert"></p>
      <button class="btn primary wide" data-action="connect">Connect</button>
    </div>`;
  }

  function recentSessions() {
    const by = new Map();
    allSets().forEach((r) => {
      if (S.current && r.Session === S.current.session) return;
      let s = by.get(r.Session);
      if (!s) by.set(r.Session, (s = { session: r.Session, day: r.Day, date: r.Date, time: r.Time || '', sets: 0 }));
      if (r.Side !== 'R' && !num(r.Drop) && r.Type !== 'Warm-up') s.sets++;
      if (`${r.Date} ${r.Time}` < `${s.date} ${s.time}`) {
        s.date = r.Date;
        s.time = r.Time || '';
      }
    });
    const info = {};
    S.history.sessions.concat(Object.values(S.pending.sessions)).forEach((r) => (info[r.Session] = r));
    const hhmm = (v) => (v ? String(v).slice(0, 5) : '');
    return [...by.values()]
      .map((s) => {
        const r = info[s.session];
        return Object.assign(s, { length: r ? num(r['Length (min)']) : null, from: r ? hhmm(r.Start) : '', to: r ? hhmm(r.End) : '' });
      })
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }

  function startView() {
    const sessions = recentSessions();
    const lastByDay = {};
    const lens = {};
    sessions.forEach((s) => {
      if (!lastByDay[s.day]) lastByDay[s.day] = s.date;
      if (s.length) (lens[s.day] = lens[s.day] || []).push(s.length);
    });
    const days = DAYS.map((d) => {
      const l = lens[d];
      const avg = l ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null;
      return `<button class="day" data-action="start" data-day="${d}">
        <span class="day-name">${d}</span>
        ${avg ? `<span class="day-stat">Avg ${avg} Min</span>` : ''}
        <span class="muted small">${lastByDay[d] ? 'Last ' + esc(daysAgo(lastByDay[d])) : 'Not done yet'}</span>
      </button>`;
    }).join('');
    const recent = (S.recentAll ? sessions : sessions.slice(0, 8))
      .map((s) => {
        const meta = [s.from && s.to ? `${s.from}–${s.to}` : s.from, s.length ? `${s.length} min` : '', `${s.sets} set${s.sets === 1 ? '' : 's'}`].filter(Boolean).join(' · ');
        return `<li class="tap"><button class="li-btn" data-action="rv-open" data-session="${esc(s.session)}">
          <div class="li-main"><span>${esc(niceDate(s.date))}</span><span>${esc(s.day)}<span class="chev" aria-hidden="true">›</span></span></div>
          <div class="muted small">${esc(meta)}</div></button></li>`;
      })
      .join('');
    const more = sessions.length > 8 ? `<button class="link more" data-action="recent-all">${S.recentAll ? 'Show Fewer' : `Show All ${sessions.length}`}</button>` : '';
    return `<header class="top"><div class="brand"><img src="icon.svg" alt=""><div><h1>Start A Workout</h1><div class="syncline">${syncText()}</div></div></div></header>
      <div class="day-grid">${days}</div>
      <button class="btn wide" data-action="start" data-day="Other">Empty Workout</button>
      ${recent ? `<h2>Recent Workouts</h2><ul class="list">${recent}</ul>${more}` : ''}`;
  }

  // ---------- Reviewing and fixing a past workout ----------
  // S.review = { session, edit, drafts }. Drafts are sets or drops added in Edit but not filled
  // in yet; they're only saved once you type into them, so a stray tap leaves nothing behind.
  const isDropRow = (r) => !!num(r.Drop);
  const rvKey = (r) => (exDef(r.Exercise).bodyweight ? r.Exercise : `${r.Exercise}|${r.Variation || ''}`);
  const rvLabel = (r) => (r.Type === 'Warm-up' ? 'W' : '') + (num(r.Set) || '') + (r.Side || '');
  /** Rows of one set: the set itself and its drops. */
  const sameSet = (a, b) =>
    a.Session === b.Session && rvKey(a) === rvKey(b) && (a.Type || '') === (b.Type || '') && num(a.Set) === num(b.Set) && (a.Side || '') === (b.Side || '');
  const rvRows = (id) => allSets().filter((r) => r.Session === id).concat(S.review.drafts.filter((r) => r.Session === id));
  const rvRow = (id) => allSets().find((r) => r.ID === id) || S.review.drafts.find((r) => r.ID === id) || null;
  const isDraft = (r) => S.review.drafts.some((d) => d.ID === r.ID);
  /** "11:05:17" <-> seconds since midnight (the sheet's Start and End are local clock times). */
  const toSec = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    return m ? +m[1] * 3600 + +m[2] * 60 + (+m[3] || 0) : null;
  };
  const fromSec = (x) => {
    const v = ((x % 86400) + 86400) % 86400;
    return `${pad(Math.floor(v / 3600))}:${pad(Math.floor((v % 3600) / 60))}:${pad(v % 60)}`;
  };
  const rvDur = (r) => {
    const st = toSec(r.Start);
    const en = toSec(r.End);
    return num(r['Set (s)']) != null ? num(r['Set (s)']) : st != null && en != null ? Math.max(0, en - st) : null;
  };
  /** The same rule as during a workout: longer moves the start earlier, shorter moves the end earlier. */
  function rvFixTime(id, dur) {
    const r = rvRow(id);
    const en = r && toSec(r.End);
    if (en == null) return;
    const d = dur - (rvDur(r) || 0);
    if (!d) return;
    const unit = rvRows(r.Session).filter((x) => sameSet(x, r));
    const out = [];
    const patch = (x, p) => (isDraft(x) ? Object.assign(x, p) : out.push(Object.assign({}, x, p)));
    if (d > 0) {
      const start = fromSec(en - dur);
      const rest = num(r['Rest (s)']);
      unit.forEach((x) =>
        patch(x, Object.assign({ Start: start, Time: start.slice(0, 5) }, x.ID === r.ID ? { 'Set (s)': dur, 'Rest (s)': rest != null ? Math.max(0, rest - d) : '' } : {}))
      );
    } else {
      const end = fromSec(en + d);
      unit.forEach((x) => patch(x, Object.assign({ End: end }, x.ID === r.ID ? { 'Set (s)': dur } : {})));
      // The set that started next counted its rest from the old end.
      const next = allSets()
        .filter((x) => x.Session === r.Session && !num(x.Drop) && !sameSet(x, r) && toSec(x.Start) != null && toSec(x.Start) >= en)
        .sort((a, b) => toSec(a.Start) - toSec(b.Start))[0];
      if (next && num(next['Rest (s)']) != null) out.push(Object.assign({}, next, { 'Rest (s)': num(next['Rest (s)']) - d }));
    }
    if (out.length) {
      queueRows(out);
      rvSessionRow(r.Session);
      scheduleSync();
    }
  }

  /** A past workout's rows grouped by exercise (and type, for weights), in the order you did them. */
  function reviewGroups(id) {
    const groups = new Map();
    rvRows(id).forEach((r) => {
      const key = rvKey(r);
      let g = groups.get(key);
      if (!g) groups.set(key, (g = { key, name: r.Exercise, variation: exDef(r.Exercise).bodyweight ? '' : r.Variation || '', rows: [], first: '' }));
      g.rows.push(r);
      const t = String(r.Start || r.Time || '');
      if (t && (!g.first || t < g.first)) g.first = t;
    });
    const rank = (r) => [r.Type === 'Warm-up' ? 0 : 1, num(r.Set) || 0, r.Side === 'R' ? 1 : 0, num(r.Drop) || 0];
    const byRank = (a, b) => {
      const x = rank(a);
      const y = rank(b);
      for (let n = 0; n < x.length; n++) if (x[n] !== y[n]) return x[n] - y[n];
      return 0;
    };
    return [...groups.values()].sort((a, b) => a.first.localeCompare(b.first)).map((g) => Object.assign(g, { rows: g.rows.sort(byRank) }));
  }

  function reviewView() {
    const R = S.review;
    const groups = reviewGroups(R.session);
    if (!groups.length) {
      S.review = null;
      return startView();
    }
    const real = allSets().filter((r) => r.Session === R.session);
    const info = S.pending.sessions[R.session] || S.history.sessions.find((r) => r.Session === R.session) || {};
    const first = real[0] || groups[0].rows[0];
    const sets = real.filter((r) => r.Type !== 'Warm-up' && r.Side !== 'R' && !isDropRow(r)).length;
    const sum = (col) => real.reduce((a, r) => a + (num(r[col]) || 0), 0);
    const starts = real.map((r) => toSec(r.Start)).filter((x) => x != null);
    const ends = real.map((r) => toSec(r.End)).filter((x) => x != null);
    const span = starts.length && ends.length ? Math.max(...ends) - Math.min(...starts) : -1;
    const total = span >= 0 ? Math.max(60, span) : (num(info['Length (min)']) || 0) * 60;
    const hhmm = (v) => (v ? String(v).slice(0, 5) : '');
    const when = [niceDate(first.Date), info.Start ? `${hhmm(info.Start)}–${hhmm(info.End)}` : '', num(info['Length (min)']) ? `${num(info['Length (min)'])} min` : '']
      .filter(Boolean)
      .join(' · ');
    let h = `<header class="top rv-top">
      <button class="link" data-action="rv-close">‹ All Workouts</button>
      <div class="rv-head"><h1>${esc(first.Day || 'Workout')}</h1>
        <button class="btn small ${R.edit ? 'primary' : ''}" data-action="rv-edit">${R.edit ? 'Done' : 'Edit'}</button></div>
      <div class="muted">${esc(when)}</div></header>`;
    if (R.edit) h += '<p class="muted small">Changes save as you type. Tap ✕ twice to delete a set or drop.</p>';
    else h += statTiles({ total, work: sum('Set (s)'), rest: sum('Rest (s)'), sets }, null, 'rv-stats');
    h += issuesHtml(workoutIssues(rvCheckSets(R.session)), 'review');
    groups.forEach((g) => (h += R.edit ? rvEditGroup(g) : rvReadGroup(g)));
    if (R.edit) h += '<button class="btn ghost danger wide" data-action="rv-delete-all">Delete This Workout</button>';
    return h;
  }

  /** The "Fix Set Time" dialog, for a set in the open workout ({k, i}) or a past one ({id}). */
  function timeModal() {
    const M = S.modal;
    let name;
    let label;
    let cur;
    let warm;
    if (M.id) {
      const r = S.review && rvRow(M.id);
      if (!r) return '';
      [name, label, cur, warm] = [r.Exercise, rvLabel(r), rvDur(r) || 0, r.Type === 'Warm-up'];
    } else {
      const it = S.current && S.current.items[M.k];
      const s = it && it.sets[M.i];
      if (!s) return '';
      [name, label, cur, warm] = [it.name, setLabel(M.k, M.i), setSecs(s), s.warm];
    }
    const usual = warm ? null : usualSetTime(name);
    return `<div class="modal-back" data-action="modal-close-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Fix Set Time</h2>
      <p class="muted small">${esc(name)} ${esc(label)} · logged as ${clock(cur)}</p>
      <input id="time-input" class="time-input" value="${clock(cur)}" inputmode="decimal" autocomplete="off" aria-label="Set time, minutes and seconds">
      <p class="muted small">Type 45 for 0:45, or 130 for 1:30.</p>
      <p id="time-err" class="err-text" role="alert"></p>
      <button class="btn primary wide" data-action="time-save">Save</button>
      ${usual ? `<button class="btn wide" data-action="time-save" data-sec="${usual}">Use Your Usual ${clock(usual)}</button>` : ''}
      <button class="btn wide" data-action="modal-close">Cancel</button>
      <p class="muted small">Longer means you tapped Start late: the set starts earlier and the rest before it shrinks. Shorter means you tapped End late: the set ends earlier and the rest after it grows.</p>
    </div></div>`;
  }
  function openTimeModal(m) {
    S.modal = Object.assign({ type: 'time' }, m);
    render();
    const el = $('#time-input');
    if (el) {
      el.focus();
      el.select();
    }
  }

  function rvReadGroup(g) {
    const def = exDef(g.name);
    let h = `<section class="panel"><h2>${esc(g.name)}</h2>${g.variation ? `<div class="muted small rv-var">${esc(g.variation)}</div>` : ''}`;
    g.rows.forEach((r) => {
      const w = weightLabel({ kg: num(r.kg), variation: r.Variation || '' }, def);
      const reps = num(r.Reps);
      const p = num(r.Partials);
      const txt = `${w ? w + ' × ' : ''}${reps == null ? '–' : reps}${p ? ` +${p}p` : ''}`;
      const dur = isDropRow(r) ? null : rvDur(r);
      const meta = [dur != null && toSec(r.End) != null ? `set ${clock(dur)}` : '', !isDropRow(r) && num(r['Rest (s)']) ? `rest ${clock(num(r['Rest (s)']))}` : '']
        .filter(Boolean)
        .join(' · ');
      const label = isDropRow(r) ? '<span class="drop-mark">↳</span>' : `<span class="set-no">${esc(rvLabel(r))}</span>`;
      h += `<div class="rv-row${r.Type === 'Warm-up' ? ' warm' : ''}">${label}<span>${esc(txt)}</span><span class="muted small">${meta}</span></div>`;
    });
    return h + '</section>';
  }

  function rvEditGroup(g) {
    const def = exDef(g.name);
    const parts = S.settings.partials;
    const grid = `rv-grid${parts ? ' p' : ''}`;
    let h = `<section class="panel"><h2>${esc(g.name)}</h2>`;
    if (!def.bodyweight && hasOptions(def)) {
      // Picked the wrong grip or setup? Change it for the whole exercise here.
      const cur = (g.variation || '').split(' · ');
      h += `<div class="rv-choices">${groupsOf(def)
        .map((grp, n) => {
          const known = !cur[n] || grp.choices.some((c) => c.name === cur[n]);
          return `<label class="rv-choice"><span>${esc(grp.label)}</span><select data-rvvar="${esc(g.key)}" data-n="${n}">${
            known ? '' : `<option selected>${esc(cur[n])}</option>`
          }${grp.choices.map((c) => `<option ${c.name === cur[n] ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`;
        })
        .join('')}</div>`;
    } else if (g.variation) {
      h += `<div class="muted small rv-var">${esc(g.variation)}</div>`;
    }
    h += `<div class="set-head ${grid}"><span></span><span>${def.bodyweight ? 'Added Kg' : esc(def.kgLabel || 'Kg')}</span><span>Reps</span>${parts ? '<span>Partials</span>' : ''}<span></span></div>`;
    g.rows.forEach((r, n) => {
      const a = `data-id="${esc(r.ID)}"`;
      const box = (col, mode, aria) =>
        `<input data-rv="${col}" ${a} value="${esc(r[col] == null ? '' : r[col])}" inputmode="${mode}" autocomplete="off" aria-label="${esc(rvLabel(r))} ${aria}">`;
      const weighted = !def.bodyweight || r.Variation === 'Weighted';
      const label = isDropRow(r) ? '<span class="drop-mark">↳</span>' : `<span class="set-no">${esc(rvLabel(r))}</span>`;
      h += `<div class="rv-edit ${grid}${isDraft(r) ? ' draft' : ''}${r.Type === 'Warm-up' ? ' warm' : ''}">${label}${
        weighted ? box('kg', 'decimal', 'kg') : `<span class="rv-mode">${esc(weightLabel({ kg: null, variation: r.Variation || '' }, def))}</span>`
      }${box('Reps', 'numeric', 'reps')}${parts ? box('Partials', 'numeric', 'partial reps') : ''}<button class="drop-x" data-action="rv-del" ${a} aria-label="Delete ${esc(rvLabel(r))}">✕</button></div>`;
      // Under each set: its times (tap to fix) and "+ Drop" for a drop you forgot to log.
      const next = g.rows[n + 1];
      const main = !(next && sameSet(next, r)) && g.rows.find((x) => sameSet(x, r) && !isDropRow(x));
      if (main) {
        const tools = [];
        if (toSec(main.End) != null) {
          const dur = rvDur(main) || 0;
          const rest = num(main['Rest (s)']) != null ? ` · rest ${clock(num(main['Rest (s)']))}` : '';
          const short = main.Type !== 'Warm-up' && dur < SHORT_SET;
          tools.push(`<button class="link${short ? ' hot' : ''}" data-action="rv-time" data-id="${esc(main.ID)}">${short ? 'Forgot Start? Fix Time' : `set ${clock(dur)}${rest} ✎`}</button>`);
        }
        if (!def.bodyweight && main.Type !== 'Warm-up') tools.push(`<button class="link add" data-action="rv-add-drop" data-id="${esc(main.ID)}">+ Drop</button>`);
        if (tools.length) h += `<div class="rv-tools">${tools.join('')}</div>`;
      }
    });
    h += `<button class="btn small rv-add-set" data-action="rv-add-set" data-key="${esc(g.key)}">+ Add Set</button>`;
    return h + '</section>';
  }

  /** Saves edited rows (drafts become real rows), then the workout's totals. */
  function rvSave(rows) {
    const out = rows.slice();
    // A drop on a set you just added also saves that set.
    rows.filter(isDropRow).forEach((d) => {
      const main = S.review.drafts.find((x) => sameSet(x, d) && !isDropRow(x));
      if (main && !out.includes(main)) out.push(main);
    });
    const ids = new Set(out.map((r) => r.ID));
    S.review.drafts = S.review.drafts.filter((r) => !ids.has(r.ID));
    queueRows(out.map((r) => Object.assign({}, r)));
    rvSessionRow(out[0].Session);
    scheduleSync();
  }
  function rvEdit(el) {
    const r = rvRow(el.dataset.id);
    if (!r) return;
    const v = num(el.value);
    rvSave([Object.assign({}, r, { [el.dataset.rv]: v == null ? '' : v })]);
    el.closest('.rv-edit').classList.remove('draft');
  }
  /** Keeps the workout's set count and work and rest minutes in step with its rows. */
  function rvSessionRow(id) {
    const rows = allSets().filter((r) => r.Session === id);
    if (!rows.length) return dropSession(id);
    const base = S.pending.sessions[id] || S.history.sessions.find((r) => r.Session === id);
    if (!base) return;
    const sum = (col) => rows.reduce((a, r) => a + (num(r[col]) || 0), 0);
    const patch = {
      Sets: rows.filter((r) => r.Type !== 'Warm-up' && r.Side !== 'R' && !isDropRow(r)).length,
      'Work (min)': Math.round(sum('Set (s)') / 6) / 10,
      'Rest (min)': Math.round(sum('Rest (s)') / 6) / 10,
    };
    // Start and end follow the first and last set (a fixed time can move them).
    const starts = rows.map((r) => toSec(r.Start)).filter((x) => x != null);
    const ends = rows.map((r) => toSec(r.End)).filter((x) => x != null);
    if (starts.length && ends.length && Math.max(...ends) >= Math.min(...starts)) {
      const a = Math.min(...starts);
      const b = Math.max(...ends);
      const secs = b - a;
      Object.assign(patch, {
        Start: fromSec(a),
        End: fromSec(b),
        Duration: `${Math.floor(secs / 3600)}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`,
        'Length (min)': Math.max(1, Math.round(secs / 60)),
      });
    }
    S.pending.sessions[id] = Object.assign({}, base, patch);
    S.pending.deleteSessions = S.pending.deleteSessions.filter((x) => x !== id);
    savePending();
  }
  /** Deletes a set (with its drops) or one drop, then closes the gap in the numbering. */
  function rvDelete(id) {
    const r = rvRow(id);
    if (!r) return;
    const drafts = new Set(S.review.drafts.map((x) => x.ID));
    const gone = isDropRow(r) ? [r] : rvRows(r.Session).filter((x) => sameSet(x, r));
    const goneIds = new Set(gone.map((x) => x.ID));
    S.review.drafts = S.review.drafts.filter((x) => !goneIds.has(x.ID));
    const real = gone.filter((x) => !drafts.has(x.ID)).map((x) => x.ID);
    if (real.length) unqueueRows(real);
    const fix = [];
    const renumber = (x, patch) => (drafts.has(x.ID) ? Object.assign(x, patch) : fix.push(Object.assign({}, x, patch)));
    if (isDropRow(r)) {
      rvRows(r.Session)
        .filter((x) => sameSet(x, r) && isDropRow(x))
        .sort((a, b) => num(a.Drop) - num(b.Drop))
        .forEach((x, n) => num(x.Drop) !== n + 1 && renumber(x, { Drop: n + 1 }));
    } else if (!rvRows(r.Session).some((x) => rvKey(x) === rvKey(r) && (x.Type || '') === (r.Type || '') && num(x.Set) === num(r.Set))) {
      // That set number is gone on both sides: the sets after it move up one.
      rvRows(r.Session)
        .filter((x) => rvKey(x) === rvKey(r) && (x.Type || '') === (r.Type || '') && num(x.Set) > num(r.Set))
        .forEach((x) => renumber(x, { Set: num(x.Set) - 1 }));
    }
    if (fix.length) queueRows(fix);
    if (real.length || fix.length) {
      rvSessionRow(r.Session);
      scheduleSync();
    }
  }
  function rvFocus(id, col) {
    const el = document.querySelector(`[data-rv="${col}"][data-id="${id}"]`);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.focus();
    }
  }
  function rvAddDrop(id) {
    const main = rvRow(id);
    if (!main) return;
    const n = Math.max(0, ...rvRows(main.Session).filter((x) => sameSet(x, main)).map((x) => num(x.Drop) || 0)) + 1;
    const d = Object.assign({}, main, { Drop: n, kg: '', Reps: '', Partials: '', 'Set (s)': '', 'Rest (s)': '', ID: `${main.ID}-${uid()}` });
    S.review.drafts.push(d);
    render();
    rvFocus(d.ID, 'kg');
  }
  function rvAddSet(key) {
    const g = reviewGroups(S.review.session).find((x) => x.key === key);
    if (!g) return;
    const mains = g.rows.filter((r) => !isDropRow(r) && r.Type !== 'Warm-up');
    const last = mains[mains.length - 1] || g.rows.filter((r) => !isDropRow(r)).pop();
    const n = Math.max(0, ...mains.map((r) => num(r.Set) || 0)) + 1;
    const sides = mains.filter((r) => num(r.Set) === num(last.Set)).map((r) => r.Side || '');
    const blank = { Type: '', Set: n, Drop: '', Reps: '', Partials: '', Start: '', End: '', 'Set (s)': '', 'Rest (s)': '' };
    const added = (sides.length ? sides : ['']).map((side) => Object.assign({}, last, blank, { Side: side, ID: uid() }));
    S.review.drafts.push(...added);
    render();
    rvFocus(added[0].ID, 'Reps');
  }
  /** Picking a different grip or setup in Edit relabels every set of that exercise. */
  function rvVariation(el) {
    const g = reviewGroups(S.review.session).find((x) => x.key === el.dataset.rvvar);
    if (!g) return;
    const def = exDef(g.name);
    const cur = (g.variation || '').split(' · ');
    const parts = groupsOf(def).map((grp, n) => cur[n] || grp.choices[0].name);
    parts[+el.dataset.n] = el.value;
    const v = parts.join(' · ');
    const real = [];
    g.rows.forEach((x) => (isDraft(x) ? (x.Variation = v) : real.push(Object.assign({}, x, { Variation: v }))));
    if (real.length) {
      queueRows(real);
      scheduleSync();
    }
    render();
  }

  /** The pinned panel: total time, plus the running set or the countdown to the next set. */
  function statusHtml() {
    const c = S.current;
    const run = runningSet();
    if (run) {
      const it = c.items[run.k];
      const drops = isDropSet(run.k, run.s) ? run.s.drops.length : 0;
      const how = drops ? `<span class="st-beat">Straight Through ${drops} Drop${drops > 1 ? 's' : ''} · End After The Last · Reps After</span>` : '';
      return `<div id="status" class="status run">
        <div class="st-main"><span class="st-label">${run.s.warm ? 'Warm-Up' : drops ? 'Drop Set' : 'Set'} In Progress · ${esc(it.name)} ${setLabel(run.k, run.i)}</span>
          <b id="st-time" class="st-big"></b>${how}</div>
        <button class="btn solid" data-action="end-running">${drops ? 'End Drop Set' : 'End Set'}</button>
      </div>`;
    }
    if (!c.lastEnd) return '<div id="status" class="status idle"><div class="st-main"><span class="st-label">Ready · Tap Start On Your First Set</span></div></div>';
    if (finishedMovement()) {
      // Walking to the next machine: count up from the last set instead of counting down.
      const next = nextOpenBlock();
      return `<div id="status" class="status transition">
        <div class="st-main"><span class="st-label">Time Since Last Set</span><b id="st-time" class="st-big"></b>
          <span class="st-target">${next ? `Up Next: ${esc(blockNames(next).join(' + '))}` : 'All Exercises Done · Tap Finish'}</span></div>
        ${next ? `<button class="btn" data-action="go-next" data-block="${next.id}">Go</button>` : ''}
      </div>`;
    }
    if (!c.restCountdown) {
      return `<div id="status" class="status">
        <div class="st-main"><span class="st-label">Resting · No Timer</span><b id="st-time" class="st-big"></b></div>
      </div>`;
    }
    return `<div id="status" class="status">
        <div class="st-main"><span id="st-label" class="st-label">Next Set In</span><b id="st-time" class="st-big"></b><span id="st-target" class="st-target"></span>
          <div class="bar"><div id="st-bar"></div></div></div>
        <button class="btn" data-action="rest-add">+30s</button>
      </div>`;
  }

  function workoutView() {
    const c = S.current;
    let done = 0;
    let total = 0;
    forEachSet((k, i, s) => {
      total++;
      if (s.end) done++;
    });
    return `<div class="sticky">
        <div class="topbar">
          <div class="tb-left"><div class="tb-day">${esc(c.day)}</div><div class="tb-sets">${done}/${total} Sets</div></div>
          <div class="tb-total"><span>Total</span><b id="wclock"></b><span class="tb-since">${c.firstStart ? 'Since ' + hm(new Date(c.firstStart)) : 'Not Started'}</span></div>
          <button class="btn primary" data-action="finish">Finish</button>
        </div>
        ${statusHtml()}
      </div>
      ${
        S.reorder
          ? reorderHtml()
          : `<div class="list-tools"><button class="link" data-action="reorder">⇅ Reorder Exercises</button></div>
      ${c.blocks.map(blockHtml).join('')}
      <div class="add-ex">
        <input id="exsearch" type="search" placeholder="Add Any Exercise, Or Create A New One" autocomplete="off" autocorrect="off" enterkeyhint="search" aria-label="Add an exercise">
        <div id="exresults" class="results"></div>
      </div>`
      }
      <p class="syncline center">${syncText()}</p>
      ${S.modal === 'finish' ? finishModal() : ''}`;
  }

  // ---------- Reordering during a workout ----------
  const blockNames = (b) => b.keys.map((k) => S.current.items[k].name);
  function lastWorkedIndex(blocks) {
    let best = -1;
    let at = '';
    blocks.forEach((b, idx) =>
      b.keys.forEach((k) =>
        S.current.items[k].sets.forEach((s) => {
          const t = s.end || s.start || '';
          if (t > at) {
            at = t;
            best = idx;
          }
        })
      )
    );
    return best;
  }
  function afterReorder() {
    const counts = {};
    S.current.blocks.forEach((b) => blockNames(b).forEach((n) => (counts[n] = (counts[n] || 0) + 1)));
    const dup = Object.keys(counts).filter((n) => counts[n] > 1);
    if (dup.length) {
      requeueNames(dup);
      scheduleSync();
    }
    persist();
    render();
  }
  function reorderHtml() {
    const c = S.current;
    const worked = lastWorkedIndex(c.blocks);
    const rows = c.blocks
      .map((b, idx) => {
        let done = 0;
        let total = 0;
        b.keys.forEach((k) =>
          c.items[k].sets.forEach((s) => {
            total++;
            if (s.end) done++;
          })
        );
        const label = blockNames(b).join(' + ');
        const at = `data-idx="${idx}"`;
        const isNext = worked >= 0 ? idx === worked + 1 : idx === 0;
        const nextBtn =
          idx === worked
            ? '<span class="ro-tag">Current</span>'
            : isNext
              ? '<span class="ro-tag">Next</span>'
              : `<button class="btn small" data-action="ro-next" ${at}>Do Next</button>`;
        return `<li class="${total && done === total ? 'finished' : ''}">
          <span class="ro-name">${esc(label)}<span class="muted small">${done}/${total}</span></span>
          ${nextBtn}
          <button class="icon-btn" data-action="ro-move" ${at} data-delta="-1" aria-label="Move ${esc(label)} up">↑</button>
          <button class="icon-btn" data-action="ro-move" ${at} data-delta="1" aria-label="Move ${esc(label)} down">↓</button>
        </li>`;
      })
      .join('');
    const canSave = DAYS.includes(c.day);
    return `<div class="reorder-head"><h2>Reorder Exercises</h2><button class="btn small primary" data-action="reorder-done">Done</button></div>
      <p class="muted small">“Do Next” puts an exercise straight after the one you’re on.</p>
      <ul class="reorder-list">${rows}</ul>
      ${canSave ? `<button class="btn wide" data-action="ro-save">Save This Order For Every ${esc(c.day)} Day</button>` : ''}`;
  }

  /** In a workout a note is only shown, once you open the exercise (edit it in the Exercises tab). */
  function workoutNote(name) {
    const n = noteOf(name);
    return n ? `<div class="note">${ICON.pin}<span>${esc(n)}</span></div>` : '';
  }
  function noteEditor(name) {
    if (S.editingNote === name) {
      return `<div class="note-edit">
        <textarea id="note-input" rows="3" placeholder="Seat 4, back pad 2, handles on the inside">${esc(noteOf(name))}</textarea>
        <div class="row-btns"><button class="btn small primary" data-action="note-save" data-name="${esc(name)}">Save Note</button>
        <button class="btn small ghost" data-action="note-cancel">Cancel</button></div></div>`;
    }
    const n = noteOf(name);
    if (n) return `<button class="note editable" data-action="note-edit" data-name="${esc(name)}">${ICON.pin}<span>${esc(n)}</span><span class="note-edit-tag">Edit</span></button>`;
    return `<button class="note-add" data-action="note-edit" data-name="${esc(name)}">+ Add A Note (Seat, Settings…)</button>`;
  }

  function blockHtml(b) {
    const c = S.current;
    const open = c.open === b.id;
    const sup = b.keys.length > 1;
    let done = 0;
    let total = 0;
    b.keys.forEach((k) =>
      c.items[k].sets.forEach((s) => {
        total++;
        if (s.end) done++;
      })
    );
    const names = b.keys.map((k) => c.items[k].name);
    const runningHere = b.keys.some((k) => c.items[k].sets.some((s) => s.start && !s.end));
    const head = `<button class="card-head" data-action="toggle" data-block="${b.id}" aria-expanded="${open}">
        <span class="card-title">${sup ? '<span class="tag">Superset</span>' : ''}<span>${esc(names.join(' + '))}</span></span>
        <span class="count ${runningHere ? 'live' : total && done === total ? 'ok' : ''}">${runningHere ? 'Live' : `${done}/${total}`}</span>
      </button>`;
    // A closed card is just its name; the note shows once you open the exercise.
    if (!open) return `<section class="card" id="b-${b.id}">${head}</section>`;
    let body = S.settings.partials ? partialToggles(b) : '';
    body += [...new Set(names)].map((n) => (sup && noteOf(n) ? `<div class="sub-name">${esc(n)}</div>` : '') + workoutNote(n)).join('');
    b.keys.forEach((k) => (body += choiceSelects(k, sup)));
    if (S.pairing === b.id) body += pairPickerHtml(b);
    if (sup) {
      if (b.keys.some((k) => warmRows(c.items[k]))) body += '<div class="round-label muted small">Warm-Up</div>';
      b.keys.forEach((k) => c.items[k].sets.forEach((s, i) => s.warm && (body += setRowHtml(k, i, `${setLabel(k, i)} ${c.items[k].name}`))));
      const rounds = Math.max(0, ...b.keys.map((k) => unitsOf(k)));
      for (let r = 0; r < rounds; r++) {
        body += `<div class="round-label muted small">Round ${r + 1}</div>`;
        b.keys.forEach((k) => unitRows(k, r).forEach((i) => (body += setRowHtml(k, i, c.items[k].name))));
      }
    } else {
      const k = b.keys[0];
      body += headRow(k);
      c.items[k].sets.forEach((s, i) => (body += setRowHtml(k, i)));
    }
    const at = `data-block="${b.id}"`;
    const ss = S.settings.supersets
      ? sup
        ? `<button class="btn small ghost" data-action="unlink" ${at}>${ICON.link}Unlink Superset</button>`
        : `<button class="btn small ghost" data-action="pair" ${at}>${ICON.link}Superset With…</button>`
      : '';
    body += `<div class="card-actions">
        <button class="btn small" data-action="add-warm" ${at}>+ Warm-Up</button>
        <button class="btn small" data-action="add-set" ${at}>+ ${sup ? 'Add Round' : 'Add Set'}</button>
        <button class="btn small ghost" data-action="remove-set" ${at}>− Remove Last</button>
        ${ss}
        <button class="btn small ghost danger" data-action="remove-block" ${at}>Remove Exercise</button>
      </div>`;
    return `<section class="card open" id="b-${b.id}">${head}<div class="card-body">${body}</div></section>`;
  }

  function choiceSelects(k, sup) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    return groupsOf(def)
      .map((g) => {
        const cur = it.choices[g.label];
        return `<label class="var-row"><span>${sup ? esc(it.name) + ' ' : ''}${esc(g.label)}</span><select data-choice="${esc(g.label)}" data-k="${k}">${g.choices
          .map((ch) => `<option ${ch.name === cur ? 'selected' : ''}>${esc(ch.name)}</option>`)
          .join('')}<option value="__other">Other…</option></select></label>`;
      })
      .join('');
  }

  const partialsOn = (k) => !!S.settings.partials && !!S.current.items[k].partials;
  function rowType(k) {
    const def = itemDef(k);
    const p = partialsOn(k);
    return def.bodyweight ? (p ? 'bwp' : 'bw') : p ? 'np' : 'normal';
  }
  function headRow(k) {
    const def = itemDef(k);
    const type = rowType(k);
    const part = partialsOn(k) ? '<span>Partial</span>' : '';
    if (!def.bodyweight) return `<div class="set-head ${type}"><span></span><span>${def.kgLabel || 'Kg'}</span><span></span><span>Reps</span>${part}</div>`;
    return `<div class="set-head ${type}"><span></span><span>Type</span><span>Kg / Band</span><span></span><span>Reps</span>${part}</div>`;
  }
  /** The switch at the top of a card that adds a partial reps box to every set of the exercise. */
  function partialToggles(b) {
    const sup = b.keys.length > 1;
    return `<div class="toggles">${b.keys
      .map((k) => {
        const it = S.current.items[k];
        return `<label class="switch"><input type="checkbox" data-partials="${k}" ${it.partials ? 'checked' : ''}><span class="track"></span>Partial Reps${
          sup ? ` · ${esc(it.name)}` : ''
        }</label>`;
      })
      .join('')}</div>`;
  }

  function pairPickerHtml(b) {
    const others = S.current.blocks.filter((o) => o !== b);
    return `<div class="pair-box">
      <div class="small">Superset <b>${esc(blockNames(b).join(' + '))}</b> With:</div>
      <div class="chips">${
        others.length
          ? others.map((o) => `<button class="chip" data-action="pair-with" data-block="${o.id}">${esc(blockNames(o).join(' + '))}</button>`).join('')
          : '<span class="muted small">No other exercises in this workout yet.</span>'
      }</div>
      <button class="link" data-action="pair-cancel">Cancel</button>
    </div>`;
  }

  /** One set row: number, weight, the Start/End button, then reps (only enterable after End). */
  /** What a weight box shows: what you typed, else on the row you're on, the hint. */
  const kgShown = (own, hint, active) => (own !== '' && own != null ? own : active && hint != null ? fmt(hint) : '');

  /** Updates an exercise's weight boxes in place as you type, so hints follow without a re-render. */
  function refreshHints(k) {
    const it = S.current.items[k];
    const act = activeRow(k);
    document.querySelectorAll(`input[data-f="kg"][data-k="${k}"]`).forEach((el) => {
      const i = +el.dataset.i;
      const s = it.sets[i];
      const j = el.dataset.d != null ? +el.dataset.d : null;
      const d = s && j != null ? s.drops[j] : null;
      if (!s || (j != null && !d) || el === document.activeElement) return;
      const ph = d ? dropPlaceholder(k, i, j) : placeholder(k, i);
      el.placeholder = ph.kg == null ? '' : fmt(ph.kg);
      el.value = kgShown(d ? d.kg : s.kg, ph.kg, i === act);
    });
  }

  function setRowHtml(k, i, label) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    const ph = placeholder(k, i);
    const a = `data-k="${k}" data-i="${i}"`;
    const locked = !s.end;
    const input = (f, v, p, mode, aria, extra) =>
      `<input class="${extra || ''}" data-f="${f}" ${a} value="${esc(v)}" placeholder="${p == null ? '' : esc(fmt(p))}" inputmode="${mode}" autocomplete="off" aria-label="${aria}"${
        (f === 'reps' || f === 'partials') && locked ? ' disabled' : ''
      }>`;
    // Hinted weights stay dim, except on the row you're on, where the hint shows as the value.
    const kgVal = kgShown(s.kg, ph.kg, activeRow(k) === i);
    const type = rowType(k);
    const state = (s.end ? ' done' : s.start ? ' running' : '') + (s.warm ? ' warm' : '') + (s.side ? ' side' : '');
    let h = `<div class="set-row ${type}${label ? ' labeled' : ''}${state}">`;
    h += `<span class="set-no">${label ? esc(label) : setLabel(k, i)}</span>`;
    if (def.bodyweight) {
      h += `<select data-f="mode" ${a} aria-label="Set type">${[
        ['Bodyweight', 'BW'],
        ['Weighted', '+Kg'],
        ['Band', 'Band'],
      ]
        .map(([v, t]) => `<option value="${v}" ${s.mode === v ? 'selected' : ''}>${t}</option>`)
        .join('')}</select>`;
      if (s.mode === 'Weighted') h += input('kg', kgVal, ph.kg, 'decimal', 'Added kg');
      else if (s.mode === 'Band') h += `<input data-f="band" ${a} value="${esc(s.band)}" placeholder="Purple" autocomplete="off" autocapitalize="words" aria-label="Band">`;
      else h += '<span class="dash">—</span>';
    } else {
      h += input('kg', kgVal, ph.kg, 'decimal', def.kgLabel ? 'Added kg' : 'kg');
    }
    if (s.end) h += `<button class="sbtn done" data-action="set-btn" ${a} aria-label="Done. Tap twice to undo">${ICON.check}</button>`;
    else if (s.start) h += `<button class="sbtn run" data-action="set-btn" ${a}><span>End</span><span class="rt" id="rt-${s.id}"></span></button>`;
    else h += `<button class="sbtn" data-action="set-btn" ${a}>Start</button>`;
    h += input('reps', s.reps, ph.reps, 'numeric', 'Reps', s.end && !s.warm && num(s.reps) == null ? 'need' : '');
    if (partialsOn(k)) h += input('partials', s.partials, ph.partials, 'numeric', 'Partial reps');
    h += '</div>';
    (s.drops || []).forEach((d, j) => (h += dropRowHtml(k, i, j, label)));
    h += footerHtml(k, i, label);
    return h;
  }

  function dropRowHtml(k, i, j, label) {
    const s = S.current.items[k].sets[i];
    const d = s.drops[j];
    const ph = dropPlaceholder(k, i, j);
    const a = `data-k="${k}" data-i="${i}" data-d="${j}"`;
    // Once the set is done, the keyboard's next button goes reps to reps, skipping the weights.
    const skip = s.end ? ' tabindex="-1"' : '';
    return `<div class="drop-row ${partialsOn(k) ? 'np' : 'normal'}${label ? ' labeled' : ''}${s.end ? ' done' : ''}">
      <span class="drop-mark" aria-hidden="true">↳</span>
      <input data-f="kg" ${a} value="${esc(kgShown(d.kg, ph.kg, activeRow(k) === i))}" placeholder="${ph.kg == null ? '' : esc(fmt(ph.kg))}" inputmode="decimal" autocomplete="off" aria-label="Drop ${j + 1} kg"${skip}>
      <button class="drop-x" data-action="drop-remove" ${a} aria-label="Remove drop ${j + 1}"${skip}>✕</button>
      <input data-f="reps" ${a} value="${esc(d.reps)}" placeholder="${ph.reps == null ? '' : esc(ph.reps)}" inputmode="numeric" autocomplete="off" aria-label="Drop ${j + 1} reps"${s.end ? '' : ' disabled'}>
      ${
        partialsOn(k)
          ? `<input data-f="partials" ${a} value="${esc(d.partials)}" placeholder="${ph.partials == null ? '' : esc(ph.partials)}" inputmode="numeric" autocomplete="off" aria-label="Drop ${j + 1} partial reps"${s.end ? '' : ' disabled'}>`
          : ''
      }
    </div>`;
  }

  /** The line under a set: up/down vs your last like-for-like workout, set and rest times, and "+ Drop". */
  function footerHtml(k, i, label) {
    const it = S.current.items[k];
    const s = it.sets[i];
    const a = `data-k="${k}" data-i="${i}"`;
    let inner = '';
    if (s.end && !s.warm) {
      const m = compareSet(k, i);
      if (m) inner += `<span class="mk ${m.dir > 0 ? 'up' : m.dir < 0 ? 'down' : 'same'}">${m.dir > 0 ? '▲' : m.dir < 0 ? '▼' : '='} ${esc(m.text)}</span>`;
    }
    if (s.end) {
      // Set and rest times; tap to fix them (forgot to tap Start, or End).
      const dur = setSecs(s);
      const rest = s.rest != null ? ` · rest ${clock(s.rest)}` : '';
      if (!s.warm && dur < SHORT_SET) inner += `<button class="drop-add" data-action="time-edit" ${a}>Forgot Start? Fix Time</button>`;
      else inner += `<button class="link time-link" data-action="time-edit" ${a}>set ${clock(dur)}${rest} ✎</button>`;
    }
    if (s.warm) {
      if (!s.start && !s.end) inner += `<button class="link tiny-x" data-action="warm-remove" ${a}>✕ Remove Warm-Up</button>`;
    } else if (canDrop(k)) {
      if (isDropSet(k, s)) {
        // A drop set is one continuous set: one Start and End around every drop, then all the reps.
        if (s.start && !s.end) inner += '<span class="muted">Go straight through every drop, then tap End</span>';
        else if (!s.start && activeRow(k) === i) inner += '<span class="muted">One continuous set · Start, go through every drop, End, then enter the reps</span>';
        else if (s.end && s.drops.some((d) => d.reps === '')) inner += '<span class="muted">Enter the reps for each drop you did</span>';
      }
      if ((it.cfg.style || 'normal') === 'normal' && !s.end && activeRow(k) === i) {
        // On the set you're about to do (or doing), so you can set the drop weight before you start.
        inner += `<button class="drop-add" data-action="drop-add" ${a}>${s.drops.length ? '+ Another Drop' : '+ Drop Set'}</button>`;
      }
    }
    if (it.cfg.style === 'ultimate' && !s.warm && !s.drops.length && !s.end) inner += '<span class="muted">Drops fill in once you enter the weight</span>';
    return `<div class="markers${label ? ' indent' : ''}" id="ft-${s.id}"${inner ? '' : ' hidden'}>${inner}</div>`;
  }

  // ---------- Workout summary numbers ----------
  // Estimated calories by the MET method: 1 MET is about 1 kcal per kg of body weight per hour.
  // Hard sets count as vigorous lifting (about 6 METs); the time between sets as light activity (about 2).
  const MET_WORK = 6;
  const MET_REST = 2;
  function estCalories(workSec, totalSec) {
    const kg = Number(S.settings.bodyKg);
    if (!(kg > 0) || !(totalSec > 0)) return null;
    return Math.round((kg * (MET_WORK * workSec + MET_REST * Math.max(0, totalSec - workSec))) / 3600);
  }
  /** Summary tiles: total, working and rest minutes, working sets and estimated calories (then any extras). */
  function statTiles({ total, work, rest, sets }, extra, cls) {
    const kcal = estCalories(work, total);
    const min = (sec) => Math.round(sec / 60);
    const tiles = [
      [min(total), 'Total Minutes'],
      [min(work), 'Working Minutes'],
      [min(rest), 'Rest Minutes'],
      [sets, 'Working Sets'],
      [kcal != null ? kcal.toLocaleString() : '–', 'Est. Calories'],
    ].concat(extra || []);
    return `<div class="stats${tiles.length === 5 ? ' s5' : ''}${cls ? ' ' + cls : ''}">${tiles
      .map(([v, label, hot]) => `<div class="${hot ? 'hot' : ''}"><b>${v}</b><span>${label}</span></div>`)
      .join('')}</div>${kcal == null ? '<p class="muted small">Add your body weight in Settings to see estimated calories.</p>' : ''}`;
  }

  // ---------- Checking a workout for logging slips ----------
  const median = (xs) => {
    const v = xs.slice().sort((a, b) => a - b);
    const m = Math.floor(v.length / 2);
    return v.length ? Math.round(v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2) : null;
  };
  /**
   * Looks over a workout's finished sets for likely slips. Timing slips get a fix:
   * - a set of a few seconds (Start tapped late) or one far longer than your others (End tapped late)
   *   is set to the middle of your other sets of that exercise in the workout, else your usual time;
   *   a late Start never takes more than the rest before it.
   * A working set with no reps, or a weight or rep count far off your other sets, is only pointed out.
   * Each set: { id, name, group, label, warm, dur, rest, reps, kg, bw, apply(sec) }.
   */
  function workoutIssues(sets) {
    const issues = [];
    sets.forEach((x) => {
      const peers = sets.filter((y) => y !== x && y.group === x.group);
      const normal = peers.map((y) => y.dur).filter((d) => d >= SHORT_SET);
      const typical = normal.length ? median(normal) : x.warm ? null : usualSetTime(x.name);
      if (x.dur < SHORT_SET) {
        const est = typical && (x.rest != null ? Math.min(typical, x.dur + x.rest) : typical);
        if (est >= SHORT_SET) {
          const rest = x.rest != null ? `, and its rest from ${clock(x.rest)} to ${clock(x.rest - (est - x.dur))}` : '';
          issues.push({ key: `${x.id}:short`, text: `${x.label}: set time ${clock(x.dur)}, so Start was probably tapped late. Change the set to ${clock(est)}${rest}.`, fix: () => x.apply(typical) });
        } else if (!x.warm) {
          const why = typical ? 'there was no rest before it to take the time from' : "there's nothing to estimate it from";
          issues.push({ key: `${x.id}:short`, text: `${x.label}: set time ${clock(x.dur)}, so Start was probably tapped late, but ${why}. Tap its time to fix it by hand.` });
        }
      } else if (normal.length >= 2 && x.dur > Math.max(2.5 * typical, typical + 120)) {
        issues.push({ key: `${x.id}:long`, text: `${x.label}: set time ${clock(x.dur)}, far longer than your others (${clock(typical)}), so End was probably tapped late. Change it to ${clock(typical)}.`, fix: () => x.apply(typical) });
      }
      if (x.warm) return;
      if (x.reps == null) issues.push({ key: `${x.id}:reps`, text: `${x.label} has no reps.` });
      const work = peers.filter((y) => !y.warm);
      const kgs = work.filter((y) => y.kg != null && !y.bw).map((y) => y.kg);
      const mk = median(kgs);
      if (!x.bw && x.kg != null && kgs.length >= 2 && mk && (x.kg >= mk * 2.5 || x.kg <= mk / 2.5)) {
        issues.push({ key: `${x.id}:kg`, text: `${x.label}: ${fmt(x.kg)} kg is far from your other sets (about ${fmt(mk)} kg). A typo?` });
      }
      const reps = work.filter((y) => y.reps != null).map((y) => y.reps);
      const mr = median(reps);
      if (x.reps != null && reps.length >= 2 && mr && x.reps >= 25 && x.reps >= mr * 3) {
        issues.push({ key: `${x.id}:many`, text: `${x.label}: ${x.reps} reps, against about ${mr} on your other sets. A typo?` });
      }
    });
    return issues;
  }
  /** The open workout's finished sets, for the check. */
  function liveCheckSets() {
    const out = [];
    forEachSet((k, i, s) => {
      if (!s.end) return;
      const it = S.current.items[k];
      const def = exDef(it.name);
      out.push({
        id: s.id,
        name: it.name,
        group: (def.bodyweight ? it.name : `${it.name}|${variationOf(k, s)}`) + (s.warm ? '|W' : ''),
        label: `${it.name} ${setLabel(k, i)}`,
        warm: s.warm,
        dur: setSecs(s),
        rest: s.rest,
        reps: num(s.reps),
        kg: num(s.kg),
        bw: def.bodyweight && s.mode !== 'Weighted',
        apply: (sec) => {
          const v = Math.min(sec, s.rest != null && sec > setSecs(s) ? setSecs(s) + s.rest : Infinity);
          if (v >= SHORT_SET) fixSetTime(k, i, v);
        },
      });
    });
    return out;
  }
  /** A past workout's sets (those with times), for the check. */
  function rvCheckSets(id) {
    return allSets()
      .filter((r) => r.Session === id && !isDropRow(r) && toSec(r.End) != null)
      .map((r) => ({
        id: r.ID,
        name: r.Exercise,
        group: rvKey(r) + (r.Type === 'Warm-up' ? '|W' : ''),
        label: `${r.Exercise} ${rvLabel(r)}`,
        warm: r.Type === 'Warm-up',
        dur: rvDur(r) || 0,
        rest: num(r['Rest (s)']),
        reps: num(r.Reps),
        kg: num(r.kg),
        bw: exDef(r.Exercise).bodyweight && r.Variation !== 'Weighted',
        apply: (sec) => {
          const x = rvRow(r.ID);
          if (!x) return;
          const rest = num(x['Rest (s)']);
          const dur = rvDur(x) || 0;
          const v = Math.min(sec, rest != null && sec > dur ? dur + rest : Infinity);
          if (v >= SHORT_SET) rvFixTime(r.ID, v);
        },
      }));
  }
  const currentIssues = () =>
    S.current && S.modal === 'finish' ? workoutIssues(liveCheckSets()) : S.review ? workoutIssues(rvCheckSets(S.review.session)) : [];
  function issuesHtml(issues, where) {
    if (!issues.length) return where === 'finish' ? '<p class="muted small">✓ Checked your sets: nothing looks off.</p>' : '';
    const fixable = issues.filter((x) => x.fix).length;
    const hint = where === 'finish' ? ' Tap Keep Going to fix it.' : ' Tap Edit to fix it.';
    return `<div class="issues"><div class="issues-head">${issues.length === 1 ? '1 thing looks off' : `${issues.length} things look off`}</div>
      ${issues
        .map(
          (x) => `<div class="issue"><span>${esc(x.text)}${x.fix || /by hand/.test(x.text) ? '' : hint}</span>${
            x.fix ? `<button class="btn small" data-action="issue-fix" data-issue="${esc(x.key)}">Fix</button>` : ''
          }</div>`
        )
        .join('')}
      ${fixable > 1 ? `<button class="btn wide" data-action="issue-fix-all">Fix All ${fixable}</button>` : ''}</div>`;
  }

  function finishModal() {
    const st = sessionStats();
    // Up/down only counts sets that had a like-for-like workout to compare with (same fresh/pre-fatigued state).
    let ups = 0;
    let downs = 0;
    forEachSet((k, i, s) => {
      if (!s.end || s.warm) return;
      const m = compareSet(k, i);
      if (m && m.dir > 0) ups++;
      if (m && m.dir < 0) downs++;
    });
    const total = st.first ? Math.max(60, (st.last - st.first) / 1000) : 0;
    const run = runningSet();
    const vs = [ups ? `▲ ${ups} set${ups === 1 ? '' : 's'} up` : '', downs ? `▼ ${downs} down` : ''].filter(Boolean).join(' · ');
    return `<div class="modal-back" data-action="modal-close-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Finish ${esc(S.current.day)}?</h2>
      ${statTiles({ total, work: st.work, rest: st.rest, sets: st.sets })}
      ${vs ? `<p class="small">${vs} on your last like-for-like workout.</p>` : ''}
      ${issuesHtml(workoutIssues(liveCheckSets()), 'finish')}
      ${run ? '<p class="muted small">The set that’s running will be ended now.</p>' : ''}
      ${st.any || run ? '' : '<p class="muted">No sets finished, so nothing will be saved.</p>'}
      <button class="btn primary wide" data-action="save-finish">${st.any || run ? 'Save Workout' : 'Close Workout'}</button>
      <button class="btn wide" data-action="modal-close">Keep Going</button>
      ${st.any ? '<button class="btn ghost danger wide" data-action="discard">Discard Workout</button>' : ''}
    </div></div>`;
  }

  function allExerciseNames() {
    const names = new Set(S.library.exercises.map((e) => e.name));
    allSets().forEach((r) => r.Exercise && names.add(r.Exercise));
    return [...names].sort((a, b) => a.localeCompare(b));
  }

  function searchResults(raw) {
    const q = raw.trim();
    if (!q) return '';
    const words = q.toLowerCase().split(/\s+/);
    const names = allExerciseNames();
    const inWorkout = new Set(S.current ? Object.values(S.current.items).map((it) => it.name) : []);
    const hits = names.filter((n) => words.every((w) => n.toLowerCase().includes(w))).slice(0, 8);
    let h = hits
      .map((n) => `<button class="result" data-action="add-ex" data-name="${esc(n)}">${esc(n)}${inWorkout.has(n) ? ' <span class="muted small">· Add Again</span>' : ''}</button>`)
      .join('');
    if (!names.some((n) => n.toLowerCase() === q.toLowerCase())) {
      h += `<button class="result create" data-action="create-ex" data-name="${esc(tc(q))}">Create New Exercise “${esc(tc(q))}”</button>`;
    }
    return h;
  }

  // ---------- Exercises tab ----------
  function exercisesWithHistory() {
    const latest = {};
    allSets().forEach((r) => {
      const k = `${r.Date} ${r.Time}`;
      if (!latest[r.Exercise] || k > latest[r.Exercise]) latest[r.Exercise] = k;
    });
    return Object.keys(latest).sort((a, b) => latest[b].localeCompare(latest[a]));
  }
  function score(entries, def) {
    const withKg = !def.bodyweight && entries.some((e) => e.kg);
    if (withKg) {
      let best = 0;
      entries.forEach((e) =>
        [e.reps, e.repsR].forEach((r) => {
          if (r == null || !e.kg) return;
          best = Math.max(best, e.kg * (1 + r / 30));
        })
      );
      return { value: Math.round(best * 10) / 10, label: 'Estimated 1-Rep Max (Kg)', hint: 'Worked out from your best set, so it rises when either the weight or the reps go up.' };
    }
    return { value: entries.reduce((a, e) => a + (e.reps || 0) + (e.repsR || 0), 0), label: 'Total Reps Per Session', hint: 'All reps across the session added together.' };
  }
  /** Straight-line fit through the last 8 weeks of points (oldest first): the % change and its start date. */
  function trend(pts) {
    if (pts.length < 2) return null;
    const day = (p) => new Date(p.date).getTime() / 86400000;
    const end = day(pts[pts.length - 1]);
    let use = pts.filter((p) => end - day(p) <= 56);
    if (use.length < 2) use = pts.slice(-2);
    const xs = use.map(day);
    const ys = use.map((p) => p.value);
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const sxx = xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    if (!sxx) return null;
    const slope = xs.reduce((a, x, n) => a + (x - mx) * (ys[n] - my), 0) / sxx;
    const start = my + slope * (xs[0] - mx);
    if (!(start > 0)) return null;
    return { pct: Math.round(((slope * (xs[xs.length - 1] - xs[0])) / start) * 100), since: use[0].date };
  }
  function chartSvg(pts) {
    const W = Math.round(Math.max(280, Math.min(608, window.innerWidth - 64)));
    const H = 190;
    const L = 40;
    const R = 12;
    const T = 12;
    const B = 26;
    const vals = pts.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (min === max) {
      min -= 1;
      max += 1;
    }
    const span = max - min;
    const lo = min - span * 0.12;
    const hi = max + span * 0.12;
    const x = (i) => (pts.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (pts.length - 1));
    const y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    const r1 = (v) => Math.round(v * 10) / 10;
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Progress chart">`;
    [min, (min + max) / 2, max].forEach((t) => {
      s += `<line x1="${L}" x2="${W - R}" y1="${r1(y(t))}" y2="${r1(y(t))}" class="grid"/>`;
      s += `<text x="${L - 6}" y="${r1(y(t) + 4)}" class="axis" text-anchor="end">${fmt(Math.round(t * 10) / 10)}</text>`;
    });
    // One line for fresh workouts, one (dashed) for pre-fatigued ones, on a shared timeline.
    [false, true].forEach((tired) => {
      const idx = pts.map((p, i) => i).filter((i) => !!pts[i].fatigued === tired);
      if (idx.length > 1) s += `<polyline class="line${tired ? ' tired' : ''}" points="${idx.map((i) => `${r1(x(i))},${r1(y(pts[i].value))}`).join(' ')}"/>`;
    });
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      s += `<circle class="dot${p.fatigued ? ' tired' : ''}${last ? ' last' : ''}" cx="${r1(x(i))}" cy="${r1(y(p.value))}" r="${last ? 5 : 3.5}"><title>${esc(niceDate(p.date))}${p.fatigued ? ' (pre-fatigued)' : ''}: ${fmt(p.value)}</title></circle>`;
    });
    s += `<text x="${L}" y="${H - 6}" class="axis">${esc(niceDate(pts[0].date))}</text>`;
    if (pts.length > 1) s += `<text x="${W - R}" y="${H - 6}" class="axis" text-anchor="end">${esc(niceDate(pts[pts.length - 1].date))}</text>`;
    return s + '</svg>';
  }
  function recordsHtml(sessions, def) {
    let heavy = null;
    let best = null;
    let bw = null;
    const byKg = new Map();
    sessions.forEach((s) =>
      s.entries.forEach((e) => {
        const reps = repsOf(e);
        if (!reps) return;
        const v = e.variation || 'Bodyweight';
        if (def.bodyweight && v === 'Bodyweight') {
          if (!bw || reps > bw.reps) bw = { reps, date: s.date };
          return;
        }
        if ((def.bodyweight && v !== 'Weighted') || !e.kg) return;
        if (!heavy || e.kg > heavy.kg || (e.kg === heavy.kg && reps > heavy.reps)) heavy = { kg: e.kg, reps, date: s.date };
        const val = e1rm(e.kg, reps);
        if (!def.bodyweight && (!best || val > best.val)) best = { val, kg: e.kg, reps, date: s.date };
        const cur = byKg.get(e.kg);
        if (!cur || reps > cur.reps) byKg.set(e.kg, { reps, date: s.date });
      })
    );
    const rows = [];
    const plus = def.bodyweight || def.kgLabel ? '+' : '';
    if (heavy) rows.push(['Heaviest', `${plus}${fmt(heavy.kg)} kg × ${heavy.reps}`, heavy.date]);
    if (best) rows.push(['Best Est. 1RM', `${fmt(Math.round(best.val * 10) / 10)} kg (${fmt(best.kg)} × ${best.reps})`, best.date]);
    if (bw) rows.push(['Most Reps (Bodyweight)', `${bw.reps}`, bw.date]);
    const reps = [...byKg.entries()].sort((a, b) => b[0] - a[0]).slice(0, 4);
    if (reps.length > 1) rows.push(['Rep Records', reps.map(([kg, r]) => `${plus}${fmt(kg)}×${r.reps}`).join(' · '), '']);
    if (!rows.length) return '';
    return `<section class="panel"><h2>All-Time Bests</h2><ul class="records">${rows
      .map(([k, v, d]) => `<li><span class="muted">${esc(k)}</span><span><b>${esc(v)}</b>${d ? `<span class="muted small"> · ${esc(niceDate(d))}</span>` : ''}</span></li>`)
      .join('')}</ul></section>`;
  }
  function exercisesView() {
    let h = '<header class="top"><h1>Exercises</h1></header>';
    const recent = exercisesWithHistory();
    const all = allExerciseNames();
    const P = S.page;
    if (!P.name || !all.includes(P.name)) {
      P.name = recent[0] || all[0];
      P.variation = '';
    }
    const def = exDef(P.name);
    const opt = (n) => `<option ${n === P.name ? 'selected' : ''}>${esc(n)}</option>`;
    h += `<select class="big-select" data-page="name" aria-label="Exercise">
      ${recent.length ? `<optgroup label="Recently Trained">${recent.slice(0, 12).map(opt).join('')}</optgroup>` : ''}
      <optgroup label="All Exercises">${all.filter((n) => !recent.slice(0, 12).includes(n)).map(opt).join('')}</optgroup></select>`;
    h += `<section class="panel"><h2>Notes</h2>${noteEditor(P.name)}<p class="muted small">Notes show on the exercise during workouts.</p></section>`;
    const vs = [...new Set(historyFor(P.name, '').flatMap((s) => s.entries.map((e) => e.variation)).filter(Boolean))];
    if (!def.bodyweight && vs.length > 1) {
      if (!vs.includes(P.variation)) P.variation = '';
      h += `<div class="chips">${['', ...vs]
        .map((v) => `<button class="chip ${v === P.variation ? 'on' : ''}" data-action="pv" data-v="${esc(v)}">${v ? esc(v) : 'All'}</button>`)
        .join('')}</div>`;
    } else {
      P.variation = '';
    }
    const sessions = historyFor(P.name, P.variation);
    if (!sessions.length) return h + '<section class="panel"><p class="muted">No sets logged for this yet.</p></section>';
    const pts = sessions.map((s) => Object.assign({ date: s.date, fatigued: s.fatigued === true }, score(s.entries, def))).reverse();
    // Progress is read per state: your fresh workouts against each other, pre-fatigued against pre-fatigued.
    const line = (tired) => {
      const own = pts.filter((p) => p.fatigued === tired);
      if (!own.length) return '';
      const t = trend(own);
      const name = tired ? 'Pre-fatigued' : 'Fresh';
      if (!t) return `<span><b>${name}</b> ${own.length} workout${own.length === 1 ? '' : 's'} so far</span>`;
      return `<span><b>${name}</b> <span class="mk ${t.pct > 0 ? 'up' : t.pct < 0 ? 'down' : 'same'}">${t.pct > 0 ? '+' : ''}${t.pct}%</span> since ${esc(niceDate(t.since))}</span>`;
    };
    const both = pts.some((p) => p.fatigued) && pts.some((p) => !p.fatigued);
    h += `<section class="panel"><div class="chart-title">${esc(pts[0].label)}</div>
      <div class="trend">${line(false)}${line(true)}</div>
      ${chartSvg(pts)}
      ${both ? '<div class="legend"><span><i class="key"></i>Fresh</span><span><i class="key tired"></i>Pre-fatigued (after 2+ sets for the same muscles)</span></div>' : ''}
      <p class="muted small">${esc(pts[0].hint)} The trend is the straight-line fit through your last 8 weeks.</p></section>`;
    h += recordsHtml(sessions, def);
    h += `<h2>History</h2><ul class="list">${sessions
      .map((s, i) => {
        // Up/down against the previous workout in the same state.
        const prev = sessions.slice(i + 1).find((o) => o.fatigued === s.fatigued);
        const d = prev ? score(s.entries, def).value - score(prev.entries, def).value : null;
        const mk = d == null ? '' : `<span class="mk ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}">${d > 0 ? '▲' : d < 0 ? '▼' : '='}</span>`;
        const v = !def.bodyweight && !P.variation && s.entries[0] && s.entries[0].variation ? ` · ${esc(s.entries[0].variation)}` : '';
        const st = stateLabel(s.fatigued);
        const ar = avgRest(s.entries);
        return `<li><div class="li-main"><span>${esc(niceDate(s.date))}${v}${st ? ` <span class="state${s.fatigued ? ' tired' : ''}">${st}</span>` : ''}</span>${mk}</div>
          <div class="muted small">${esc(summary(s.entries, def))}${ar ? ` · rest ~${clock(ar)}` : ''}</div></li>`;
      })
      .join('')}</ul>`;
    return h;
  }

  // ---------- Settings and Workout Setup ----------
  const restLabel = (v) => (v === 0 ? 'No Rest' : v ? clock(v) : `Default (${clock(S.settings.restSec)})`);
  function setupSummary(it) {
    const bits = [`${it.sets} ${it.names.length > 1 ? 'Rounds' : 'Sets'}`, it.rest === 0 ? 'No Rest' : clock(it.rest || S.settings.restSec)];
    if (it.warmups) bits.push(`${it.warmups} Warm-Up${it.warmups > 1 ? 's' : ''}`);
    if (it.style && it.style !== 'normal') bits.push((STYLES.find((s) => s[0] === it.style) || [])[1]);
    it.names.forEach((n) => {
      const ch = it.choices && it.choices[n];
      if (ch) bits.push(Object.values(ch).join(' · '));
    });
    return bits.join(' · ');
  }
  function setupEditor(d, idx) {
    const it = S.library.days[d][idx];
    const at = `data-day="${d}" data-idx="${idx}"`;
    const sel = (field, opts, cur) =>
      `<select data-setup="${field}" ${at}>${opts.map(([v, t]) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${t}</option>`).join('')}</select>`;
    const restOpts = [['', restLabel(null)], [0, 'No Rest']].concat([30, 45, 60, 90, 120, 150, 180, 240, 300].map((v) => [v, clock(v)]));
    const stepper = (field, val, unit) =>
      `<span class="stepper"><button class="icon-btn" data-action="setup-step" data-field="${field}" data-delta="-1" ${at} aria-label="Fewer ${unit}">−</button><b>${val || 0}</b><button class="icon-btn" data-action="setup-step" data-field="${field}" data-delta="1" ${at} aria-label="More ${unit}">+</button></span>`;
    let h = '<div class="setup-edit">';
    h += `<div class="setup-row"><span>${it.names.length > 1 ? 'Rounds' : 'Sets'}</span>${stepper('sets', it.sets, 'sets')}</div>`;
    h += `<div class="setup-row"><span>Warm-Up Sets</span>${stepper('warmups', it.warmups, 'warm-up sets')}</div>`;
    h += `<label class="setup-row"><span>Rest After Set</span>${sel('rest', restOpts, it.rest == null ? '' : it.rest)}</label>`;
    if (it.names.length > 1) {
      h += `<label class="setup-row"><span>Rest Between Exercises</span>${sel('restBetween', [[0, 'No Timer']].concat([15, 30, 45, 60, 90, 120].map((v) => [v, clock(v)])), it.restBetween || 0)}</label>`;
    }
    const partialDefault = it.partials != null ? it.partials : it.names.some((n) => exDef(n).partials);
    if (S.settings.partials) {
      h += `<label class="setup-row"><span>Partial Reps Box On</span><input type="checkbox" data-setup="partials" ${at} ${partialDefault ? 'checked' : ''}></label>`;
    }
    const anyWeighted = it.names.some((n) => !exDef(n).bodyweight);
    if (anyWeighted) {
      h += `<label class="setup-row"><span>Set Style</span>${sel('style', STYLES, STYLES.some((x) => x[0] === it.style) ? it.style : 'normal')}</label>`;
      if (it.style === 'ultimate') {
        h += `<label class="setup-row"><span>Drop By (Kg)</span>${sel('step', [[1, '1'], [1.25, '1.25'], [2.5, '2.5'], [5, '5']], it.step || 2.5)}</label>`;
        h += '<p class="muted small">Every set drops all the way to 2.5 kg. Remove the drops you don’t get to.</p>';
      }
    }
    it.names.forEach((n) => {
      const def = exDef(n);
      groupsOf(def).forEach((g) => {
        const cur = (it.choices && it.choices[n] && it.choices[n][g.label]) || g.choices[0].name;
        h += `<label class="setup-row"><span>${it.names.length > 1 ? esc(n) + ' ' : ''}${esc(g.label)}</span><select data-setup-choice data-name="${esc(n)}" data-label="${esc(g.label)}" ${at}>${g.choices
          .map((ch) => `<option ${ch.name === cur ? 'selected' : ''}>${esc(ch.name)}</option>`)
          .join('')}</select></label>`;
      });
    });
    if (it.names.some((n) => exDef(n).bodyweight)) {
      const modes = it.modes || [];
      const short = { Bodyweight: 'BW', Band: 'Band', Weighted: '+Kg' };
      h += `<div class="setup-row"><span>Set Types (Tap To Change)</span></div><div class="chips">${Array.from({ length: it.sets }, (_, u) => {
        const m = modes[u] || 'Bodyweight';
        return `<button class="chip ${m !== 'Bodyweight' ? 'on' : ''}" data-action="setup-mode" data-u="${u}" ${at}>${u + 1}: ${short[m]}</button>`;
      }).join('')}</div>`;
      h += `<label class="setup-row"><span>Band Colour</span><input data-setup="band" ${at} value="${esc(it.band || 'Purple')}" autocapitalize="words"></label>`;
    }
    const link =
      it.names.length > 1
        ? S.settings.supersets
          ? `<button class="btn small ghost" data-action="lib-link" ${at}>${ICON.link}Unlink Superset</button>`
          : ''
        : S.settings.supersets && idx < S.library.days[d].length - 1
          ? `<button class="btn small ghost" data-action="lib-link" ${at}>${ICON.link}Superset With Next</button>`
          : '';
    h += `<div class="row-btns">
      <button class="btn small" data-action="lib-move" ${at} data-delta="-1">↑ Move Up</button>
      <button class="btn small" data-action="lib-move" ${at} data-delta="1">↓ Move Down</button>
      ${link}
      <button class="btn small ghost danger" data-action="lib-remove" ${at}>Remove</button>
    </div></div>`;
    return h;
  }
  function settingsView() {
    const sounds = SOUNDS.map(
      ([v, t]) => `<div class="sound-row"><label class="check"><input type="radio" name="sound" data-setting-radio="sound" value="${v}" ${S.settings.sound === v ? 'checked' : ''}> ${t}</label>
        ${v === 'off' ? '' : `<button class="btn small" data-action="play" data-sound="${v}">Test</button>`}</div>`
    ).join('');
    const days = DAYS.map((d) => {
      const list = S.library.days[d];
      const total = list.reduce((a, it) => a + it.sets * it.names.length, 0);
      const items = list
        .map((it, i) => {
          const key = `${d}|${i}`;
          const open = S.setupOpen === key;
          return `<li class="setup-item${open ? ' open' : ''}">
            <button class="setup-head" data-action="setup-toggle" data-key="${key}" aria-expanded="${open}">
              <span class="setup-name">${it.names.length > 1 ? '<span class="tag">Superset</span> ' : ''}${esc(it.names.join(' + '))}</span>
              <span class="muted small">${esc(setupSummary(it))}</span>
            </button>
            ${open ? setupEditor(d, i) : ''}
          </li>`;
        })
        .join('');
      return `<h3>${d} · ${total} Sets</h3><ul class="setup-list">${items}</ul>
        <select data-addday="${d}" aria-label="Add an exercise to ${d}"><option value="">Add Exercise To ${d}…</option>${allExerciseNames()
          .map((n) => `<option>${esc(n)}</option>`)
          .join('')}</select>`;
    }).join('');
    return `<header class="top"><h1>Settings</h1></header>
      <section class="panel">
        <h2>Your Sheet</h2>
        <div class="syncline">${syncText()}</div>
        <div class="row-btns">
          <button class="btn small" data-action="sync-now">Sync Now</button>
          <a class="btn small ghost" href="${esc(CFG.sheetUrl)}" target="_blank" rel="noopener">Open Training Log</a>
          <button class="btn small ghost" data-action="forget-pass">Change Passphrase</button>
        </div>
      </section>
      <section class="panel">
        <h2>Timer And Sound</h2>
        <p class="muted small">Rest times are set for each exercise in Workout Setup below.</p>
        <h3>Rest Over Sound</h3>
        ${sounds}
        <p class="muted small">The sound is set to briefly lower your music while it plays. Test it with music on: if your music stops instead, tell me and I'll change how it plays. Your phone can't make the sound while it's locked, so the screen stays on during workouts.</p>
        <label class="check"><input type="checkbox" data-setting="keepAwake" ${S.settings.keepAwake ? 'checked' : ''}> Keep The Screen On During A Workout</label>
      </section>
      <section class="panel">
        <h2>Options</h2>
        <label class="check"><input type="checkbox" data-setting="supersets" ${S.settings.supersets ? 'checked' : ''}> Supersets</label>
        <p class="muted small">When on, each exercise gets a “Superset With…” button, and Workout Setup can link exercises. Pull-Up + Chin-Up stays a superset either way.</p>
        <label class="check"><input type="checkbox" data-setting="partials" ${S.settings.partials ? 'checked' : ''}> Partial Reps</label>
        <p class="muted small">When on, each exercise card has a Partial Reps switch, and Workout Setup can turn it on by default. When off, partial reps are hidden everywhere.</p>
        <label class="setup-row"><span>Body Weight (Kg)</span><input data-setting="bodyKg" value="${Number(S.settings.bodyKg) > 0 ? esc(fmt(S.settings.bodyKg)) : ''}" inputmode="decimal" autocomplete="off" placeholder="e.g. 75" aria-label="Body weight in kg"></label>
        <p class="muted small">Used for the estimated calories in workout summaries: about 6 METs while lifting and 2 between sets (1 MET is roughly 1 kcal per kg per hour). It's a rough guide, not a measurement. Leave blank to hide it.</p>
      </section>
      <section class="panel">
        <h2>Workout Setup</h2>
        <p class="muted small">Tap an exercise to set its sets, warm-ups, rest, set style and default types. Changes stay on this device.</p>
        ${days}
      </section>
      <section class="panel">
        <h2>New Exercise</h2>
        <label class="field">Name<input id="new-name" placeholder="Cable Fly" autocomplete="off" autocapitalize="words"></label>
        <label class="check"><input type="checkbox" id="new-onearm"> One Side At A Time</label>
        <label class="check"><input type="checkbox" id="new-bw"> Bodyweight (BW, +Kg Or Band)</label>
        <label class="field">Types Or Attachments (Optional, Separated By Commas)<input id="new-var" placeholder="Rope, Straight Bar" autocomplete="off" autocapitalize="words"></label>
        <label class="field">Add To Day<select id="new-day"><option value="">No Day</option>${DAYS.map((d) => `<option>${d}</option>`).join('')}</select></label>
        <p id="new-err" class="err-text" role="alert"></p>
        <button class="btn primary" data-action="lib-new">Add Exercise</button>
      </section>
      <p class="muted small center">Training Tracker ${VERSION}</p>`;
  }

  // ---------- Events ----------
  let toastTimer = null;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
  }
  function armed(el, label) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1';
    const old = el.innerHTML;
    el.textContent = label;
    el.classList.add('armed');
    setTimeout(() => {
      if (el.isConnected) {
        delete el.dataset.armed;
        el.innerHTML = old;
        el.classList.remove('armed');
      }
    }, 3000);
    return false;
  }
  const blockById = (id) => S.current && S.current.blocks.find((b) => b.id === id);
  const setupItem = (el) => S.library.days[el.dataset.day][+el.dataset.idx];

  async function connect(btn) {
    const pass = ($('#pass').value || '').trim();
    const err = $('#connect-err');
    if (pass.length < 8) {
      err.textContent = 'Your passphrase is at least 8 characters.';
      return;
    }
    btn.disabled = true;
    btn.textContent = 'Checking…';
    try {
      await api('ping', {}, pass);
      S.settings.pass = pass;
      saveSettings();
      S.sync = 'idle';
      render();
      toast('Connected To Your Sheet');
      refreshHistory(true);
    } catch (e) {
      err.textContent =
        e.code === 'wrong_passphrase' ? "That passphrase doesn't match the one in your sheet. Try again." : "Couldn't reach your sheet. Check your connection and try again.";
      btn.disabled = false;
      btn.textContent = 'Connect';
    }
  }

  /** Switching between double and single (one side at a time) rebuilds unstarted sets. */
  function changeChoice(k, label, value) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const before = oneArm(k);
    const next = Object.assign({}, it.choices, { [label]: value });
    if (oneArmFor(def, next) !== before) {
      if (it.sets.some((s) => s.start || s.end)) {
        toast('Undo Or Finish This Exercise’s Sets Before Switching Sides');
        render();
        return;
      }
      const units = unitsOf(k);
      const warm = Math.ceil(warmRows(it) / sidesOf(k).length);
      it.choices = next;
      buildSets(k, units, warm);
    } else {
      const doneIdx = it.sets.map((s, i) => (s.end ? i : -1)).filter((i) => i >= 0);
      it.choices = next;
      doneIdx.forEach((i) => syncSetRows(k, i));
    }
    persist();
    invalidate();
    render();
    scheduleSync();
  }

  const ACTIONS = {
    tab(el) {
      // Tapping Workout again from a past workout goes back to the start page.
      if (el.dataset.tab === 'workout' && S.tab === 'workout') S.review = null;
      S.tab = el.dataset.tab;
      S.editingNote = null;
      S.reorder = false;
      S.pairing = null;
      render();
      window.scrollTo(0, 0);
    },
    start(el) {
      startWorkout(el.dataset.day);
    },
    'recent-all'() {
      S.recentAll = !S.recentAll;
      render();
    },
    'rv-open'(el) {
      S.review = { session: el.dataset.session, edit: false, drafts: [] };
      render();
      window.scrollTo(0, 0);
    },
    'rv-close'() {
      S.review = null;
      render();
      window.scrollTo(0, 0);
    },
    'rv-edit'() {
      S.review.edit = !S.review.edit;
      S.review.drafts = [];
      render();
    },
    'rv-del'(el) {
      if (!armed(el, 'Del?')) return;
      rvDelete(el.dataset.id);
      render();
    },
    'rv-add-drop'(el) {
      rvAddDrop(el.dataset.id);
    },
    'rv-time'(el) {
      openTimeModal({ id: el.dataset.id });
    },
    'issue-fix'(el) {
      const x = currentIssues().find((i) => i.key === el.dataset.issue);
      if (x && x.fix) {
        x.fix();
        toast('Fixed');
      }
      render();
    },
    'issue-fix-all'() {
      const fixes = currentIssues().filter((x) => x.fix);
      fixes.forEach((x) => x.fix());
      toast(`Fixed ${fixes.length}`);
      render();
    },
    'time-edit'(el) {
      openTimeModal({ k: el.dataset.k, i: +el.dataset.i });
    },
    'time-save'(el) {
      const sec = el.dataset.sec ? +el.dataset.sec : parseDur($('#time-input').value);
      if (sec == null || sec < 1 || sec > 3600) {
        $('#time-err').textContent = 'Enter a time up to 60 minutes, like 45 or 1:30.';
        return;
      }
      const M = S.modal;
      S.modal = null;
      if (M.id) rvFixTime(M.id, sec);
      else fixSetTime(M.k, M.i, sec);
      toast('Set Time Fixed');
      render();
    },
    'rv-add-set'(el) {
      rvAddSet(el.dataset.key);
    },
    'rv-delete-all'(el) {
      if (!armed(el, 'Tap Again To Delete Every Set In This Workout')) return;
      const id = S.review.session;
      unqueueRows(allSets().filter((r) => r.Session === id).map((r) => r.ID));
      dropSession(id);
      S.review = null;
      toast('Workout Deleted');
      render();
      scheduleSync();
      window.scrollTo(0, 0);
    },
    toggle(el) {
      const c = S.current;
      c.open = c.open === el.dataset.block ? null : el.dataset.block;
      persist();
      render();
      const card = document.getElementById('b-' + el.dataset.block);
      if (card && c.open) {
        const top = card.getBoundingClientRect().top;
        const header = document.querySelector('.sticky');
        const offset = header ? header.getBoundingClientRect().height : 0;
        if (top < offset) window.scrollBy(0, top - offset - 8);
      }
    },
    'set-btn'(el) {
      const k = el.dataset.k;
      const i = +el.dataset.i;
      const s = S.current.items[k].sets[i];
      if (s.end) {
        if (armed(el, 'Undo?')) undoSet(k, i);
      } else if (s.start) endSet(k, i);
      else startSet(k, i);
    },
    'end-running'() {
      const run = runningSet();
      if (run) endSet(run.k, run.i);
    },
    'add-warm'(el) {
      const b = blockById(el.dataset.block);
      b.keys.forEach((k) => {
        const it = S.current.items[k];
        const at = warmRows(it);
        sidesOf(k).forEach((side, n) => it.sets.splice(at + n, 0, newSet(k, { warm: true, side })));
      });
      S.current.open = b.id;
      persist();
      render();
    },
    'warm-remove'(el) {
      const k = el.dataset.k;
      const it = S.current.items[k];
      const i = +el.dataset.i;
      const size = sidesOf(k).length;
      const u = unitIndex(k, i);
      const idxs = it.sets.map((s, j) => (s.warm && Math.floor(countBefore(k, j, true) / size) === u ? j : -1)).filter((j) => j >= 0);
      idxs.reverse().forEach((j) => {
        const [s] = it.sets.splice(j, 1);
        if (s.end) unqueueRows(rowIds(k, s));
      });
      requeueNames([it.name]);
      queueSession();
      persist();
      render();
      scheduleSync();
    },
    'add-set'(el) {
      const b = blockById(el.dataset.block);
      const target = Math.max(...b.keys.map((k) => unitsOf(k))) + 1;
      b.keys.forEach((k) => {
        const it = S.current.items[k];
        while (unitsOf(k) < target) {
          const u = unitsOf(k);
          sidesOf(k).forEach((side) => it.sets.push(newSet(k, { side, unit: u })));
        }
        applyStyle(k);
      });
      requeueNames(b.keys.map((k) => S.current.items[k].name));
      persist();
      render();
      scheduleSync();
    },
    'remove-set'(el) {
      const b = blockById(el.dataset.block);
      const max = Math.max(...b.keys.map((k) => unitsOf(k)));
      if (!max) return;
      b.keys.forEach((k) => {
        const it = S.current.items[k];
        if (unitsOf(k) !== max) return;
        unitRows(k, max - 1)
          .reverse()
          .forEach((i) => {
            const [s] = it.sets.splice(i, 1);
            if (s.end) unqueueRows(rowIds(k, s));
          });
        applyStyle(k);
      });
      requeueNames(b.keys.map((k) => S.current.items[k].name));
      queueSession();
      persist();
      render();
      scheduleSync();
    },
    'remove-block'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const hasDone = b.keys.some((k) => c.items[k].sets.some((s) => s.start || s.end));
      if (hasDone && !armed(el, 'Tap Again To Remove')) return;
      const names = blockNames(b);
      b.keys.forEach((k) => {
        c.items[k].sets.forEach((s) => s.end && unqueueRows(rowIds(k, s)));
        delete c.items[k];
      });
      c.blocks = c.blocks.filter((o) => o !== b);
      if (c.open === b.id) c.open = null;
      requeueNames(names);
      queueSession();
      persist();
      render();
      scheduleSync();
    },
    'drop-add'(el) {
      const k = el.dataset.k;
      const i = +el.dataset.i;
      const s = S.current.items[k].sets[i];
      s.drops.push(newDrop());
      persist();
      render();
      const inp = document.querySelector(`.drop-row [data-k="${k}"][data-i="${i}"][data-d="${s.drops.length - 1}"][data-f="kg"]`);
      if (inp) inp.focus();
    },
    'go-next'(el) {
      S.current.open = el.dataset.block;
      persist();
      render();
      const card = document.getElementById('b-' + el.dataset.block);
      if (card) {
        const header = document.querySelector('.sticky');
        const offset = header ? header.getBoundingClientRect().height : 0;
        window.scrollBy(0, card.getBoundingClientRect().top - offset - 8);
      }
    },
    'drop-remove'(el) {
      const k = el.dataset.k;
      const i = +el.dataset.i;
      const s = S.current.items[k].sets[i];
      const [d] = s.drops.splice(+el.dataset.d, 1);
      if (d) unqueueRows([dropBase(s, d)]);
      if (s.end) syncSetRows(k, i);
      persist();
      render();
      scheduleSync();
    },
    pair(el) {
      S.pairing = el.dataset.block;
      render();
    },
    'pair-cancel'() {
      S.pairing = null;
      render();
    },
    'pair-with'(el) {
      const c = S.current;
      const src = blockById(S.pairing);
      const other = blockById(el.dataset.block);
      S.pairing = null;
      if (!src || !other || src === other) return render();
      src.keys = src.keys.concat(other.keys);
      c.blocks = c.blocks.filter((b) => b !== other);
      c.open = src.id;
      toast(`Superset: ${blockNames(src).join(' + ')}`);
      afterReorder();
    },
    unlink(el) {
      const c = S.current;
      const b = blockById(el.dataset.block);
      const idx = c.blocks.indexOf(b);
      c.blocks.splice(idx, 1, ...b.keys.map((k, n) => ({ id: n === 0 ? b.id : uid(), keys: [k] })));
      toast('Superset Split');
      afterReorder();
    },
    reorder() {
      S.reorder = true;
      render();
      window.scrollTo(0, 0);
    },
    'reorder-done'() {
      S.reorder = false;
      render();
      const card = S.current.open && document.getElementById('b-' + S.current.open);
      if (card) card.scrollIntoView({ block: 'center' });
    },
    'ro-move'(el) {
      const blocks = S.current.blocks;
      const i = +el.dataset.idx;
      const j = i + +el.dataset.delta;
      if (j < 0 || j >= blocks.length) return;
      [blocks[i], blocks[j]] = [blocks[j], blocks[i]];
      afterReorder();
    },
    'ro-next'(el) {
      const c = S.current;
      const [b] = c.blocks.splice(+el.dataset.idx, 1);
      c.blocks.splice(lastWorkedIndex(c.blocks) + 1, 0, b);
      c.open = b.id;
      afterReorder();
      toast(`${blockNames(b).join(' + ')} Is Up Next`);
    },
    'ro-save'() {
      const c = S.current;
      const list = S.library.days[c.day];
      const used = new Set();
      const pos = list.map((it, idx) => {
        const key = it.names.join('+');
        const at = c.blocks.findIndex((b, bi) => !used.has(bi) && blockNames(b).join('+') === key);
        if (at >= 0) used.add(at);
        return { it, idx, at: at >= 0 ? at : Infinity };
      });
      pos.sort((a, b) => a.at - b.at || a.idx - b.idx);
      S.library.days[c.day] = pos.map((p) => p.it);
      saveLibrary();
      toast(`Saved As Your Usual ${c.day} Order`);
    },
    'rest-add'() {
      const c = S.current;
      if (!c.lastEnd) return;
      const el = (Date.now() - new Date(c.lastEnd)) / 1000;
      const target = restTarget();
      c.restExtra = (c.restExtra || 0) + (el > target ? Math.ceil(el - target) + 30 : 30);
      c.beepedAt = null;
      persist();
      tickClock();
    },
    finish() {
      S.modal = 'finish';
      render();
    },
    'modal-close'() {
      S.modal = null;
      render();
    },
    'modal-close-back'(el, e) {
      if (e.target === el) ACTIONS['modal-close']();
    },
    'save-finish'() {
      saveFinish();
    },
    discard(el) {
      if (!armed(el, 'Tap Again To Discard All Sets')) return;
      discardWorkout();
    },
    'add-ex'(el) {
      const name = el.dataset.name;
      const b = addBlock([name], defaultCfg(name));
      persist();
      render();
      const card = document.getElementById('b-' + b.id);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    'create-ex'(el) {
      const name = tc(el.dataset.name.trim());
      if (!S.library.exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
        S.library.exercises.push({ name });
        saveLibrary();
        toast(`Created ${name}`);
      }
      ACTIONS['add-ex']({ dataset: { name } });
    },
    'note-edit'(el) {
      S.editingNote = el.dataset.name;
      render();
    },
    'note-cancel'() {
      S.editingNote = null;
      render();
    },
    'note-save'(el) {
      saveNote(el.dataset.name, $('#note-input').value);
    },
    connect(el) {
      connect(el);
    },
    'sync-now'() {
      sync().then(() => refreshHistory(true));
    },
    'forget-pass'(el) {
      if (!armed(el, 'Tap Again To Re-Enter It')) return;
      S.settings.pass = '';
      saveSettings();
      render();
    },
    play(el) {
      unlockAudio();
      playSound(el.dataset.sound);
    },
    pv(el) {
      S.page.variation = el.dataset.v;
      render();
    },
    'setup-toggle'(el) {
      S.setupOpen = S.setupOpen === el.dataset.key ? null : el.dataset.key;
      render();
    },
    'setup-step'(el) {
      const it = setupItem(el);
      const f = el.dataset.field;
      const min = f === 'sets' ? 1 : 0;
      it[f] = Math.max(min, Math.min(f === 'sets' ? 20 : 4, (it[f] || 0) + +el.dataset.delta));
      saveLibrary();
      render();
    },
    'setup-mode'(el) {
      const it = setupItem(el);
      const order = ['Bodyweight', 'Band', 'Weighted'];
      it.modes = Array.from({ length: it.sets }, (_, u) => (it.modes && it.modes[u]) || 'Bodyweight');
      const u = +el.dataset.u;
      it.modes[u] = order[(order.indexOf(it.modes[u]) + 1) % order.length];
      saveLibrary();
      render();
    },
    'lib-move'(el) {
      const list = S.library.days[el.dataset.day];
      const i = +el.dataset.idx;
      const j = i + +el.dataset.delta;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      S.setupOpen = `${el.dataset.day}|${j}`;
      saveLibrary();
      render();
    },
    'lib-remove'(el) {
      if (!armed(el, 'Tap Again To Remove')) return;
      S.library.days[el.dataset.day].splice(+el.dataset.idx, 1);
      S.setupOpen = null;
      saveLibrary();
      render();
    },
    'lib-link'(el) {
      const list = S.library.days[el.dataset.day];
      const i = +el.dataset.idx;
      const it = list[i];
      if (it.names.length > 1) {
        const before = it.before || {};
        list.splice(i, 1, ...it.names.map((n) => Object.assign(clone(it), { names: [n], sets: before[n] || it.sets, before: undefined })));
        toast('Superset Split');
      } else if (list[i + 1]) {
        const next = list[i + 1];
        const before = {};
        [it, next].forEach((x) => x.names.forEach((n) => (before[n] = (x.before && x.before[n]) || x.sets)));
        list.splice(i, 2, Object.assign(clone(it), { names: it.names.concat(next.names), sets: Math.max(it.sets, next.sets), before, choices: Object.assign({}, next.choices, it.choices) }));
        toast(`Superset: ${it.names.concat(next.names).join(' + ')}`);
      }
      S.setupOpen = null;
      saveLibrary();
      render();
    },
    'lib-new'() {
      const name = tc($('#new-name').value.trim());
      const err = $('#new-err');
      if (!name) {
        err.textContent = 'Enter a name.';
        return;
      }
      if (S.library.exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
        err.textContent = 'That exercise already exists.';
        return;
      }
      const ex = { name };
      if ($('#new-onearm').checked) ex.oneArm = true;
      if ($('#new-bw').checked) ex.bodyweight = true;
      const vars = $('#new-var')
        .value.split(',')
        .map((x) => tc(x.trim()))
        .filter(Boolean);
      if (vars.length) ex.options = [{ label: 'Type', choices: vars.map((n) => ({ name: n })) }];
      S.library.exercises.push(ex);
      const day = $('#new-day').value;
      if (day) S.library.days[day].push({ names: [name], sets: 3 });
      saveLibrary();
      toast(`Added ${name}`);
      render();
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const fn = ACTIONS[el.dataset.action];
    if (fn) fn(el, e);
  });

  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el.id === 'exsearch') {
      $('#exresults').innerHTML = searchResults(el.value);
      return;
    }
    if (el.id === 'pass') {
      $('#connect-err').textContent = '';
      return;
    }
    const f = el.dataset.f;
    if (!f || f === 'mode' || !S.current || el.dataset.k == null) return;
    const k = el.dataset.k;
    const it = S.current.items[k];
    const s = it && it.sets[+el.dataset.i];
    if (!s) return;
    if (el.dataset.d != null) {
      const d = s.drops[+el.dataset.d];
      if (!d) return;
      d[f] = el.value;
    } else {
      s[f] = el.value;
    }
    if (el.value) el.classList.remove('need');
    if (f === 'kg') refreshHints(k);
    persist();
    if (s.end) requeueSoon(k, s.id);
  });

  // Tapping a weight that's only the hint selects it, so typing replaces it rather than adding to it.
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (el.dataset.f !== 'kg' || !S.current || el.dataset.k == null || !el.value) return;
    const s = S.current.items[el.dataset.k] && S.current.items[el.dataset.k].sets[+el.dataset.i];
    const own = s && (el.dataset.d != null ? (s.drops[+el.dataset.d] || {}).kg : s.kg);
    if (own === '') setTimeout(() => el === document.activeElement && el.setSelectionRange(0, el.value.length), 0);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (S.review && el.dataset.rv) return rvEdit(el);
    if (S.review && el.dataset.rvvar) return rvVariation(el);
    if (el.dataset.f === 'mode' && S.current) {
      const k = el.dataset.k;
      const i = +el.dataset.i;
      const s = S.current.items[k].sets[i];
      s.mode = el.value;
      if (s.mode === 'Band' && !s.band) s.band = S.current.items[k].cfg.band || 'Purple';
      persist();
      if (s.end) {
        syncSetRows(k, i);
        scheduleSync();
      }
      render();
    } else if (el.dataset.f === 'kg' && el.dataset.d == null && S.current && el.dataset.k) {
      // A new starting weight refreshes the ultimate drop set's ladder.
      const k = el.dataset.k;
      const i = +el.dataset.i;
      if (S.current.items[k].cfg.style === 'ultimate') {
        regenUltimate(k, i);
        regenUpcoming(k);
        persist();
        render();
      }
    } else if (el.dataset.partials && S.current) {
      S.current.items[el.dataset.partials].partials = el.checked;
      persist();
      render();
    } else if (el.dataset.choice && S.current) {
      const k = el.dataset.k;
      const label = el.dataset.choice;
      let v = el.value;
      if (v === '__other') {
        v = tc((window.prompt(`New ${label}`) || '').trim());
        if (!v) return render();
        const g = groupsOf(itemDef(k)).find((x) => x.label === label);
        if (g && !g.choices.some((c) => c.name === v)) {
          g.choices.push({ name: v });
          saveLibrary();
        }
      }
      changeChoice(k, label, v);
    } else if (el.dataset.setting) {
      const key = el.dataset.setting;
      S.settings[key] = el.type === 'checkbox' ? el.checked : +el.value;
      saveSettings();
      if (key === 'keepAwake') keepAwake(!!S.current);
      if (key === 'supersets' || key === 'partials') render();
    } else if (el.dataset.settingRadio) {
      S.settings[el.dataset.settingRadio] = el.value;
      saveSettings();
      if (el.value !== 'off') {
        unlockAudio();
        playSound(el.value);
      }
    } else if (el.dataset.setup) {
      const it = setupItem(el);
      const f = el.dataset.setup;
      if (f === 'rest') it.rest = el.value === '' ? undefined : +el.value;
      else if (f === 'restBetween') it.restBetween = +el.value;
      else if (f === 'style') it.style = el.value;
      else if (f === 'step') it.step = +el.value;
      else if (f === 'band') it.band = tc(el.value.trim()) || 'Purple';
      else if (f === 'partials') it.partials = el.checked;
      saveLibrary();
      render();
    } else if (el.dataset.setupChoice != null) {
      const it = setupItem(el);
      it.choices = it.choices || {};
      it.choices[el.dataset.name] = Object.assign({}, it.choices[el.dataset.name], { [el.dataset.label]: el.value });
      saveLibrary();
      render();
    } else if (el.dataset.addday) {
      if (!el.value) return;
      S.library.days[el.dataset.addday].push({ names: [el.value], sets: 3 });
      saveLibrary();
      render();
    } else if (el.dataset.page) {
      S.page = { name: el.value, variation: '' };
      S.editingNote = null;
      render();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.id === 'pass') {
      e.preventDefault();
      const btn = document.querySelector('[data-action="connect"]');
      if (btn) connect(btn);
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (S.current) keepAwake(true);
      tickClock();
      sync();
      refreshHistory(false);
    }
  });
  window.addEventListener('online', () => {
    setSync('idle');
    sync();
  });
  window.addEventListener('offline', () => setSync('offline'));

  // ---------- Start ----------
  async function init() {
    try {
      const h = await idb.get('history');
      if (h && Array.isArray(h.sets)) S.history = Object.assign({ sets: [], sessions: [], notes: [] }, h);
    } catch (e) {}
    invalidate();
    render();
    if (notice) toast(notice);
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if (S.current) keepAwake(true);
    refreshHistory(true);
    setInterval(tickClock, 500);
    setInterval(() => {
      if (hasPending()) sync();
    }, 60000);
  }
  init();
})();
