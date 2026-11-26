/* Training Tracker. Plain JavaScript, no build step. */
'use strict';
(function () {
  const CFG = window.TT_CONFIG;
  const DEF = window.TT_DEFAULTS;
  const DAYS = ['Push', 'Pull', 'Legs', 'Shoulders'];
  const VERSION = '1.0.0';
  const KEYS = { settings: 'tt.settings', library: 'tt.library', current: 'tt.current', pending: 'tt.pending' };

  const ICON = {
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    lift: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6M6.5 6.5v11M17.5 6.5v11M21 9v6M6.5 12h11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19h16M6 15.5l4-5 3 3 5-6.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  };

  // ---------- Small helpers ----------
  const $ = (sel) => document.querySelector(sel);
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const hm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
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
  const S = {
    settings: Object.assign({ pass: '', restSec: 120, sound: true, keepAwake: true }, load(KEYS.settings, {})),
    library: loadLibrary(),
    current: load(KEYS.current, null),
    pending: Object.assign({ sets: {}, deleteSets: [], sessions: {}, deleteSessions: [] }, load(KEYS.pending, {})),
    history: { sets: [], sessions: [] },
    tab: 'workout',
    modal: null,
    sync: 'idle',
    progress: { name: null, variation: '' },
  };

  function loadLibrary() {
    const lib = load(KEYS.library, null) || { exercises: [], days: {} };
    const have = new Set(lib.exercises.map((e) => e.name));
    DEF.exercises.forEach((e) => {
      if (!have.has(e.name)) lib.exercises.push(JSON.parse(JSON.stringify(e)));
    });
    DAYS.forEach((d) => {
      if (!Array.isArray(lib.days[d])) lib.days[d] = JSON.parse(JSON.stringify(DEF.days[d] || []));
    });
    store(KEYS.library, lib);
    return lib;
  }

  const persist = () => store(KEYS.current, S.current);
  const savePending = () => store(KEYS.pending, S.pending);
  const saveSettings = () => store(KEYS.settings, S.settings);
  const saveLibrary = () => store(KEYS.library, S.library);
  const exDef = (name) => S.library.exercises.find((e) => e.name === name) || { name };
  const hasPending = () =>
    Object.keys(S.pending.sets).length + S.pending.deleteSets.length + Object.keys(S.pending.sessions).length + S.pending.deleteSessions.length;

  // ---------- History queries ----------
  let memoSets = null;
  const memoHist = new Map();
  function invalidate() {
    memoSets = null;
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

  /** Earlier sessions of one exercise, newest first, each with its sets grouped. */
  function historyFor(name, variation) {
    const cur = S.current ? S.current.session : '';
    const key = `${name}|${variation || ''}|${cur}`;
    if (memoHist.has(key)) return memoHist.get(key);
    const def = exDef(name);
    const by = new Map();
    allSets().forEach((r) => {
      if (r.Exercise !== name || r.Session === cur) return;
      if (variation && def.attachments && r.Variation !== variation) return;
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
  const lastFor = (name, variation) => historyFor(name, variation)[0] || null;

  /** Turns rows (one per side for one-arm exercises) into one entry per set. */
  function groupSets(rows) {
    const by = new Map();
    rows
      .slice()
      .sort((a, b) => num(a.Set) - num(b.Set))
      .forEach((r) => {
        const k = num(r.Set);
        const e = by.get(k) || { set: k, kg: num(r.kg), variation: r.Variation || '', reps: null, repsR: null };
        if (r.Side === 'R') e.repsR = num(r.Reps);
        else e.reps = num(r.Reps);
        if (e.kg == null) e.kg = num(r.kg);
        by.set(k, e);
      });
    return [...by.values()];
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
  function repsLabel(e, def) {
    const r = (x) => (x == null ? '–' : x);
    return def.oneArm ? `L${r(e.reps)}/R${r(e.repsR)}` : `${r(e.reps)}`;
  }
  function summary(entries, def) {
    if (!entries.length) return '';
    const ws = entries.map((e) => weightLabel(e, def));
    if (ws.every((w) => w === ws[0])) return `${ws[0] ? ws[0] + ' × ' : ''}${entries.map((e) => repsLabel(e, def)).join(', ')}`;
    return entries.map((e, i) => `${ws[i] ? ws[i] + ' × ' : ''}${repsLabel(e, def)}`).join(', ');
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
  function variationOf(def, ex, s) {
    if (!def.bodyweight) return ex.variation || '';
    if (s.mode === 'Weighted') return 'Weighted';
    if (s.mode === 'Band') return 'Band: ' + (cap((s.band || '').trim()) || 'Purple');
    return 'Bodyweight';
  }
  const lastOf = (n) => {
    const def = exDef(n);
    return lastFor(n, def.attachments ? S.current.ex[n].variation : '');
  };

  function newSet(name, i) {
    const def = exDef(name);
    const s = { id: uid(), kg: '', reps: '', repsR: '', mode: 'Bodyweight', band: 'Purple', done: false, at: null };
    if (def.bodyweight) {
      const last = lastFor(name, '');
      const p = last && (last.entries[i] || last.entries[last.entries.length - 1]);
      if (p) {
        const v = p.variation || 'Bodyweight';
        s.mode = v === 'Weighted' ? 'Weighted' : v.indexOf('Band') === 0 ? 'Band' : 'Bodyweight';
        if (s.mode === 'Band') s.band = v.replace(/^Band:?\s*/, '') || 'Purple';
      }
    }
    return s;
  }

  function newEx(name) {
    const def = exDef(name);
    let variation = '';
    if (def.attachments) {
      const recent = historyFor(name, '')[0];
      const used = recent && recent.entries.length ? recent.entries[0].variation : '';
      variation = def.attachments.includes(used) ? used : def.attachments[0];
    }
    const last = lastFor(name, variation);
    const count = Math.max(1, Math.min(last ? last.entries.length : 3, 8));
    const ex = { variation, sets: [] };
    for (let i = 0; i < count; i++) ex.sets.push(newSet(name, i));
    return ex;
  }

  function startWorkout(day) {
    const now = new Date();
    S.current = {
      session: `${ymd(now)}-${pad(now.getHours())}${pad(now.getMinutes())}`,
      day: day === 'Other' ? 'Workout' : day,
      created: now.toISOString(),
      start: null,
      blocks: [],
      ex: {},
      open: null,
      restEnd: null,
      restTotal: S.settings.restSec,
      restBeeped: true,
    };
    invalidate();
    (S.library.days[day] || []).forEach((it) => addBlock(Array.isArray(it) ? it : [it], false));
    S.current.open = S.current.blocks.length ? S.current.blocks[0].id : null;
    S.tab = 'workout';
    persist();
    unlockAudio();
    keepAwake(true);
    render();
    window.scrollTo(0, 0);
  }

  function addBlock(names, open = true) {
    const c = S.current;
    const existing = c.blocks.find((b) => names.every((n) => b.names.includes(n)));
    if (existing) {
      if (open) c.open = existing.id;
      return existing;
    }
    names.forEach((n) => {
      if (!c.ex[n]) c.ex[n] = newEx(n);
    });
    const b = { id: uid(), names };
    c.blocks.push(b);
    if (open) c.open = b.id;
    return b;
  }

  function placeholder(n, i) {
    const def = exDef(n);
    const ex = S.current.ex[n];
    const last = lastOf(n);
    const p = last ? last.entries[i] || null : null;
    let kg = null;
    for (let j = i - 1; j >= 0 && kg == null; j--) {
      const prev = ex.sets[j];
      if (!def.bodyweight || prev.mode === 'Weighted') kg = num(prev.kg);
    }
    if (kg == null && p && (!def.bodyweight || p.variation === 'Weighted')) kg = p.kg;
    if (kg == null && last && !def.bodyweight && last.entries.length) kg = last.entries[last.entries.length - 1].kg;
    return { kg, reps: p ? p.reps : null, repsR: p ? p.repsR : null };
  }

  function compareSet(n, i) {
    const def = exDef(n);
    const ex = S.current.ex[n];
    const s = ex.sets[i];
    const last = lastOf(n);
    const p = last && last.entries[i];
    if (!p) return null;
    if (def.bodyweight && variationOf(def, ex, s) !== (p.variation || 'Bodyweight')) return null;
    const kg = def.bodyweight && s.mode !== 'Weighted' ? null : num(s.kg);
    if (def.oneArm) return { L: cmp(kg, num(s.reps), p.kg, p.reps), R: cmp(kg, num(s.repsR), p.kg, p.repsR) };
    return { one: cmp(kg, num(s.reps), p.kg, p.reps) };
  }

  const rowIds = (n, s) => (exDef(n).oneArm ? [s.id + '-L', s.id + '-R'] : [s.id]);

  function rowsFor(n, i) {
    const c = S.current;
    const def = exDef(n);
    const ex = c.ex[n];
    const s = ex.sets[i];
    const at = new Date(s.at);
    let kg = num(s.kg);
    if (def.bodyweight && s.mode !== 'Weighted') kg = null;
    const base = {
      Date: ymd(at),
      Time: hm(at),
      Day: c.day,
      Exercise: n,
      Variation: variationOf(def, ex, s),
      Set: i + 1,
      kg: kg == null ? '' : kg,
      Session: c.session,
    };
    if (def.oneArm) {
      return [
        Object.assign({}, base, { Side: 'L', Reps: num(s.reps), ID: s.id + '-L' }),
        Object.assign({}, base, { Side: 'R', Reps: num(s.repsR), ID: s.id + '-R' }),
      ];
    }
    return [Object.assign({}, base, { Side: '', Reps: num(s.reps), ID: s.id })];
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
  function queueSession(end) {
    const c = S.current;
    const st = new Date(c.start || c.created);
    const row = { Session: c.session, Date: ymd(st), Day: c.day, Start: hm(st) };
    if (end) {
      row.End = hm(end);
      row['Length (min)'] = Math.max(1, Math.round((end - st) / 60000));
    }
    S.pending.sessions[c.session] = row;
    S.pending.deleteSessions = S.pending.deleteSessions.filter((x) => x !== c.session);
    savePending();
  }
  function dropSession(id) {
    delete S.pending.sessions[id];
    if (!S.pending.deleteSessions.includes(id)) S.pending.deleteSessions.push(id);
    savePending();
  }

  const requeueTimers = {};
  function requeueSoon(n, i) {
    const key = n + '|' + i;
    clearTimeout(requeueTimers[key]);
    requeueTimers[key] = setTimeout(() => {
      const s = S.current && S.current.ex[n] && S.current.ex[n].sets[i];
      if (s && s.done) {
        queueRows(rowsFor(n, i));
        scheduleSync();
      }
    }, 800);
  }

  function tick(n, i, btn) {
    const c = S.current;
    const def = exDef(n);
    const s = c.ex[n].sets[i];
    unlockAudio();
    if (s.done) {
      s.done = false;
      s.at = null;
      unqueueRows(rowIds(n, s));
      persist();
      render();
      scheduleSync();
      return;
    }
    const ph = placeholder(n, i);
    if (s.kg === '' && (!def.bodyweight || s.mode === 'Weighted') && ph.kg != null) s.kg = fmt(ph.kg);
    if (s.mode === 'Band' && !s.band.trim()) s.band = 'Purple';
    const row = btn.closest('.set-row');
    const missing = [];
    if (num(s.reps) == null) missing.push('reps');
    if (def.oneArm && num(s.repsR) == null) missing.push('repsR');
    if (missing.length) {
      missing.forEach((f) => {
        const el = row && row.querySelector(`[data-f="${f}"]`);
        if (el) el.classList.add('err');
      });
      const first = row && row.querySelector(`[data-f="${missing[0]}"]`);
      if (first) first.focus();
      toast(def.oneArm ? 'Enter left and right reps first' : 'Enter reps first');
      return;
    }
    s.done = true;
    s.at = new Date().toISOString();
    if (!c.start) c.start = s.at;
    queueRows(rowsFor(n, i));
    queueSession();
    const block = c.blocks.find((b) => b.names.includes(n));
    if (!block || block.names[block.names.length - 1] === n) startRest();
    persist();
    render();
    scheduleSync();
  }

  function startRest() {
    const c = S.current;
    c.restTotal = S.settings.restSec;
    c.restEnd = Date.now() + c.restTotal * 1000;
    c.restBeeped = false;
  }

  function saveFinish() {
    const c = S.current;
    const any = c.blocks.some((b) => b.names.some((n) => c.ex[n].sets.some((s) => s.done)));
    if (any) {
      queueSession(new Date());
      toast('Workout saved');
    } else {
      dropSession(c.session);
    }
    closeWorkout();
  }
  function discardWorkout() {
    const c = S.current;
    Object.keys(c.ex).forEach((n) => c.ex[n].sets.forEach((s) => s.done && unqueueRows(rowIds(n, s))));
    dropSession(c.session);
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
    const deleteSets = p.deleteSets.slice();
    const deleteSessions = p.deleteSessions.slice();
    if (!sets.length && !sessions.length && !deleteSets.length && !deleteSessions.length) {
      setSync('idle');
      return;
    }
    if (!navigator.onLine) {
      setSync('offline');
      return;
    }
    setSync('syncing');
    try {
      await api('sync', { sets, sessions, deleteSets, deleteSessions });
      sets.forEach((r) => {
        if (p.sets[r.ID] === r) delete p.sets[r.ID];
        upsertLocal(S.history.sets, 'ID', parseSetRow(r));
      });
      sessions.forEach((r) => {
        if (p.sessions[r.Session] === r) delete p.sessions[r.Session];
        upsertLocal(S.history.sessions, 'Session', r);
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
      const toObjects = (t) => t.rows.map((r) => Object.fromEntries(t.headers.map((h, i) => [h, r[i]])));
      S.history = {
        sets: toObjects(d.sets).filter((r) => r.ID).map(parseSetRow),
        sessions: toObjects(d.sessions).filter((r) => r.Session),
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
    return !!a && (a.tagName === 'INPUT' || a.tagName === 'SELECT');
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

  function tickClock() {
    const c = S.current;
    const w = $('#wclock');
    if (w && c) w.textContent = c.start ? clock((Date.now() - new Date(c.start)) / 1000) : 'not started';
    const rest = $('#rest');
    if (!rest || !c) return;
    if (!c.restEnd) {
      rest.hidden = true;
      return;
    }
    const left = (c.restEnd - Date.now()) / 1000;
    rest.hidden = false;
    if (left > 0) {
      rest.classList.remove('over');
      $('#resttext').textContent = `Rest ${clock(Math.ceil(left))}`;
      $('#restbar').style.width = `${Math.min(100, 100 * (1 - left / c.restTotal))}%`;
    } else {
      if (!c.restBeeped) {
        c.restBeeped = true;
        persist();
        if (left > -5) beep();
      }
      rest.classList.add('over');
      $('#resttext').textContent = 'Rest over';
      $('#restbar').style.width = '100%';
      if (left < -20) {
        c.restEnd = null;
        persist();
        rest.hidden = true;
      }
    }
  }

  // ---------- Views ----------
  function render() {
    const app = $('#app');
    let html;
    if (!S.settings.pass) html = connectView();
    else if (S.tab === 'progress') html = progressView();
    else if (S.tab === 'settings') html = settingsView();
    else html = S.current ? workoutView() : startView();
    app.innerHTML = html;
    const tabs = $('#tabs');
    tabs.hidden = !S.settings.pass;
    tabs.innerHTML = S.settings.pass ? tabsHtml() : '';
    tickClock();
  }

  function tabsHtml() {
    const t = (id, icon, label) =>
      `<button class="${S.tab === id ? 'on' : ''}" data-action="tab" data-tab="${id}" aria-current="${S.tab === id ? 'page' : 'false'}">${icon}<span>${label}</span></button>`;
    return t('workout', ICON.lift, S.current ? 'Workout ●' : 'Workout') + t('progress', ICON.chart, 'Progress') + t('settings', ICON.gear, 'Settings');
  }

  function connectView() {
    return `<div class="connect">
      <div class="logo">${ICON.lift}</div>
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
    const lens = {};
    S.history.sessions.concat(Object.values(S.pending.sessions)).forEach((r) => (lens[r.Session] = num(r['Length (min)'])));
    return [...by.values()]
      .map((s) => Object.assign(s, { length: lens[s.session] || null }))
      .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
  }

  function startView() {
    const sessions = recentSessions();
    const lastByDay = {};
    sessions.forEach((s) => {
      if (!lastByDay[s.day]) lastByDay[s.day] = s.date;
    });
    const days = DAYS.map(
      (d) => `<button class="day" data-action="start" data-day="${d}">
        <span class="day-name">${d}</span>
        <span class="muted small">${lastByDay[d] ? 'Last ' + esc(daysAgo(lastByDay[d])) : 'Not done yet'}</span>
      </button>`
    ).join('');
    const recent = sessions.slice(0, 8).map(
      (s) => `<li><div class="li-main"><span>${esc(niceDate(s.date))}</span><span>${esc(s.day)}</span></div>
        <div class="muted small">${s.sets} sets${s.length ? ` · ${s.length} min` : ''}</div></li>`
    ).join('');
    return `<header class="top"><div><h1>Start a workout</h1><div class="syncline">${syncText()}</div></div></header>
      <div class="day-grid">${days}</div>
      <button class="btn wide" data-action="start" data-day="Other">Empty workout</button>
      ${recent ? `<h2>Recent workouts</h2><ul class="list">${recent}</ul>` : ''}`;
  }

  function workoutView() {
    const c = S.current;
    let done = 0;
    let total = 0;
    c.blocks.forEach((b) =>
      b.names.forEach((n) => {
        total += c.ex[n].sets.length;
        done += c.ex[n].sets.filter((s) => s.done).length;
      })
    );
    return `<div class="sticky">
        <header class="top">
          <div><h1>${esc(c.day)}</h1><div class="sub"><span id="wclock"></span> · ${done}/${total} sets</div></div>
          <button class="btn primary" data-action="finish">Finish</button>
        </header>
        <div id="rest" class="rest" hidden>
          <div class="rest-info"><div id="resttext"></div><div class="bar"><div id="restbar"></div></div></div>
          <button class="btn small" data-action="rest-add">+30s</button>
          <button class="btn small" data-action="rest-skip">Skip</button>
        </div>
      </div>
      ${c.blocks.map(blockHtml).join('')}
      <div class="add-ex">
        <input id="exsearch" type="search" placeholder="Add an exercise" autocomplete="off" autocorrect="off" enterkeyhint="search" aria-label="Add an exercise">
        <div id="exresults" class="results"></div>
      </div>
      <p class="syncline center">${syncText()}</p>
      ${S.modal === 'finish' ? finishModal() : ''}`;
  }

  function lastLine(n, prefix) {
    const last = lastOf(n);
    const label = prefix ? `${esc(n)}: ` : '';
    if (!last) return prefix ? `${label}<span class="muted">no history yet</span>` : '';
    return `${label}Last time (${esc(daysAgo(last.date))}): ${esc(summary(last.entries, exDef(n)))}`;
  }

  function blockHtml(b) {
    const c = S.current;
    const open = c.open === b.id;
    const sup = b.names.length > 1;
    let done = 0;
    let total = 0;
    b.names.forEach((n) => {
      total += c.ex[n].sets.length;
      done += c.ex[n].sets.filter((s) => s.done).length;
    });
    const head = `<button class="card-head" data-action="toggle" data-block="${b.id}" aria-expanded="${open}">
        <span class="card-title">${sup ? '<span class="tag">Superset</span>' : ''}<span>${esc(b.names.join(' + '))}</span></span>
        <span class="count ${total && done === total ? 'ok' : ''}">${done}/${total}</span>
      </button>`;
    if (!open) {
      const lines = b.names.map((n) => lastLine(n, sup)).filter(Boolean).join('<br>');
      return `<section class="card" id="b-${b.id}">${head}${lines ? `<div class="last muted small">${lines}</div>` : ''}</section>`;
    }
    let body = '';
    b.names.forEach((n) => {
      const def = exDef(n);
      if (def.attachments) {
        const opts = def.attachments.slice();
        const v = c.ex[n].variation;
        if (v && !opts.includes(v)) opts.push(v);
        body += `<label class="var-row"><span>${sup ? esc(n) + ' grip' : 'Attachment'}</span><select data-var="${esc(n)}">${opts
          .map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`)
          .join('')}<option value="__other">Other…</option></select></label>`;
      }
    });
    const lines = b.names.map((n) => lastLine(n, sup) || '<span class="muted">No history yet</span>').join('<br>');
    body += `<div class="last small">${lines}</div>`;
    if (sup) {
      const rounds = Math.max(0, ...b.names.map((n) => c.ex[n].sets.length));
      for (let r = 0; r < rounds; r++) {
        body += `<div class="round-label muted small">Round ${r + 1}</div>`;
        b.names.forEach((n) => {
          if (c.ex[n].sets[r]) body += setRowHtml(n, r, n);
        });
      }
    } else {
      const n = b.names[0];
      const def = exDef(n);
      if (!def.bodyweight) {
        body += def.oneArm
          ? '<div class="set-head onearm"><span></span><span>kg</span><span>Left reps</span><span>Right reps</span><span></span></div>'
          : '<div class="set-head normal"><span></span><span>kg</span><span>Reps</span><span></span></div>';
      } else {
        body += '<div class="set-head bw"><span></span><span>Type</span><span>kg / band</span><span>Reps</span><span></span></div>';
      }
      c.ex[n].sets.forEach((s, i) => (body += setRowHtml(n, i)));
    }
    body += `<div class="card-actions">
        <button class="btn small" data-action="add-set" data-block="${b.id}">+ ${sup ? 'Add round' : 'Add set'}</button>
        <button class="btn small ghost" data-action="remove-set" data-block="${b.id}">Remove last</button>
        <button class="btn small ghost danger" data-action="remove-block" data-block="${b.id}">Remove exercise</button>
      </div>`;
    return `<section class="card" id="b-${b.id}">${head}<div class="card-body">${body}</div></section>`;
  }

  function setRowHtml(n, i, label) {
    const def = exDef(n);
    const s = S.current.ex[n].sets[i];
    const ph = placeholder(n, i);
    const a = `data-ex="${esc(n)}" data-i="${i}"`;
    const input = (f, v, p, mode, aria) =>
      `<input data-f="${f}" ${a} value="${esc(v)}" placeholder="${p == null ? '' : esc(fmt(p))}" inputmode="${mode}" autocomplete="off" aria-label="${aria}">`;
    const type = def.bodyweight ? 'bw' : def.oneArm ? 'onearm' : 'normal';
    let h = `<div class="set-row ${type}${label ? ' labeled' : ''}${s.done ? ' done' : ''}">`;
    h += `<span class="set-no">${label ? esc(label) : i + 1}</span>`;
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
    h += input('reps', s.reps, ph.reps, 'numeric', def.oneArm ? 'Left reps' : 'Reps');
    if (def.oneArm) h += input('repsR', s.repsR, ph.repsR, 'numeric', 'Right reps');
    h += `<button class="tick ${s.done ? 'on' : ''}" data-action="tick" ${a} aria-label="${s.done ? 'Undo set' : 'Set done'}">${ICON.check}</button></div>`;
    if (s.done) h += markerHtml(n, i);
    return h;
  }

  function markerHtml(n, i) {
    const m = compareSet(n, i);
    if (!m) return '';
    const one = (x, side) =>
      x
        ? `<span class="mk ${x.dir > 0 ? 'up' : x.dir < 0 ? 'down' : 'same'}">${side}${x.dir > 0 ? '▲' : x.dir < 0 ? '▼' : '='} ${esc(x.text)}</span>`
        : '';
    const inner = m.one ? one(m.one, '') : one(m.L, 'L ') + one(m.R, 'R ');
    return inner ? `<div class="markers">${inner}<span class="muted">vs last time</span></div>` : '';
  }

  function finishModal() {
    const c = S.current;
    let sets = 0;
    let ups = 0;
    c.blocks.forEach((b) =>
      b.names.forEach((n) =>
        c.ex[n].sets.forEach((s, i) => {
          if (!s.done) return;
          sets++;
          const m = compareSet(n, i);
          if (m && [m.one, m.L, m.R].some((x) => x && x.dir > 0)) ups++;
        })
      )
    );
    const mins = c.start ? Math.max(1, Math.round((Date.now() - new Date(c.start)) / 60000)) : 0;
    return `<div class="modal-back" data-action="modal-close-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt">
      <h2 id="mt">Finish ${esc(c.day)}?</h2>
      <div class="stats">
        <div><b>${mins}</b><span>minutes</span></div>
        <div><b>${sets}</b><span>sets</span></div>
        <div><b>${ups}</b><span>beat last time</span></div>
      </div>
      ${sets ? '' : '<p class="muted">No sets ticked off, so nothing will be saved.</p>'}
      <button class="btn primary wide" data-action="save-finish">${sets ? 'Save workout' : 'Close workout'}</button>
      <button class="btn wide" data-action="modal-close">Keep going</button>
      ${sets ? '<button class="btn ghost danger wide" data-action="discard">Discard workout</button>' : ''}
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
    const hits = names.filter((n) => words.every((w) => n.toLowerCase().includes(w))).slice(0, 8);
    let h = hits.map((n) => `<button class="result" data-action="add-ex" data-name="${esc(n)}">${esc(n)}</button>`).join('');
    if (!names.some((n) => n.toLowerCase() === q.toLowerCase())) {
      h += `<button class="result create" data-action="create-ex" data-name="${esc(q)}">Create “${esc(q)}”</button>`;
    }
    return h;
  }

  // Progress
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

  function progressView() {
    let h = '<header class="top"><h1>Progress</h1></header>';
    const names = exercisesWithHistory();
    if (!names.length) {
      return h + '<div class="empty"><h2>Your progress shows up here</h2><p class="muted">After your first workout, each exercise gets its own chart.</p></div>';
    }
    const P = S.progress;
    if (!P.name || !names.includes(P.name)) {
      P.name = names[0];
      P.variation = '';
    }
    const def = exDef(P.name);
    h += `<select class="big-select" data-progress="name" aria-label="Exercise">${names
      .map((n) => `<option ${n === P.name ? 'selected' : ''}>${esc(n)}</option>`)
      .join('')}</select>`;
    if (def.attachments) {
      const vs = [...new Set(historyFor(P.name, '').flatMap((s) => s.entries.map((e) => e.variation)).filter(Boolean))];
      if (!vs.includes(P.variation)) P.variation = '';
      if (vs.length > 1) {
        h += `<div class="chips">${['', ...vs]
          .map((v) => `<button class="chip ${v === P.variation ? 'on' : ''}" data-action="pv" data-v="${esc(v)}">${v ? esc(v) : 'All grips'}</button>`)
          .join('')}</div>`;
      }
    }
    const sessions = historyFor(P.name, P.variation);
    const pts = sessions.map((s) => Object.assign({ date: s.date }, score(s.entries, def))).reverse();
    h += `<section class="panel"><div class="chart-title">${esc(pts[0].label)}</div>${chartSvg(pts)}<p class="muted small">${esc(pts[0].hint)}</p></section>`;
    h += `<h2>History</h2><ul class="list">${sessions
      .map((s, i) => {
        const prev = sessions[i + 1];
        const d = prev ? score(s.entries, def).value - score(prev.entries, def).value : null;
        const mk = d == null ? '' : `<span class="mk ${d > 0 ? 'up' : d < 0 ? 'down' : 'same'}">${d > 0 ? '▲' : d < 0 ? '▼' : '='}</span>`;
        const v = def.attachments && !P.variation && s.entries[0] && s.entries[0].variation ? ` · ${esc(s.entries[0].variation)}` : '';
        return `<li><div class="li-main"><span>${esc(niceDate(s.date))}${v}</span>${mk}</div><div class="muted small">${esc(summary(s.entries, def))}</div></li>`;
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
      const items = list
        .map((it, i) => {
          const label = Array.isArray(it) ? it.join(' + ') : it;
          return `<li><span>${esc(label)}</span>
            <button class="icon-btn" data-action="lib-move" data-day="${d}" data-idx="${i}" data-delta="-1" aria-label="Move ${esc(label)} up">↑</button>
            <button class="icon-btn" data-action="lib-move" data-day="${d}" data-idx="${i}" data-delta="1" aria-label="Move ${esc(label)} down">↓</button>
            <button class="icon-btn" data-action="lib-remove" data-day="${d}" data-idx="${i}" aria-label="Remove ${esc(label)} from ${d}">✕</button></li>`;
        })
        .join('');
      const inDay = new Set(list.flat());
      const addable = allExerciseNames().filter((n) => !inDay.has(n));
      return `<h3>${d}</h3><ul class="lib-list">${items}</ul>
        <select data-addday="${d}" aria-label="Add an exercise to ${d}"><option value="">Add to ${d}…</option>${addable
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
        <label class="field">Default rest<select data-setting="restSec">${restOpts}</select></label>
        <label class="check"><input type="checkbox" data-setting="sound" ${S.settings.sound ? 'checked' : ''}> Beep when rest is over</label>
        <label class="check"><input type="checkbox" data-setting="keepAwake" ${S.settings.keepAwake ? 'checked' : ''}> Keep the screen on during a workout</label>
        <p class="muted small">Your phone can't beep while it's locked or showing another app, so keeping the screen on is what makes the beep work.</p>
        <button class="btn small" data-action="test-sound">Test the beep</button>
      </section>
      <section class="panel">
        <h2>Exercises for each day</h2>
        <p class="muted small">Order here is the order they load in. Changes stay on this device.</p>
        ${dayLists}
      </section>
      <section class="panel">
        <h2>New exercise</h2>
        <label class="field">Name<input id="new-name" placeholder="Cable Fly" autocomplete="off"></label>
        <label class="check"><input type="checkbox" id="new-onearm"> One arm (log left and right reps)</label>
        <label class="check"><input type="checkbox" id="new-bw"> Bodyweight (BW, +kg or band)</label>
        <label class="field">Attachments (optional, separated by commas)<input id="new-att" placeholder="Rope, Straight bar" autocomplete="off"></label>
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
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function armed(el, label) {
    if (el.dataset.armed) return true;
    el.dataset.armed = '1';
    const old = el.textContent;
    el.textContent = label;
    setTimeout(() => {
      if (el.isConnected) {
        delete el.dataset.armed;
        el.textContent = old;
      }
    }, 3000);
    return false;
  }

  function blockById(id) {
    return S.current && S.current.blocks.find((b) => b.id === id);
  }

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
    tick(el) {
      tick(el.dataset.ex, +el.dataset.i, el);
    },
    'add-set'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const target = Math.max(...b.names.map((n) => c.ex[n].sets.length)) + 1;
      b.names.forEach((n) => {
        while (c.ex[n].sets.length < target) c.ex[n].sets.push(newSet(n, c.ex[n].sets.length));
      });
      persist();
      render();
    },
    'remove-set'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const max = Math.max(...b.names.map((n) => c.ex[n].sets.length));
      if (!max) return;
      b.names.forEach((n) => {
        const sets = c.ex[n].sets;
        if (sets.length === max) {
          const s = sets.pop();
          if (s.done) unqueueRows(rowIds(n, s));
        }
      });
      persist();
      render();
      scheduleSync();
    },
    'remove-block'(el) {
      const b = blockById(el.dataset.block);
      const c = S.current;
      const hasDone = b.names.some((n) => c.ex[n].sets.some((s) => s.done));
      if (hasDone && !armed(el, 'Tap again to remove')) return;
      b.names.forEach((n) => {
        c.ex[n].sets.forEach((s) => s.done && unqueueRows(rowIds(n, s)));
        if (!c.blocks.some((o) => o !== b && o.names.includes(n))) delete c.ex[n];
      });
      c.blocks = c.blocks.filter((o) => o !== b);
      if (c.open === b.id) c.open = null;
      persist();
      render();
      scheduleSync();
    },
    'rest-add'() {
      const c = S.current;
      if (!c.restEnd) return;
      const base = Math.max(c.restEnd, Date.now());
      c.restTotal = Math.round((base + 30000 - (c.restEnd - c.restTotal * 1000)) / 1000);
      c.restEnd = base + 30000;
      c.restBeeped = false;
      persist();
      tickClock();
    },
    'rest-skip'() {
      S.current.restEnd = null;
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
      const b = addBlock([el.dataset.name]);
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
        toast(`Added ${name}. Change its type in Settings if needed.`);
      }
      ACTIONS['add-ex']({ dataset: { name } });
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
      S.progress.variation = el.dataset.v;
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
      const att = $('#new-att')
        .value.split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (att.length) ex.attachments = att;
      S.library.exercises.push(ex);
      const day = $('#new-day').value;
      if (day) S.library.days[day].push(name);
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
    el.classList.remove('err');
    const n = el.dataset.ex;
    const i = +el.dataset.i;
    const s = S.current.ex[n] && S.current.ex[n].sets[i];
    if (!s) return;
    s[f] = el.value;
    persist();
    if (s.done) requeueSoon(n, i);
  });

  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.dataset.f === 'mode' && S.current) {
      const n = el.dataset.ex;
      const i = +el.dataset.i;
      const s = S.current.ex[n].sets[i];
      s.mode = el.value;
      if (s.mode === 'Band' && !s.band) s.band = 'Purple';
      persist();
      if (s.done) {
        queueRows(rowsFor(n, i));
        scheduleSync();
      }
      render();
    } else if (el.dataset.var && S.current) {
      const n = el.dataset.var;
      const ex = S.current.ex[n];
      let v = el.value;
      if (v === '__other') {
        v = (window.prompt('Attachment name') || '').trim();
        if (!v) {
          render();
          return;
        }
        const def = exDef(n);
        if (def.attachments && !def.attachments.includes(v)) {
          def.attachments.push(v);
          saveLibrary();
        }
      }
      ex.variation = v;
      ex.sets.forEach((s, i) => s.done && queueRows(rowsFor(n, i)));
      persist();
      invalidate();
      render();
      scheduleSync();
    } else if (el.dataset.setting) {
      const k = el.dataset.setting;
      S.settings[k] = el.type === 'checkbox' ? el.checked : +el.value;
      saveSettings();
      if (k === 'keepAwake') keepAwake(!!S.current);
    } else if (el.dataset.addday) {
      if (!el.value) return;
      S.library.days[el.dataset.addday].push(el.value);
      saveLibrary();
      render();
    } else if (el.dataset.progress) {
      S.progress = { name: el.value, variation: '' };
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
      if (h && Array.isArray(h.sets)) S.history = h;
    } catch (e) {}
    invalidate();
    render();
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
