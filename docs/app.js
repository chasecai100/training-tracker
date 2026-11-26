/* Training Tracker. Plain JavaScript, no build step. */
'use strict';
(function () {
  const CFG = window.TT_CONFIG;
  const DEF = window.TT_DEFAULTS;
  const DAYS = ['Push', 'Pull', 'Legs', 'Shoulders'];
  const VERSION = '3.0.0';
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
  const NAME_ALIAS = { 'Pull-up': 'Pull-Up', 'Chin-up': 'Chin-Up', Triceps: 'Tricep Overhead Extension', 'Incline Bench': 'Incline Smith Bench', 'Pec Deck': 'Pec Deck Fly' };
  const CORE_ALIAS = { 'Ab Raise': 'Ab Raise', 'Ab Crunch': 'Ab Crunch' };
  const VAR_ALIAS = {
    'Seated Row': { 'Close MAG grip': 'Close MAG Grip', 'Medium MAG grip': 'Medium MAG Grip' },
    'Lat Pulldown': { 'Close MAG grip': 'Close MAG Grip', 'Medium MAG grip': 'Medium MAG Grip', 'Single arm': 'Single Hand' },
    'Machine Press': { 'Weight stack': 'Weight Stack', 'Plate-loaded': 'Plate Loaded' },
    'Reverse Fly': { Double: 'Machine · Double', 'Single arm': 'Machine · Single' },
    Biceps: { Cable: 'Cable · Double', 'Supported single arm': 'Bench Supported · Single' },
    'Tricep Overhead Extension': { 'Overhead extension': 'Single Rope · Rope' },
  };

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
  const STYLES = [
    ['normal', 'Normal'],
    ['dropLast', 'Drop Set On Last Set'],
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
      { pass: '', restSec: 120, warmRest: 60, sound: 'bleep', keepAwake: true, supersets: false },
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
  };
  if (typeof S.settings.sound !== 'string') S.settings.sound = S.settings.sound ? 'bleep' : 'off';

  function loadLibrary() {
    let lib = load(KEYS.library, null);
    if (!lib || lib.version !== DEF.version) {
      // A new split came with this version: start from it, keeping exercises you created yourself.
      const known = new Set(OLD_NAMES.concat(DEF.exercises.map((e) => e.name)));
      const custom = lib && Array.isArray(lib.exercises) ? lib.exercises.filter((e) => !known.has(e.name)) : [];
      lib = { version: DEF.version, exercises: DEF.exercises.concat(custom).map(normalizeEx), days: clone(DEF.days) };
      if (load(KEYS.library, null)) notice = 'Your new split and Workout Setup are loaded. Fine-tune them in Settings.';
    } else {
      lib.exercises = lib.exercises.map(normalizeEx);
      const have = new Set(lib.exercises.map((e) => e.name));
      DEF.exercises.forEach((e) => !have.has(e.name) && lib.exercises.push(normalizeEx(e)));
      DAYS.forEach((d) => {
        if (!Array.isArray(lib.days[d])) lib.days[d] = clone(DEF.days[d] || []);
      });
    }
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
    S.history.notes.forEach((r) => (m[r.Exercise] = r.Note || ''));
    Object.values(S.pending.notes).forEach((r) => (m[r.Exercise] = r.Note || ''));
    return (memoNotes = m);
  }
  const noteOf = (name) => notesMap()[name] || '';

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
          const d = e.drops[dn - 1] || (e.drops[dn - 1] = { kg: null, reps: null, repsR: null });
          if (right) d.repsR = num(r.Reps);
          else d.reps = num(r.Reps);
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
  const lastOf = (k) => historyFor(S.current.items[k].name, varFilter(k))[0] || null;
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
      c.items[k] = { name: n, choices, cfg: clone(cfg), sets: [] };
      b.keys.push(k);
    });
    b.keys.forEach((k) => buildSets(k, cfg.sets || 3, cfg.warmups || 0));
    if (open) c.open = b.id;
    return b;
  }

  function startWorkout(day) {
    const now = new Date();
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
  const newDrop = (kg) => ({ id: uid(), kg: kg == null ? '' : fmt(kg), reps: '' });
  const canDrop = (k) => !itemDef(k).bodyweight;
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
        } else if (style === 'dropLast') {
          if (u === units - 1 && !s.drops.length) {
            const p = sideEntry(k, i);
            const n = (p && p.drops.length) || 3;
            for (let j = 0; j < n; j++) s.drops.push(newDrop());
          } else if (u !== units - 1 && s.drops.length && s.drops.every((d) => !d.kg)) {
            s.drops = [];
          }
        }
      });
    }
  }

  /** Ultimate drop set: from the set's weight, step down by `step` kg to the floor for this set. */
  function regenUltimate(k, i) {
    const it = S.current.items[k];
    const s = it.sets[i];
    if (s.warm || it.cfg.style !== 'ultimate' || s.drops.some((d) => d.reps)) return;
    const start = num(s.kg) != null ? num(s.kg) : placeholder(k, i).kg;
    const step = num(it.cfg.step) || 2.5;
    const floors = (it.cfg.floors && it.cfg.floors.length ? it.cfg.floors : [step]).map(Number);
    const floor = floors[Math.min(unitIndex(k, i), floors.length - 1)];
    const ws = [];
    if (start) for (let w = Math.round((start - step) * 100) / 100; w >= floor - 1e-9 && ws.length < 30; w = Math.round((w - step) * 100) / 100) ws.push(w);
    s.drops = ws.map((w, j) => Object.assign(s.drops[j] || newDrop(), { kg: fmt(w) }));
  }

  /** Hints for a drop: last time's same drop, else carry on the step down. */
  function dropPlaceholder(k, i, j) {
    const s = S.current.items[k].sets[i];
    const p = sideEntry(k, i);
    const pd = p && p.drops[j];
    let kg = pd ? pd.kg : null;
    if (kg == null && j > 0) {
      const at = (jj) => (jj < 0 ? (num(s.kg) != null ? num(s.kg) : placeholder(k, i).kg) : num(s.drops[jj].kg) != null ? num(s.drops[jj].kg) : dropPlaceholder(k, i, jj).kg);
      const a = at(j - 1);
      const b = at(j - 2);
      if (a != null && b != null && b > a && a - (b - a) > 0) kg = Math.round((a - (b - a)) * 100) / 100;
    }
    return { kg, reps: pd ? pd.reps : null };
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
    // Weight hint: last time's same set, else the set before (same side), else last time's final set.
    let kg = p && wantsKg(s) && (!def.bodyweight || p.variation === 'Weighted') ? p.kg : null;
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
    return { kg, reps: p ? p.reps : null, partials: p ? p.partials : null };
  }

  function compareSet(k, i) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    if (s.warm) return null;
    const p = sideEntry(k, i);
    if (!p) return null;
    if (def.bodyweight && variationOf(k, s) !== (p.variation || 'Bodyweight')) return null;
    const kg = def.bodyweight && s.mode !== 'Weighted' ? null : num(s.kg);
    return cmp(kg, num(s.reps), p.kg, p.reps);
  }

  // ---------- Personal records and targets ----------
  const e1rm = (kg, reps) => (kg && reps ? kg * (1 + reps / 30) : 0);
  const repsOf = (e) => (e.repsR != null ? Math.min(e.reps || 0, e.repsR || 0) : e.reps);
  function entryOf(k, i) {
    const s = S.current.items[k].sets[i];
    const def = itemDef(k);
    return { kg: def.bodyweight && s.mode !== 'Weighted' ? null : num(s.kg), reps: num(s.reps), repsR: null, variation: variationOf(k, s) };
  }
  function addToBests(b, e, def) {
    const reps = repsOf(e);
    if (!reps || reps <= 0) return;
    if (def.bodyweight) {
      const v = e.variation || 'Bodyweight';
      if (v === 'Bodyweight') {
        b.bwReps = Math.max(b.bwReps, reps);
        return;
      }
      if (v !== 'Weighted') return;
    }
    if (!e.kg || e.kg <= 0) return;
    b.kg = b.kg == null ? e.kg : Math.max(b.kg, e.kg);
    if (!def.bodyweight) b.e1rm = Math.max(b.e1rm, e1rm(e.kg, reps));
    b.pairs.push([e.kg, reps]);
  }
  function historyBests(name, variation) {
    const key = `best|${name}|${variation || ''}|${S.current ? S.current.session : ''}`;
    if (memoHist.has(key)) return memoHist.get(key);
    const def = exDef(name);
    const b = { kg: null, e1rm: 0, pairs: [], bwReps: 0, any: false };
    historyFor(name, variation).forEach((s) =>
      s.entries.forEach((e) => {
        b.any = true;
        addToBests(b, e, def);
      })
    );
    memoHist.set(key, b);
    return b;
  }
  /** Which records a finished working set broke: against earlier sessions and earlier sets today. */
  function prsFor(k, i) {
    const it = S.current.items[k];
    const s = it.sets[i];
    const def = exDef(it.name);
    if (s.warm || !s.end) return [];
    const base = historyBests(it.name, varFilter(k));
    if (!base.any) return [];
    const b = { kg: base.kg, e1rm: base.e1rm, pairs: base.pairs.slice(), bwReps: base.bwReps };
    forEachSet((kk, ii, x) => {
      if (x === s || x.warm || !x.end || x.end > s.end) return;
      if (S.current.items[kk].name !== it.name || varFilter(kk) !== varFilter(k)) return;
      addToBests(b, entryOf(kk, ii), def);
    });
    const e = entryOf(k, i);
    const reps = repsOf(e);
    if (!reps) return [];
    const out = [];
    const v = e.variation || 'Bodyweight';
    if (def.bodyweight && v === 'Bodyweight') return b.bwReps && reps > b.bwReps ? ['most reps'] : [];
    if ((def.bodyweight && v !== 'Weighted') || !e.kg) return [];
    if (b.kg != null && e.kg > b.kg) out.push('heaviest');
    else if (!def.bodyweight && b.e1rm && e1rm(e.kg, reps) > b.e1rm + 0.05) out.push('best est. 1RM');
    const atOrAbove = b.pairs.filter((p) => p[0] >= e.kg);
    if (atOrAbove.length && reps > Math.max(...atOrAbove.map((p) => p[1]))) out.push(`most reps at ${fmt(e.kg)} kg`);
    return out;
  }
  /** "To beat": last time's same set (and side) with one more rep. */
  function targetText(k, i, short) {
    const it = S.current.items[k];
    if (it.sets[i].warm) return '';
    const p = sideEntry(k, i);
    if (!p || p.reps == null) return '';
    const def = exDef(it.name);
    const w = weightLabel(Object.assign({}, p, { repsR: null }), def);
    const main = `${w ? w + ' × ' : ''}${p.reps + 1}`;
    if (short) return main;
    const heavier = !def.bodyweight || p.variation === 'Weighted';
    return `To Beat: ${main}${heavier ? ', Or Go Heavier' : ''}`;
  }
  function setVolume(k, s) {
    const def = itemDef(k);
    if (s.warm || def.bodyweight) return 0;
    const v = (x) => (num(x.kg) || 0) * (num(x.reps) || 0);
    return v(s) + (s.drops || []).reduce((a, d) => a + v(d), 0);
  }

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
    // Drops share the set's number, side and times; only drops with something typed are saved.
    let n = 0;
    (s.drops || []).forEach((d) => {
      const dkg = num(d.kg);
      const dr = num(d.reps);
      if (dr == null) return;
      n++;
      rows.push(Object.assign({}, base, { Drop: n, kg: dkg == null ? '' : dkg, Reps: dr, Partials: '', 'Set (s)': '', 'Rest (s)': '', ID: dropBase(s, d) }));
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
    S.pending.sessions[c.session] = {
      Session: c.session,
      Date: ymd(st.first),
      Day: c.day,
      Start: hm(st.first),
      End: hm(st.last),
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
    announcePr(k, i);
  }
  function announcePr(k, i) {
    const it = S.current.items[k];
    const s = it.sets[i];
    const prs = prsFor(k, i);
    const sig = prs.join('|');
    if (prs.length && s.prSig !== sig) {
      s.prSig = sig;
      persist();
      toast(`New PR On ${it.name}: ${prs.join(', ')}`);
    }
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

  /** After a set finishes, the next set (same side) starts with the same weights unless you change them. */
  function carryForward(k, i) {
    const it = S.current.items[k];
    const s = it.sets[i];
    if (s.warm) return;
    // The very next set (for one side at a time, that's the other side) and the next set on this side.
    const free = (x, j) => j > i && !x.warm && !x.start && !x.end;
    const targets = new Set([
      it.sets.findIndex(free),
      it.sets.findIndex((x, j) => free(x, j) && (x.side || '') === (s.side || '')),
    ]);
    targets.forEach((n) => {
      if (n < 0) return;
      const next = it.sets[n];
      if (next.kg === '' && s.kg !== '' && next.mode === s.mode) next.kg = s.kg;
      if (it.cfg.style === 'ultimate') regenUltimate(k, n);
      else s.drops.forEach((d, j) => next.drops[j] && next.drops[j].kg === '' && d.kg !== '' && (next.drops[j].kg = d.kg));
    });
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
    carryForward(k, i);
    c.lastEnd = s.end;
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
    announcePr(k, i);
    const reps = document.querySelector(`.set-row [data-k="${k}"][data-i="${i}"][data-f="reps"]`);
    if (reps && !reps.value && !s.warm) reps.focus();
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
    if (sessionStats().any) {
      queueSession();
      toast('Workout Saved');
    } else {
      dropSession(c.session);
    }
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
    if (!c.restCountdown) {
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
    else html = S.current ? workoutView() : startView();
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
    return [...by.values()]
      .map((s) => Object.assign(s, { length: info[s.session] ? num(info[s.session]['Length (min)']) : null }))
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
      const n = (S.library.days[d] || []).reduce((a, it) => a + it.sets * it.names.length, 0);
      const l = lens[d];
      const avg = l ? Math.round(l.reduce((a, b) => a + b, 0) / l.length) : null;
      return `<button class="day" data-action="start" data-day="${d}">
        <span class="day-name">${d}</span>
        <span class="day-stat">${avg ? `Avg ${avg} Min` : `${n} Sets`}</span>
        <span class="muted small">${lastByDay[d] ? 'Last ' + esc(daysAgo(lastByDay[d])) : 'Not done yet'}</span>
      </button>`;
    }).join('');
    const recent = sessions.slice(0, 8).map(
      (s) => `<li><div class="li-main"><span>${esc(niceDate(s.date))}</span><span>${esc(s.day)}</span></div>
        <div class="muted small">${s.sets} sets${s.length ? ` · ${s.length} min` : ''}</div></li>`
    ).join('');
    return `<header class="top"><div class="brand"><img src="icon.svg" alt=""><div><h1>Start A Workout</h1><div class="syncline">${syncText()}</div></div></div></header>
      <div class="day-grid">${days}</div>
      <button class="btn wide" data-action="start" data-day="Other">Empty Workout</button>
      ${recent ? `<h2>Recent Workouts</h2><ul class="list">${recent}</ul>` : ''}`;
  }

  /** The pinned panel: total time, plus the running set or the countdown to the next set. */
  function statusHtml() {
    const c = S.current;
    const run = runningSet();
    if (run) {
      const it = c.items[run.k];
      const tgt = targetText(run.k, run.i, true);
      return `<div id="status" class="status run">
        <div class="st-main"><span class="st-label">${run.s.warm ? 'Warm-Up' : 'Set'} In Progress · ${esc(it.name)} ${setLabel(run.k, run.i)}</span>
          <b id="st-time" class="st-big"></b>${tgt ? `<span class="st-beat">Beat ${esc(tgt)}</span>` : ''}</div>
        <button class="btn solid" data-action="end-running">End Set</button>
      </div>`;
    }
    if (!c.lastEnd) return '<div id="status" class="status idle"><div class="st-main"><span class="st-label">Ready · Tap Start On Your First Set</span></div></div>';
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
          <div class="tb-total"><span>Total</span><b id="wclock"></b></div>
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

  function lastLine(k, prefix) {
    const it = S.current.items[k];
    const last = lastOf(k);
    const label = prefix ? `${esc(it.name)}: ` : '';
    if (!last) return prefix ? `${label}<span class="muted">no history yet</span>` : '';
    const nos = it.sets.map((s, i) => (s.warm ? null : setNo(k, i))).filter((x) => x != null);
    let entries = last.entries.filter((e) => nos.includes(e.set));
    if (!entries.length) entries = last.entries;
    return `${label}Last time (${esc(daysAgo(last.date))}): ${esc(summary(entries, exDef(it.name)))}`;
  }

  /** In a workout a note is only shown (edit it in the Exercises tab); with no note, nothing is shown. */
  function workoutNote(name, compact) {
    const n = noteOf(name);
    return n ? `<div class="note${compact ? ' compact' : ''}">${ICON.pin}<span>${esc(n)}</span></div>` : '';
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
    if (!open) {
      const lines = b.keys.map((k) => lastLine(k, sup)).filter(Boolean).join('<br>');
      const notes = [...new Set(names)].map((n) => workoutNote(n, true)).join('');
      return `<section class="card" id="b-${b.id}">${head}<div class="card-peek">${lines ? `<div class="last muted small">${lines}</div>` : ''}${notes}</div></section>`;
    }
    let body = [...new Set(names)].map((n) => (sup && noteOf(n) ? `<div class="sub-name">${esc(n)}</div>` : '') + workoutNote(n)).join('');
    b.keys.forEach((k) => (body += choiceSelects(k, sup)));
    const lines = b.keys.map((k) => lastLine(k, sup) || '<span class="muted">No history yet</span>').join('<br>');
    body += `<div class="last small">${lines}</div>`;
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
        <button class="btn small ghost" data-action="remove-set" ${at}>Remove Last</button>
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

  function rowType(k) {
    const def = itemDef(k);
    return def.bodyweight ? (def.partials ? 'bwp' : 'bw') : 'normal';
  }
  function headRow(k) {
    const def = itemDef(k);
    const type = rowType(k);
    if (type === 'normal') return `<div class="set-head normal"><span></span><span>${def.kgLabel || 'Kg'}</span><span></span><span>Reps</span></div>`;
    return `<div class="set-head ${type}"><span></span><span>Type</span><span>Kg / Band</span><span></span><span>Reps</span>${type === 'bwp' ? '<span>Partial</span>' : ''}</div>`;
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
      if (s.mode === 'Weighted') h += input('kg', s.kg, ph.kg, 'decimal', 'Added kg');
      else if (s.mode === 'Band') h += `<input data-f="band" ${a} value="${esc(s.band)}" placeholder="Purple" autocomplete="off" autocapitalize="words" aria-label="Band">`;
      else h += '<span class="dash">—</span>';
    } else {
      h += input('kg', s.kg, ph.kg, 'decimal', def.kgLabel ? 'Added kg' : 'kg');
    }
    if (s.end) h += `<button class="sbtn done" data-action="set-btn" ${a} aria-label="Done. Tap twice to undo">${ICON.check}</button>`;
    else if (s.start) h += `<button class="sbtn run" data-action="set-btn" ${a}><span>End</span><span class="rt" id="rt-${s.id}"></span></button>`;
    else h += `<button class="sbtn" data-action="set-btn" ${a}>Start</button>`;
    h += input('reps', s.reps, ph.reps, 'numeric', 'Reps', s.end && !s.warm && num(s.reps) == null ? 'need' : '');
    if (type === 'bwp') h += input('partials', s.partials, ph.partials, 'numeric', 'Partial reps');
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
    return `<div class="drop-row normal${label ? ' labeled' : ''}${s.end ? ' done' : ''}">
      <span class="drop-mark" aria-hidden="true">↳</span>
      <input data-f="kg" ${a} value="${esc(d.kg)}" placeholder="${ph.kg == null ? '' : esc(fmt(ph.kg))}" inputmode="decimal" autocomplete="off" aria-label="Drop ${j + 1} kg">
      <button class="drop-x" data-action="drop-remove" ${a} aria-label="Remove drop ${j + 1}">✕</button>
      <input data-f="reps" ${a} value="${esc(d.reps)}" placeholder="${ph.reps == null ? '' : esc(ph.reps)}" inputmode="numeric" autocomplete="off" aria-label="Drop ${j + 1} reps"${s.end ? '' : ' disabled'}>
    </div>`;
  }

  function isNextSet(k, i) {
    const sets = S.current.items[k].sets;
    if (sets.some((s) => s.start && !s.end)) return false;
    return sets.findIndex((s) => !s.warm && !s.start && !s.end) === i;
  }

  /** The line under a set: PRs, progress vs last time, set and rest times, the target, and "+ Drop". */
  function footerHtml(k, i, label) {
    const it = S.current.items[k];
    const s = it.sets[i];
    const a = `data-k="${k}" data-i="${i}"`;
    let inner = '';
    if (s.end && !s.warm) {
      const prs = prsFor(k, i);
      if (prs.length) inner += `<span class="pr">${ICON.trophy}PR · ${esc(prs.join(' · '))}</span>`;
      const m = compareSet(k, i);
      if (m) inner += `<span class="mk ${m.dir > 0 ? 'up' : m.dir < 0 ? 'down' : 'same'}">${m.dir > 0 ? '▲' : m.dir < 0 ? '▼' : '='} ${esc(m.text)}</span>`;
    }
    if (s.end) {
      const bits = [];
      if (s.start) bits.push(`set ${clock((new Date(s.end) - new Date(s.start)) / 1000)}`);
      if (s.rest != null) bits.push(`rest ${clock(s.rest)}`);
      if (bits.length) inner += `<span class="muted">${bits.join(' · ')}</span>`;
    }
    if (!s.end && !s.warm && (s.start || isNextSet(k, i))) {
      const t = targetText(k, i);
      if (t) inner += `<span class="target">${esc(t)}</span>`;
    }
    if (s.warm) {
      if (!s.start && !s.end) inner += `<button class="link tiny-x" data-action="warm-remove" ${a}>✕ Remove Warm-Up</button>`;
    } else if (canDrop(k) && it.cfg.style !== 'ultimate' && it.cfg.style !== 'double') {
      const lastRows = unitRows(k, unitsOf(k) - 1);
      if (s.start || s.end || lastRows.includes(i) || s.drops.length) inner += `<button class="link drop-add" data-action="drop-add" ${a}>+ Drop</button>`;
    }
    if (it.cfg.style === 'ultimate' && !s.warm && !s.drops.length && !s.end) inner += '<span class="muted">Drops fill in once you enter the weight</span>';
    return `<div class="markers${label ? ' indent' : ''}" id="ft-${s.id}"${inner ? '' : ' hidden'}>${inner}</div>`;
  }

  function finishModal() {
    const st = sessionStats();
    let ups = 0;
    let volume = 0;
    const prList = [];
    forEachSet((k, i, s) => {
      if (!s.end || s.warm) return;
      const m = compareSet(k, i);
      if (m && m.dir > 0) ups++;
      volume += setVolume(k, s);
      const prs = prsFor(k, i);
      if (prs.length) prList.push(`${S.current.items[k].name} (${prs.join(', ')})`);
    });
    const mins = st.first ? Math.max(1, Math.round((st.last - st.first) / 60000)) : 0;
    const run = runningSet();
    return `<div class="modal-back" data-action="modal-close-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Finish ${esc(S.current.day)}?</h2>
      <div class="stats">
        <div><b>${mins}</b><span>Minutes</span></div>
        <div><b>${st.sets}</b><span>Working Sets</span></div>
        <div><b>${ups}</b><span>Beat Last Time</span></div>
        <div class="${prList.length ? 'hot' : ''}"><b>${prList.length}</b><span>PRs</span></div>
        <div><b>${st.avgRest != null ? clock(st.avgRest) : '–'}</b><span>Average Rest</span></div>
        <div><b>${volume ? Math.round(volume).toLocaleString() : '–'}</b><span>Kg Volume</span></div>
      </div>
      ${prList.length ? `<p class="small"><b>New PRs:</b> ${esc(prList.join(' · '))}</p>` : ''}
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
    if (pts.length > 1) s += `<polyline class="line" points="${pts.map((p, i) => `${r1(x(i))},${r1(y(p.value))}`).join(' ')}"/>`;
    pts.forEach((p, i) => {
      const last = i === pts.length - 1;
      s += `<circle class="dot${last ? ' last' : ''}" cx="${r1(x(i))}" cy="${r1(y(p.value))}" r="${last ? 5 : 3.5}"><title>${esc(niceDate(p.date))}: ${fmt(p.value)}</title></circle>`;
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
    return `<section class="panel"><h2>${ICON.trophy}Records</h2><ul class="records">${rows
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
    const pts = sessions.map((s) => Object.assign({ date: s.date }, score(s.entries, def))).reverse();
    h += `<section class="panel"><div class="chart-title">${esc(pts[0].label)}</div>${chartSvg(pts)}<p class="muted small">${esc(pts[0].hint)}</p></section>`;
    h += recordsHtml(sessions, def);
    h += `<h2>History</h2><ul class="list">${sessions
      .map((s, i) => {
        const prev = sessions[i + 1];
        const d = prev ? score(s.entries, def).value - score(prev.entries, def).value : null;
        const mk = d == null ? '' : `<span class="mk ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}">${d > 0 ? '▲' : d < 0 ? '▼' : '='}</span>`;
        const v = !def.bodyweight && !P.variation && s.entries[0] && s.entries[0].variation ? ` · ${esc(s.entries[0].variation)}` : '';
        const ar = avgRest(s.entries);
        return `<li><div class="li-main"><span>${esc(niceDate(s.date))}${v}</span>${mk}</div>
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
    const anyWeighted = it.names.some((n) => !exDef(n).bodyweight);
    if (anyWeighted) {
      h += `<label class="setup-row"><span>Set Style</span>${sel('style', STYLES, it.style || 'normal')}</label>`;
      if (it.style === 'ultimate') {
        h += `<label class="setup-row"><span>Drop By (Kg)</span>${sel('step', [[1, '1'], [1.25, '1.25'], [2.5, '2.5'], [5, '5']], it.step || 2.5)}</label>`;
        h += `<label class="setup-row"><span>Lowest Weight Per Set</span><input data-setup="floors" ${at} value="${esc((it.floors || [5, 2.5]).join(', '))}" placeholder="5, 2.5" inputmode="decimal"></label>`;
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
    const opts = (vals, cur) => vals.map((v) => `<option value="${v}" ${cur === v ? 'selected' : ''}>${clock(v)}</option>`).join('');
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
        <label class="field">Default Rest<select data-setting="restSec">${opts([60, 90, 120, 150, 180, 240, 300], S.settings.restSec)}</select></label>
        <label class="field">Rest After A Warm-Up Set<select data-setting="warmRest">${opts([30, 45, 60, 90, 120], S.settings.warmRest)}</select></label>
        <h3>Rest Over Sound</h3>
        ${sounds}
        <p class="muted small">The sound is set to briefly lower your music while it plays. Test it with music on: if your music stops instead, tell me and I'll change how it plays. Your phone can't make the sound while it's locked, so the screen stays on during workouts.</p>
        <label class="check"><input type="checkbox" data-setting="keepAwake" ${S.settings.keepAwake ? 'checked' : ''}> Keep The Screen On During A Workout</label>
      </section>
      <section class="panel">
        <h2>Supersets</h2>
        <label class="check"><input type="checkbox" data-setting="supersets" ${S.settings.supersets ? 'checked' : ''}> Show Superset Options</label>
        <p class="muted small">When on, each exercise gets a “Superset With…” button, and Workout Setup can link exercises. Pull-Up + Chin-Up stays a superset either way.</p>
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
        if (it.cfg.style === 'dropLast') {
          // The drop set belongs on the last set: move empty drop rows down.
          const prev = unitRows(k, target - 2);
          const last = unitRows(k, target - 1);
          prev.forEach((pi, n) => {
            const p = it.sets[pi];
            if (p.drops.length && dropUntouched(p) && last[n] != null) {
              it.sets[last[n]].drops = p.drops;
              p.drops = [];
            }
          });
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
    persist();
    if (s.end) requeueSoon(k, s.id);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
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
        persist();
        render();
      }
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
      if (key === 'supersets') render();
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
      else if (f === 'floors') it.floors = el.value.split(',').map((x) => num(x)).filter((x) => x != null && x > 0);
      else if (f === 'band') it.band = tc(el.value.trim()) || 'Purple';
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
