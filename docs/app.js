/* Training Tracker. Plain JavaScript, no build step. */
'use strict';
(function () {
  const CFG = window.TT_CONFIG;
  const DEF = window.TT_DEFAULTS;
  const DAYS = ['Push', 'Pull', 'Legs', 'Shoulders'];
  const VERSION = '2.1.0';
  const KEYS = { settings: 'tt.settings', library: 'tt.library', current: 'tt.current', pending: 'tt.pending' };
  // Exercise names from the first version's list, used once to tell them apart from ones you added.
  const V1_NAMES = [
    'Machine Press (Weight stack)', 'Machine Press (Plate)', 'Incline Smith Bench', 'Landmine Press', 'Pec Deck',
    'Smith Shoulder Press', 'Dumbbell Shoulder Press', 'Dumbbell Pullover', 'Tricep Overhead Extension', 'Ab Raise',
    'Pull-up', 'Chin-up', 'Seated Row', 'Supported Row', 'Lat Pulldown (Single)', 'Lat Pulldown (Double)',
    'Reverse Fly (Double)', 'Reverse Fly (Single)', 'Cable Biceps', 'Supported Biceps (Single)', 'Face Pull', 'Ab Crunch',
    'Leg Press', 'Machine Calf Raise', 'Hamstring Curl', 'Leg Extension', 'Adductor', 'Lateral Raise',
  ];

  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M6 15.5l4-5 3 3 5-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6l-1 6 3 3H7l3-3-1-6zM12 13v7" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
  };

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

  // ---------- State ----------
  let notice = '';
  const S = {
    settings: Object.assign({ pass: '', restSec: 120, sound: true, keepAwake: true }, load(KEYS.settings, {})),
    library: loadLibrary(),
    current: loadCurrent(),
    pending: Object.assign({ sets: {}, deleteSets: [], sessions: {}, deleteSessions: [], notes: {} }, load(KEYS.pending, {})),
    history: { sets: [], sessions: [], notes: [] },
    tab: 'workout',
    modal: null,
    sync: 'idle',
    page: { name: null, variation: '' },
    editingNote: null,
  };

  function normalizeEx(e) {
    const x = clone(e);
    if (Array.isArray(x.attachments)) {
      x.variations = x.attachments.map((n) => ({ name: n }));
      x.label = 'Attachment';
      delete x.attachments;
    }
    return x;
  }

  function loadLibrary() {
    let lib = load(KEYS.library, null);
    if (lib && lib.version === 2) {
      // Version 3 added drop sets: keep your split, switch them on for triceps and biceps.
      ['Triceps', 'Biceps'].forEach((n) => {
        const e = lib.exercises.find((x) => x.name === n);
        if (e) e.dropLast = true;
      });
      lib.version = 3;
    }
    if (!lib || lib.version !== DEF.version) {
      const custom =
        lib && Array.isArray(lib.exercises)
          ? lib.exercises.filter((e) => !V1_NAMES.includes(e.name) && !DEF.exercises.some((d) => d.name === e.name)).map(normalizeEx)
          : [];
      lib = { version: DEF.version, exercises: clone(DEF.exercises).concat(custom), days: clone(DEF.days) };
    } else {
      const have = new Set(lib.exercises.map((e) => e.name));
      DEF.exercises.forEach((e) => !have.has(e.name) && lib.exercises.push(clone(e)));
      DAYS.forEach((d) => {
        if (!Array.isArray(lib.days[d])) lib.days[d] = clone(DEF.days[d] || []);
      });
    }
    store(KEYS.library, lib);
    return lib;
  }

  function loadCurrent() {
    const c = load(KEYS.current, null);
    if (c && c.v !== 2) {
      store(KEYS.current, null);
      notice = 'The app was updated, so your open workout was closed. Sets you had ticked off are saved.';
      return null;
    }
    if (c) Object.values(c.items).forEach((it) => it.sets.forEach((s) => Array.isArray(s.drops) || (s.drops = [])));
    return c;
  }

  const persist = () => store(KEYS.current, S.current);
  const savePending = () => store(KEYS.pending, S.pending);
  const saveSettings = () => store(KEYS.settings, S.settings);
  const saveLibrary = () => store(KEYS.library, S.library);
  const exDef = (name) => S.library.exercises.find((e) => e.name === name) || { name };
  const varDef = (def, v) => (def.variations || []).find((x) => x.name === v) || null;
  const hasVariations = (def) => Array.isArray(def.variations) && def.variations.length > 0;
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

  /** Every set we know about: the sheet's copy plus changes not uploaded yet. */
  function allSets() {
    if (memoSets) return memoSets;
    const del = new Set(S.pending.deleteSets);
    const map = new Map();
    S.history.sets.forEach((r) => {
      if (r.ID && !del.has(r.ID)) map.set(r.ID, r);
    });
    Object.values(S.pending.sets).forEach((r) => map.set(r.ID, r));
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

  /** Earlier sessions of one exercise, newest first, each with its sets grouped. */
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
      .map((s) => Object.assign(s, { entries: groupSets(s.rows) }))
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
        const e = by.get(k) || { set: k, kg: null, variation: '', reps: null, repsR: null, rest: null, drops: [] };
        by.set(k, e);
        const dn = num(r.Drop) || 0;
        if (dn > 0) {
          const d = e.drops[dn - 1] || (e.drops[dn - 1] = { kg: null, reps: null, repsR: null });
          if (r.Side === 'R') d.repsR = num(r.Reps);
          else d.reps = num(r.Reps);
          if (d.kg == null) d.kg = num(r.kg);
          return;
        }
        if (!e.variation) e.variation = r.Variation || '';
        if (r.Side === 'R') e.repsR = num(r.Reps);
        else {
          e.reps = num(r.Reps);
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
    return e.kg != null ? `${fmt(e.kg)} kg` : '';
  }
  function repsLabel(e) {
    const r = (x) => (x == null ? '–' : x);
    return e.repsR != null ? `L${r(e.reps)}/R${r(e.repsR)}` : `${r(e.reps)}`;
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
  // A workout has blocks (cards). Each block holds one exercise, or two for a superset.
  // Each exercise in a block is an "item" with its own sets; the same exercise can
  // appear twice in a day (Calves), and its set numbers then carry on across both.
  const orderedKeys = () => S.current.blocks.reduce((a, b) => a.concat(b.keys), []);
  const blockOf = (k) => S.current.blocks.find((b) => b.keys.includes(k));
  const itemDef = (k) => exDef(S.current.items[k].name);
  const oneArm = (k) => {
    const it = S.current.items[k];
    const def = exDef(it.name);
    return !!def.oneArm || !!(varDef(def, it.variation) || {}).oneArm;
  };
  const varFilter = (k) => (hasVariations(itemDef(k)) ? S.current.items[k].variation : '');
  const lastOf = (k) => historyFor(S.current.items[k].name, varFilter(k))[0] || null;

  function setNo(k, i) {
    const name = S.current.items[k].name;
    let off = 0;
    for (const key of orderedKeys()) {
      if (key === k) break;
      if (S.current.items[key].name === name) off += S.current.items[key].sets.length;
    }
    return off + i + 1;
  }
  function entryFor(k, i) {
    const last = lastOf(k);
    if (!last) return null;
    const no = setNo(k, i);
    return last.entries.find((e) => e.set === no) || null;
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
    if (!def.bodyweight) return it.variation || '';
    if (s.mode === 'Weighted') return 'Weighted';
    if (s.mode === 'Band') return 'Band: ' + (cap((s.band || '').trim()) || 'Purple');
    return 'Bodyweight';
  }

  function defaultVariation(name) {
    const def = exDef(name);
    if (!hasVariations(def)) return '';
    const recent = historyFor(name, '')[0];
    const used = recent && recent.entries.length ? recent.entries[0].variation : '';
    return varDef(def, used) ? used : def.variations[0].name;
  }

  function newSet(k, i) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = { id: uid(), kg: '', reps: '', repsR: '', mode: 'Bodyweight', band: 'Purple', start: null, end: null, rest: null, drops: [] };
    if (def.bodyweight) {
      const last = historyFor(it.name, '')[0];
      const no = setNo(k, i);
      const p = last && (last.entries.find((e) => e.set === no) || last.entries[last.entries.length - 1]);
      if (p) {
        const v = p.variation || 'Bodyweight';
        s.mode = v === 'Weighted' ? 'Weighted' : v.indexOf('Band') === 0 ? 'Band' : 'Bodyweight';
        if (s.mode === 'Band') s.band = v.replace(/^Band:?\s*/, '') || 'Purple';
      }
    }
    return s;
  }

  function addBlock(names, sets, open = true) {
    const c = S.current;
    const b = { id: uid(), keys: [] };
    c.blocks.push(b);
    names.forEach((n) => {
      const k = uid();
      c.items[k] = { name: n, variation: defaultVariation(n), sets: [] };
      b.keys.push(k);
    });
    b.keys.forEach((k) => {
      let count = sets;
      if (!count) {
        const last = lastOf(k);
        count = Math.max(1, Math.min(last ? last.entries.length : 3, 8));
      }
      for (let i = 0; i < count; i++) c.items[k].sets.push(newSet(k, i));
      addDefaultDrops(k);
    });
    if (open) c.open = b.id;
    return b;
  }

  // ---------- Drop sets ----------
  const newDrop = () => ({ id: uid(), kg: '', reps: '', repsR: '' });
  const canDrop = (k) => !itemDef(k).bodyweight;
  const dropUntouched = (s) => !s.start && !s.end && (s.drops || []).every((d) => !d.kg && !d.reps && !d.repsR);

  /** For exercises marked dropLast, give the last set as many drop rows as last time (3 the first time). */
  function addDefaultDrops(k) {
    const it = S.current.items[k];
    if (!exDef(it.name).dropLast || !canDrop(k) || !it.sets.length) return;
    const lastSet = it.sets[it.sets.length - 1];
    if (lastSet.drops.length) return;
    const p = entryFor(k, it.sets.length - 1);
    const prevLast = lastOf(k) && lastOf(k).entries.filter((e) => e.drops.length).slice(-1)[0];
    const n = (p && p.drops.length) || (prevLast && prevLast.drops.length) || 3;
    for (let j = 0; j < n; j++) lastSet.drops.push(newDrop());
  }

  /** Weight and reps hints for a drop: last time's same drop, else carry on the step down. */
  function dropPlaceholder(k, i, j) {
    const s = S.current.items[k].sets[i];
    const p = entryFor(k, i);
    const pd = p && p.drops[j];
    let kg = pd ? pd.kg : null;
    if (kg == null && j > 0) {
      const at = (jj) => (jj < 0 ? num(s.kg) ?? placeholder(k, i).kg : num(s.drops[jj].kg) ?? dropPlaceholder(k, i, jj).kg);
      const a = at(j - 1);
      const b = at(j - 2);
      if (a != null && b != null && b > a && a - (b - a) > 0) kg = Math.round((a - (b - a)) * 100) / 100;
    }
    return { kg, reps: pd ? pd.reps : null, repsR: pd ? pd.repsR : null };
  }

  function startWorkout(day) {
    const now = new Date();
    S.current = {
      v: 2,
      session: `${ymd(now)}-${pad(now.getHours())}${pad(now.getMinutes())}`,
      day: day === 'Other' ? 'Workout' : day,
      created: now.toISOString(),
      blocks: [],
      items: {},
      open: null,
      firstStart: null,
      lastEnd: null,
      restCountdown: false,
      restExtra: 0,
      beepedAt: null,
    };
    invalidate();
    (S.library.days[day] || []).forEach((it) => addBlock(it.names, it.sets, false));
    S.current.open = S.current.blocks.length ? S.current.blocks[0].id : null;
    S.tab = 'workout';
    persist();
    unlockAudio();
    keepAwake(true);
    render();
    window.scrollTo(0, 0);
  }

  function placeholder(k, i) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const last = lastOf(k);
    const p = entryFor(k, i);
    const wantsKg = (set) => !def.bodyweight || set.mode === 'Weighted';
    const prev = i > 0 && wantsKg(it.sets[i - 1]) ? it.sets[i - 1] : null;
    // Weight hint: what you typed for the set before, else last time's same set,
    // else the hint the set before got, else last time's final set.
    let kg = prev ? num(prev.kg) : null;
    if (kg == null && p && (!def.bodyweight || p.variation === 'Weighted')) kg = p.kg;
    if (kg == null && prev) kg = placeholder(k, i - 1).kg;
    if (kg == null && last) {
      const pool = last.entries.filter((e) => e.kg != null && (!def.bodyweight || e.variation === 'Weighted'));
      if (pool.length) kg = pool[pool.length - 1].kg;
    }
    return { kg, reps: p ? p.reps : null, repsR: p ? p.repsR : null };
  }

  function compareSet(k, i) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    const p = entryFor(k, i);
    if (!p) return null;
    if (def.bodyweight && variationOf(k, s) !== (p.variation || 'Bodyweight')) return null;
    const kg = def.bodyweight && s.mode !== 'Weighted' ? null : num(s.kg);
    if (oneArm(k)) return { L: cmp(kg, num(s.reps), p.kg, p.reps), R: cmp(kg, num(s.repsR), p.kg, p.repsR) };
    return { one: cmp(kg, num(s.reps), p.kg, p.reps) };
  }

  const sideIds = (k, base) => (oneArm(k) ? [base + '-L', base + '-R'] : [base]);
  const dropBase = (s, d) => `${s.id}-${d.id}`;
  /** Every sheet row id a set can own: its own row(s) plus one per drop. */
  const rowIds = (k, s) => (s.drops || []).reduce((a, d) => a.concat(sideIds(k, dropBase(s, d))), sideIds(k, s.id));

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
      Set: setNo(k, i),
      Drop: '',
      kg: kg == null ? '' : kg,
      Start: hms(st),
      End: hms(en),
      Session: c.session,
    };
    const rest = s.rest == null ? '' : s.rest;
    const arm = oneArm(k);
    const rows = arm
      ? [
          Object.assign({}, base, { Side: 'L', Reps: num(s.reps), 'Set (s)': dur, 'Rest (s)': rest, ID: s.id + '-L' }),
          Object.assign({}, base, { Side: 'R', Reps: num(s.repsR), 'Set (s)': '', 'Rest (s)': '', ID: s.id + '-R' }),
        ]
      : [Object.assign({}, base, { Side: '', Reps: num(s.reps), 'Set (s)': dur, 'Rest (s)': rest, ID: s.id })];
    // Drops share the set's number and times; only drops with something typed are saved.
    let n = 0;
    (s.drops || []).forEach((d) => {
      const dkg = num(d.kg);
      const dr = num(d.reps);
      const drR = num(d.repsR);
      if (dkg == null && dr == null && drR == null) return;
      n++;
      const db = Object.assign({}, base, { Drop: n, kg: dkg == null ? '' : dkg, 'Set (s)': '', 'Rest (s)': '' });
      const id = dropBase(s, d);
      if (arm) {
        rows.push(Object.assign({}, db, { Side: 'L', Reps: dr, ID: id + '-L' }));
        rows.push(Object.assign({}, db, { Side: 'R', Reps: drR, ID: id + '-R' }));
      } else rows.push(Object.assign({}, db, { Side: '', Reps: dr, ID: id }));
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
    forEachSet((k, i, s) => {
      if (!s.end) return;
      sets++;
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
    return { first, last, sets, work, rest, avgRest: rests ? rest / rests : null };
  }
  function queueSession() {
    const c = S.current;
    const st = sessionStats();
    if (!st.sets) {
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
  function requeueSoon(k, i) {
    const key = k + '|' + i;
    clearTimeout(requeueTimers[key]);
    requeueTimers[key] = setTimeout(() => {
      const it = S.current && S.current.items[k];
      const s = it && it.sets[i];
      if (s && s.end) {
        syncSetRows(k, i);
        scheduleSync();
      }
    }, 800);
  }

  // Start, end and undo a set
  function startSet(k, i) {
    const c = S.current;
    const s = c.items[k].sets[i];
    const run = runningSet();
    if (run) {
      toast('End the set that’s running first');
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

  function endSet(k, i) {
    const c = S.current;
    const it = c.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    const now = new Date();
    s.end = now.toISOString();
    const ph = placeholder(k, i);
    if (s.kg === '' && (!def.bodyweight || s.mode === 'Weighted') && ph.kg != null) s.kg = fmt(ph.kg);
    if (s.mode === 'Band' && !String(s.band || '').trim()) s.band = 'Purple';
    c.lastEnd = s.end;
    const b = blockOf(k);
    c.restCountdown = !b || b.keys[b.keys.length - 1] === k;
    c.restExtra = 0;
    c.beepedAt = null;
    unlockAudio();
    syncSetRows(k, i);
    queueSession();
    persist();
    render();
    scheduleSync();
    const reps = document.querySelector(`.set-row [data-k="${k}"][data-i="${i}"][data-f="reps"]`);
    if (reps && !reps.value) reps.focus();
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
    if (sessionStats().sets) {
      queueSession();
      toast('Workout saved');
    } else {
      dropSession(c.session);
    }
    closeWorkout();
  }
  function discardWorkout() {
    forEachSet((k, i, s) => s.end && unqueueRows(rowIds(k, s)));
    dropSession(S.current.session);
    toast('Workout discarded');
    closeWorkout();
  }
  function closeWorkout() {
    S.current = null;
    S.modal = null;
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
    toast(text.trim() ? 'Note saved' : 'Note removed');
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

  // ---------- Rest timer, sound, screen ----------
  let actx = null;
  function unlockAudio() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = 'transient';
    } catch (e) {}
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state !== 'running') actx.resume();
    } catch (e) {}
  }
  function beep() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    if (!S.settings.sound || !actx) return;
    try {
      if (actx.state !== 'running') actx.resume();
      const t0 = actx.currentTime + 0.05;
      [0, 0.28, 0.56].forEach((d, i) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = 'sine';
        o.frequency.value = i === 2 ? 1320 : 880;
        g.gain.setValueAtTime(0.0001, t0 + d);
        g.gain.exponentialRampToValueAtTime(0.7, t0 + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.22);
        o.connect(g);
        g.connect(actx.destination);
        o.start(t0 + d);
        o.stop(t0 + d + 0.25);
      });
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

  const restTarget = () => S.settings.restSec + ((S.current && S.current.restExtra) || 0);

  function tickClock() {
    const c = S.current;
    if (!c) return;
    const now = Date.now();
    const w = $('#wclock');
    if (w) w.textContent = c.firstStart ? clock((now - new Date(c.firstStart)) / 1000) : 'not started';
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
    if (t) t.textContent = clock(el);
    if (!c.restCountdown) return;
    const target = restTarget();
    const over = el >= target;
    const st = $('#status');
    if (st) st.classList.toggle('over', over);
    const bar = $('#st-bar');
    if (bar) bar.style.width = `${Math.min(100, (el / target) * 100)}%`;
    const tg = $('#st-target');
    if (tg) tg.textContent = over ? `${clock(el - target)} over` : `of ${clock(target)}`;
    if (over && c.beepedAt !== c.lastEnd) {
      c.beepedAt = c.lastEnd;
      persist();
      if (el - target < 5) beep();
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
      if (r.Side !== 'R') s.sets++;
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
    sessions.forEach((s) => {
      if (!lastByDay[s.day]) lastByDay[s.day] = s.date;
    });
    const days = DAYS.map((d) => {
      const n = (S.library.days[d] || []).reduce((a, it) => a + it.sets * it.names.length, 0);
      return `<button class="day" data-action="start" data-day="${d}">
        <span class="day-name">${d}</span>
        <span class="muted small">${n} sets · ${lastByDay[d] ? 'last ' + esc(daysAgo(lastByDay[d])) : 'not done yet'}</span>
      </button>`;
    }).join('');
    const recent = sessions.slice(0, 8).map(
      (s) => `<li><div class="li-main"><span>${esc(niceDate(s.date))}</span><span>${esc(s.day)}</span></div>
        <div class="muted small">${s.sets} sets${s.length ? ` · ${s.length} min` : ''}</div></li>`
    ).join('');
    return `<header class="top"><div class="brand"><img src="icon.svg" alt=""><div><h1>Start a workout</h1><div class="syncline">${syncText()}</div></div></div></header>
      <div class="day-grid">${days}</div>
      <button class="btn wide" data-action="start" data-day="Other">Empty workout</button>
      ${recent ? `<h2>Recent workouts</h2><ul class="list">${recent}</ul>` : ''}`;
  }

  function statusHtml() {
    const c = S.current;
    const run = runningSet();
    if (run) {
      const it = c.items[run.k];
      return `<div id="status" class="status run">
        <div class="st-main"><span class="st-label">Set in progress · ${esc(it.name)} ${setNo(run.k, run.i)}</span><b id="st-time" class="st-time"></b></div>
        <button class="btn small solid" data-action="end-running">End set</button>
      </div>`;
    }
    if (!c.lastEnd) return '<div id="status" hidden></div>';
    if (!c.restCountdown) {
      return `<div id="status" class="status">
        <div class="st-main"><span class="st-label">Rest</span><b id="st-time" class="st-time"></b><span class="muted small">superset: next exercise</span></div>
      </div>`;
    }
    return `<div id="status" class="status">
        <div class="st-main"><span class="st-label">Rest</span><b id="st-time" class="st-time"></b><span id="st-target" class="st-target"></span>
          <div class="bar"><div id="st-bar"></div></div></div>
        <button class="btn small" data-action="rest-add">+30s</button>
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
        <header class="top">
          <div><h1>${esc(c.day)}</h1><div class="sub"><span id="wclock"></span> · ${done}/${total} sets</div></div>
          <button class="btn primary" data-action="finish">Finish</button>
        </header>
        ${statusHtml()}
      </div>
      ${c.blocks.map(blockHtml).join('')}
      <div class="add-ex">
        <input id="exsearch" type="search" placeholder="Add any exercise, or create a new one" autocomplete="off" autocorrect="off" enterkeyhint="search" aria-label="Add an exercise">
        <div id="exresults" class="results"></div>
      </div>
      <p class="syncline center">${syncText()}</p>
      ${S.modal === 'finish' ? finishModal() : ''}`;
  }

  function lastLine(k, prefix) {
    const it = S.current.items[k];
    const last = lastOf(k);
    const label = prefix ? `${esc(it.name)}: ` : '';
    if (!last) return prefix ? `${label}<span class="muted">no history yet</span>` : '';
    // Only the sets this card covers (matters when an exercise appears twice in a day).
    const nos = it.sets.map((s, i) => setNo(k, i));
    let entries = last.entries.filter((e) => nos.includes(e.set));
    if (!entries.length) entries = last.entries;
    return `${label}Last time (${esc(daysAgo(last.date))}): ${esc(summary(entries, exDef(it.name)))}`;
  }

  function noteHtml(name, compact) {
    if (S.editingNote === name) {
      return `<div class="note-edit">
        <textarea id="note-input" rows="3" placeholder="Seat 4, back pad 2, handles on the inside">${esc(noteOf(name))}</textarea>
        <div class="row-btns"><button class="btn small primary" data-action="note-save" data-name="${esc(name)}">Save note</button>
        <button class="btn small ghost" data-action="note-cancel">Cancel</button></div></div>`;
    }
    const n = noteOf(name);
    if (n) return `<button class="note${compact ? ' compact' : ''}" data-action="note-edit" data-name="${esc(name)}">${ICON.pin}<span>${esc(n)}</span></button>`;
    return compact ? '' : `<button class="note-add" data-action="note-edit" data-name="${esc(name)}">+ Add a note (seat, settings…)</button>`;
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
        <span class="count ${runningHere ? 'live' : total && done === total ? 'ok' : ''}">${runningHere ? 'live' : `${done}/${total}`}</span>
      </button>`;
    if (!open) {
      const lines = b.keys.map((k) => lastLine(k, sup)).filter(Boolean).join('<br>');
      const notes = [...new Set(names)].map((n) => noteHtml(n, true)).join('');
      return `<section class="card" id="b-${b.id}">${head}<div class="card-peek">${lines ? `<div class="last muted small">${lines}</div>` : ''}${notes}</div></section>`;
    }
    let body = '';
    if (sup) {
      const without = [];
      [...new Set(names)].forEach((n) => {
        if (noteOf(n) || S.editingNote === n) body += `<div class="sub-name">${esc(n)}</div>${noteHtml(n)}`;
        else without.push(n);
      });
      if (without.length) {
        body += `<div class="note-links">${without
          .map((n) => `<button class="link" data-action="note-edit" data-name="${esc(n)}">+ ${esc(n)} note</button>`)
          .join('')}</div>`;
      }
    } else {
      body += noteHtml(names[0]);
    }
    b.keys.forEach((k) => {
      const it = c.items[k];
      const def = exDef(it.name);
      if (!hasVariations(def)) return;
      const opts = def.variations.map((v) => v.name);
      if (it.variation && !opts.includes(it.variation)) opts.push(it.variation);
      body += `<label class="var-row"><span>${sup ? esc(it.name) + ' ' : ''}${esc((def.label || 'Type').toLowerCase())}</span><select data-var="${k}">${opts
        .map((o) => `<option ${o === it.variation ? 'selected' : ''}>${esc(o)}</option>`)
        .join('')}<option value="__other">Other…</option></select></label>`;
    });
    const lines = b.keys.map((k) => lastLine(k, sup) || '<span class="muted">No history yet</span>').join('<br>');
    body += `<div class="last small">${lines}</div>`;
    if (sup) {
      const rounds = Math.max(0, ...b.keys.map((k) => c.items[k].sets.length));
      for (let r = 0; r < rounds; r++) {
        body += `<div class="round-label muted small">Round ${r + 1}</div>`;
        b.keys.forEach((k) => {
          if (c.items[k].sets[r]) body += setRowHtml(k, r, c.items[k].name);
        });
      }
    } else {
      const k = b.keys[0];
      const def = itemDef(k);
      if (def.bodyweight) body += '<div class="set-head bw"><span></span><span>Type</span><span>kg / band</span><span>Reps</span><span></span></div>';
      else if (oneArm(k)) body += '<div class="set-head onearm"><span></span><span>kg</span><span>Left</span><span>Right</span><span></span></div>';
      else body += '<div class="set-head normal"><span></span><span>kg</span><span>Reps</span><span></span></div>';
      c.items[k].sets.forEach((s, i) => (body += setRowHtml(k, i)));
    }
    body += `<div class="card-actions">
        <button class="btn small" data-action="add-set" data-block="${b.id}">+ ${sup ? 'Add round' : 'Add set'}</button>
        <button class="btn small ghost" data-action="remove-set" data-block="${b.id}">Remove last</button>
        <button class="btn small ghost danger" data-action="remove-block" data-block="${b.id}">Remove exercise</button>
      </div>`;
    return `<section class="card open" id="b-${b.id}">${head}<div class="card-body">${body}</div></section>`;
  }

  function setRowHtml(k, i, label) {
    const it = S.current.items[k];
    const def = exDef(it.name);
    const s = it.sets[i];
    const arm = oneArm(k);
    const ph = placeholder(k, i);
    const a = `data-k="${k}" data-i="${i}"`;
    const input = (f, v, p, mode, aria, need) =>
      `<input class="${need ? 'need' : ''}" data-f="${f}" ${a} value="${esc(v)}" placeholder="${p == null ? '' : esc(fmt(p))}" inputmode="${mode}" autocomplete="off" aria-label="${aria}">`;
    const type = def.bodyweight ? 'bw' : arm ? 'onearm' : 'normal';
    const state = s.end ? ' done' : s.start ? ' running' : '';
    let h = `<div class="set-row ${type}${label ? ' labeled' : ''}${state}">`;
    h += `<span class="set-no">${label ? esc(label) : setNo(k, i)}</span>`;
    if (def.bodyweight) {
      h += `<select data-f="mode" ${a} aria-label="Set type">${[
        ['Bodyweight', 'BW'],
        ['Weighted', '+kg'],
        ['Band', 'Band'],
      ]
        .map(([v, t]) => `<option value="${v}" ${s.mode === v ? 'selected' : ''}>${t}</option>`)
        .join('')}</select>`;
      if (s.mode === 'Weighted') h += input('kg', s.kg, ph.kg, 'decimal', 'Added kg');
      else if (s.mode === 'Band')
        h += `<input data-f="band" ${a} value="${esc(s.band)}" placeholder="Purple" autocomplete="off" autocapitalize="words" aria-label="Band">`;
      else h += '<span class="dash">—</span>';
    } else {
      h += input('kg', s.kg, ph.kg, 'decimal', 'kg');
    }
    h += input('reps', s.reps, ph.reps, 'numeric', arm ? 'Left reps' : 'Reps', s.end && num(s.reps) == null);
    if (arm) h += input('repsR', s.repsR, ph.repsR, 'numeric', 'Right reps', s.end && num(s.repsR) == null);
    if (s.end) h += `<button class="sbtn done" data-action="set-btn" ${a} aria-label="Done. Tap twice to undo">${ICON.check}</button>`;
    else if (s.start) h += `<button class="sbtn run" data-action="set-btn" ${a}><span>End</span><span class="rt" id="rt-${s.id}"></span></button>`;
    else h += `<button class="sbtn" data-action="set-btn" ${a}>Start</button>`;
    h += '</div>';
    (s.drops || []).forEach((d, j) => (h += dropRowHtml(k, i, j, label)));
    h += footerHtml(k, i, label);
    return h;
  }

  function dropRowHtml(k, i, j, label) {
    const s = S.current.items[k].sets[i];
    const d = s.drops[j];
    const arm = oneArm(k);
    const ph = dropPlaceholder(k, i, j);
    const a = `data-k="${k}" data-i="${i}" data-d="${j}"`;
    const input = (f, v, p, mode, aria) =>
      `<input data-f="${f}" ${a} value="${esc(v)}" placeholder="${p == null ? '' : esc(fmt(p))}" inputmode="${mode}" autocomplete="off" aria-label="${aria}">`;
    let h = `<div class="drop-row ${arm ? 'onearm' : 'normal'}${label ? ' labeled' : ''}${s.end ? ' done' : ''}">`;
    h += '<span class="drop-mark" aria-hidden="true">↳</span>';
    h += input('kg', d.kg, ph.kg, 'decimal', `Drop ${j + 1} kg`);
    h += input('reps', d.reps, ph.reps, 'numeric', arm ? `Drop ${j + 1} left reps` : `Drop ${j + 1} reps`);
    if (arm) h += input('repsR', d.repsR, ph.repsR, 'numeric', `Drop ${j + 1} right reps`);
    h += `<button class="drop-x" data-action="drop-remove" ${a} aria-label="Remove drop ${j + 1}">✕</button></div>`;
    return h;
  }

  /** The line under a set: progress vs last time, set and rest times, and "+ drop". */
  function footerHtml(k, i, label) {
    const it = S.current.items[k];
    const s = it.sets[i];
    let inner = '';
    if (s.end) {
      const m = compareSet(k, i);
      const one = (x, side) =>
        x
          ? `<span class="mk ${x.dir > 0 ? 'up' : x.dir < 0 ? 'down' : 'same'}">${side}${x.dir > 0 ? '▲' : x.dir < 0 ? '▼' : '='} ${esc(x.text)}</span>`
          : '';
      inner += m ? (m.one ? one(m.one, '') : one(m.L, 'L ') + one(m.R, 'R ')) : '';
      const bits = [];
      if (s.start) bits.push(`set ${clock((new Date(s.end) - new Date(s.start)) / 1000)}`);
      if (s.rest != null) bits.push(`rest ${clock(s.rest)}`);
      if (bits.length) inner += `<span class="muted">${bits.join(' · ')}</span>`;
    }
    const isLast = i === it.sets.length - 1;
    if (canDrop(k) && (s.start || s.end || isLast || s.drops.length)) {
      inner += `<button class="link drop-add" data-action="drop-add" data-k="${k}" data-i="${i}">+ drop</button>`;
    }
    return inner ? `<div class="markers${label ? ' indent' : ''}">${inner}</div>` : '';
  }

  function finishModal() {
    const st = sessionStats();
    let ups = 0;
    forEachSet((k, i, s) => {
      if (!s.end) return;
      const m = compareSet(k, i);
      if (m && [m.one, m.L, m.R].some((x) => x && x.dir > 0)) ups++;
    });
    const mins = st.first ? Math.max(1, Math.round((st.last - st.first) / 60000)) : 0;
    const run = runningSet();
    return `<div class="modal-back" data-action="modal-close-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Finish ${esc(S.current.day)}?</h2>
      <div class="stats">
        <div><b>${mins}</b><span>minutes</span></div>
        <div><b>${st.sets}</b><span>sets</span></div>
        <div><b>${ups}</b><span>beat last time</span></div>
        <div><b>${st.avgRest != null ? clock(st.avgRest) : '–'}</b><span>average rest</span></div>
      </div>
      ${run ? '<p class="muted small">The set that’s running will be ended now.</p>' : ''}
      ${st.sets || run ? '' : '<p class="muted">No sets finished, so nothing will be saved.</p>'}
      <button class="btn primary wide" data-action="save-finish">${st.sets || run ? 'Save workout' : 'Close workout'}</button>
      <button class="btn wide" data-action="modal-close">Keep going</button>
      ${st.sets ? '<button class="btn ghost danger wide" data-action="discard">Discard workout</button>' : ''}
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
      .map(
        (n) =>
          `<button class="result" data-action="add-ex" data-name="${esc(n)}">${esc(n)}${inWorkout.has(n) ? ' <span class="muted small">· add again</span>' : ''}</button>`
      )
      .join('');
    if (!names.some((n) => n.toLowerCase() === q.toLowerCase())) {
      h += `<button class="result create" data-action="create-ex" data-name="${esc(q)}">Create new exercise “${esc(q)}”</button>`;
    }
    return h;
  }

  // Exercises tab: notes, progress chart and history for one exercise
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
      return {
        value: Math.round(best * 10) / 10,
        label: 'Estimated 1-rep max (kg)',
        hint: 'Worked out from your best set, so it rises when either the weight or the reps go up.',
      };
    }
    return {
      value: entries.reduce((a, e) => a + (e.reps || 0) + (e.repsR || 0), 0),
      label: 'Total reps per session',
      hint: 'All reps across the session added together.',
    };
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
      ${recent.length ? `<optgroup label="Recently trained">${recent.slice(0, 12).map(opt).join('')}</optgroup>` : ''}
      <optgroup label="All exercises">${all.filter((n) => !recent.slice(0, 12).includes(n)).map(opt).join('')}</optgroup></select>`;
    h += `<section class="panel"><h2>Notes</h2>${noteHtml(P.name)}${
      def.bodyweight
        ? ''
        : `<label class="check"><input type="checkbox" data-exflag="dropLast" data-name="${esc(P.name)}" ${def.dropLast ? 'checked' : ''}> Drop set on the last set every time</label>`
    }</section>`;
    const vs = [...new Set((def.variations || []).map((v) => v.name).concat(historyFor(P.name, '').flatMap((s) => s.entries.map((e) => e.variation))).filter(Boolean))];
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

  // Settings
  function settingsView() {
    const restOpts = [60, 90, 120, 150, 180, 240, 300]
      .map((v) => `<option value="${v}" ${S.settings.restSec === v ? 'selected' : ''}>${clock(v)}</option>`)
      .join('');
    const dayLists = DAYS.map((d) => {
      const list = S.library.days[d];
      const total = list.reduce((a, it) => a + it.sets * it.names.length, 0);
      const items = list
        .map((it, i) => {
          const label = it.names.join(' + ');
          const unit = it.names.length > 1 ? 'rounds' : 'sets';
          const at = `data-day="${d}" data-idx="${i}"`;
          return `<li><span class="lib-name">${esc(label)}</span>
            <span class="stepper"><button class="icon-btn" data-action="lib-sets" ${at} data-delta="-1" aria-label="Fewer ${unit}">−</button><b title="${unit}">${it.sets}</b><button class="icon-btn" data-action="lib-sets" ${at} data-delta="1" aria-label="More ${unit}">+</button></span>
            <button class="icon-btn" data-action="lib-move" ${at} data-delta="-1" aria-label="Move ${esc(label)} up">↑</button>
            <button class="icon-btn" data-action="lib-move" ${at} data-delta="1" aria-label="Move ${esc(label)} down">↓</button>
            <button class="icon-btn" data-action="lib-remove" ${at} aria-label="Remove ${esc(label)} from ${d}">✕</button></li>`;
        })
        .join('');
      return `<h3>${d} · ${total} sets</h3><ul class="lib-list">${items}</ul>
        <select data-addday="${d}" aria-label="Add an exercise to ${d}"><option value="">Add to ${d}…</option>${allExerciseNames()
          .map((n) => `<option>${esc(n)}</option>`)
          .join('')}</select>`;
    }).join('');
    return `<header class="top"><h1>Settings</h1></header>
      <section class="panel">
        <h2>Your sheet</h2>
        <div class="syncline">${syncText()}</div>
        <div class="row-btns">
          <button class="btn small" data-action="sync-now">Sync now</button>
          <a class="btn small ghost" href="${esc(CFG.sheetUrl)}" target="_blank" rel="noopener">Open Training Log</a>
          <button class="btn small ghost" data-action="forget-pass">Change passphrase</button>
        </div>
      </section>
      <section class="panel">
        <h2>Rest timer</h2>
        <label class="field">Target rest<select data-setting="restSec">${restOpts}</select></label>
        <label class="check"><input type="checkbox" data-setting="sound" ${S.settings.sound ? 'checked' : ''}> Beep when the target is reached</label>
        <label class="check"><input type="checkbox" data-setting="keepAwake" ${S.settings.keepAwake ? 'checked' : ''}> Keep the screen on during a workout</label>
        <p class="muted small">Your phone can't beep while it's locked or showing another app, so keeping the screen on is what makes the beep work. Your actual rest is always recorded, from the end of one set to the start of the next.</p>
        <button class="btn small" data-action="test-sound">Test the beep</button>
      </section>
      <section class="panel">
        <h2>Your split</h2>
        <p class="muted small">The order here is the order exercises load in, and the number is how many sets (rounds for a superset). Changes stay on this device.</p>
        ${dayLists}
      </section>
      <section class="panel">
        <h2>New exercise</h2>
        <label class="field">Name<input id="new-name" placeholder="Cable Fly" autocomplete="off"></label>
        <label class="check"><input type="checkbox" id="new-onearm"> One arm (log left and right reps)</label>
        <label class="check"><input type="checkbox" id="new-bw"> Bodyweight (BW, +kg or band)</label>
        <label class="check"><input type="checkbox" id="new-drop"> Drop set on the last set every time</label>
        <label class="field">Types or attachments (optional, separated by commas)<input id="new-var" placeholder="Rope, Straight bar" autocomplete="off"></label>
        <label class="field">Add to day<select id="new-day"><option value="">No day</option>${DAYS.map((d) => `<option>${d}</option>`).join('')}</select></label>
        <p id="new-err" class="err-text" role="alert"></p>
        <button class="btn primary" data-action="lib-new">Add exercise</button>
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
      toast('Connected to your sheet');
      refreshHistory(true);
    } catch (e) {
      err.textContent =
        e.code === 'wrong_passphrase'
          ? "That passphrase doesn't match the one in your sheet. Try again."
          : "Couldn't reach your sheet. Check your connection and try again.";
      btn.disabled = false;
      btn.textContent = 'Connect';
    }
  }

  const ACTIONS = {
    tab(el) {
      S.tab = el.dataset.tab;
      S.editingNote = null;
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
    'add-set'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const target = Math.max(...b.keys.map((k) => c.items[k].sets.length)) + 1;
      b.keys.forEach((k) => {
        const sets = c.items[k].sets;
        const before = sets.length;
        while (sets.length < target) sets.push(newSet(k, sets.length));
        // The drop set belongs on the last set: move empty drop rows down to the new one.
        const prev = sets[before - 1];
        if (exDef(c.items[k].name).dropLast && prev && prev.drops.length && dropUntouched(prev)) {
          sets[sets.length - 1].drops = prev.drops;
          prev.drops = [];
        }
      });
      requeueNames(b.keys.map((k) => c.items[k].name));
      persist();
      render();
      scheduleSync();
    },
    'remove-set'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const max = Math.max(...b.keys.map((k) => c.items[k].sets.length));
      if (!max) return;
      b.keys.forEach((k) => {
        const sets = c.items[k].sets;
        if (sets.length === max) {
          const s = sets.pop();
          if (s.end) unqueueRows(rowIds(k, s));
          if (sets.length && dropUntouched(sets[sets.length - 1])) addDefaultDrops(k);
        }
      });
      requeueNames(b.keys.map((k) => c.items[k].name));
      queueSession();
      persist();
      render();
      scheduleSync();
    },
    'remove-block'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const hasDone = b.keys.some((k) => c.items[k].sets.some((s) => s.start || s.end));
      if (hasDone && !armed(el, 'Tap again to remove')) return;
      const names = b.keys.map((k) => c.items[k].name);
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
      if (d) unqueueRows(sideIds(k, dropBase(s, d)));
      if (s.end) syncSetRows(k, i);
      persist();
      render();
      scheduleSync();
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
      if (!armed(el, 'Tap again to discard all sets')) return;
      discardWorkout();
    },
    'add-ex'(el) {
      const b = addBlock([el.dataset.name], null);
      persist();
      render();
      const card = document.getElementById('b-' + b.id);
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    'create-ex'(el) {
      const name = el.dataset.name.trim();
      if (!S.library.exercises.some((e) => e.name.toLowerCase() === name.toLowerCase())) {
        S.library.exercises.push({ name });
        saveLibrary();
        toast(`Created ${name}. You can make it one-arm or add types in Settings.`);
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
      if (!armed(el, 'Tap again to re-enter it')) return;
      S.settings.pass = '';
      saveSettings();
      render();
    },
    'test-sound'() {
      unlockAudio();
      const was = S.settings.sound;
      S.settings.sound = true;
      beep();
      S.settings.sound = was;
    },
    pv(el) {
      S.page.variation = el.dataset.v;
      render();
    },
    'lib-move'(el) {
      const list = S.library.days[el.dataset.day];
      const i = +el.dataset.idx;
      const j = i + +el.dataset.delta;
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]];
      saveLibrary();
      render();
    },
    'lib-sets'(el) {
      const it = S.library.days[el.dataset.day][+el.dataset.idx];
      it.sets = Math.max(1, Math.min(20, it.sets + +el.dataset.delta));
      saveLibrary();
      render();
    },
    'lib-remove'(el) {
      S.library.days[el.dataset.day].splice(+el.dataset.idx, 1);
      saveLibrary();
      render();
    },
    'lib-new'() {
      const name = $('#new-name').value.trim();
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
      if ($('#new-drop').checked && !ex.bodyweight) ex.dropLast = true;
      const vars = $('#new-var')
        .value.split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (vars.length) {
        ex.variations = vars.map((n) => ({ name: n }));
        ex.label = 'Type';
      }
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
    if (!el) return;
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
    if (!f || f === 'mode' || !S.current) return;
    const k = el.dataset.k;
    const i = +el.dataset.i;
    const it = S.current.items[k];
    const s = it && it.sets[i];
    if (!s) return;
    if (el.dataset.d != null) {
      const j = +el.dataset.d;
      const d = s.drops[j];
      if (!d) return;
      d[f] = el.value;
      // Typing a drop's reps with no weight entered takes the weight hint.
      if (f !== 'kg' && el.value && d.kg === '') {
        const ph = dropPlaceholder(k, i, j);
        if (ph.kg != null) {
          d.kg = fmt(ph.kg);
          const kgEl = el.parentElement.querySelector('[data-f="kg"]');
          if (kgEl) kgEl.value = d.kg;
        }
      }
    } else {
      s[f] = el.value;
    }
    if (el.value) el.classList.remove('need');
    persist();
    if (s.end) requeueSoon(k, i);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.f === 'mode' && S.current) {
      const k = el.dataset.k;
      const i = +el.dataset.i;
      const s = S.current.items[k].sets[i];
      s.mode = el.value;
      if (s.mode === 'Band' && !s.band) s.band = 'Purple';
      persist();
      if (s.end) {
        syncSetRows(k, i);
        scheduleSync();
      }
      render();
    } else if (el.dataset.var && S.current) {
      const k = el.dataset.var;
      const it = S.current.items[k];
      let v = el.value;
      if (v === '__other') {
        v = (window.prompt('Name of the type or attachment') || '').trim();
        if (!v) {
          render();
          return;
        }
        const def = exDef(it.name);
        if (!varDef(def, v)) {
          def.variations = (def.variations || []).concat({ name: v });
          saveLibrary();
        }
      }
      const doneIdx = it.sets.map((s, i) => (s.end ? i : -1)).filter((i) => i >= 0);
      unqueueRows(doneIdx.reduce((a, i) => a.concat(rowIds(k, it.sets[i])), []));
      it.variation = v;
      doneIdx.forEach((i) => syncSetRows(k, i));
      persist();
      invalidate();
      render();
      scheduleSync();
    } else if (el.dataset.setting) {
      const key = el.dataset.setting;
      S.settings[key] = el.type === 'checkbox' ? el.checked : +el.value;
      saveSettings();
      if (key === 'keepAwake') keepAwake(!!S.current);
    } else if (el.dataset.addday) {
      if (!el.value) return;
      S.library.days[el.dataset.addday].push({ names: [el.value], sets: 3 });
      saveLibrary();
      render();
    } else if (el.dataset.exflag) {
      const name = el.dataset.name;
      let def = S.library.exercises.find((x) => x.name === name);
      if (!def) S.library.exercises.push((def = { name }));
      def[el.dataset.exflag] = el.checked;
      saveLibrary();
      toast(el.checked ? `${name} will start with a drop set on its last set` : `${name} won't add a drop set by default`);
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
