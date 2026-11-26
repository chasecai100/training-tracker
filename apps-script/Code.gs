/** @OnlyCurrentDoc */

/**
 * Training Tracker backend.
 *
 * Lives inside the "Training Log" Google Sheet (Extensions > Apps Script).
 * The web app sends sets here, and this script writes them to the Sets and
 * Sessions tabs. Every request must carry the passphrase you set from the
 * sheet's "Training Tracker > Set passphrase" menu.
 */

const SETS = 'Sets';
const SESSIONS = 'Sessions';
const SET_HEADERS = ['Date', 'Time', 'Day', 'Exercise', 'Variation', 'Set', 'Side', 'kg', 'Reps', 'Session', 'ID'];
const SESSION_HEADERS = ['Session', 'Date', 'Day', 'Start', 'End', 'Length (min)'];
const FORMATS = {
  Sets: { Date: 'yyyy-mm-dd', Time: 'HH:mm', Session: '@', ID: '@' },
  Sessions: { Session: '@', Date: 'yyyy-mm-dd', Start: 'HH:mm', End: 'HH:mm' },
};

// ---------- Sheet menu ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Training Tracker')
    .addItem('Set passphrase', 'setPassphrase')
    .addItem('Set up tabs', 'setupTabs')
    .addToUi();
}

/** Creates the Sets and Sessions tabs. Safe to run more than once. */
function setupTabs() {
  const ss = SpreadsheetApp.getActive();
  sheet_(SETS);
  sheet_(SESSIONS);
  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(blank);
}

function setPassphrase() {
  const ui = SpreadsheetApp.getUi();
  const res = ui.prompt(
    'Set passphrase',
    'Choose a passphrase (at least 8 characters, capitals ignored). You type it once on each device.',
    ui.ButtonSet.OK_CANCEL
  );
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const pass = normalize_(res.getResponseText());
  if (pass.length < 8) {
    ui.alert('Use at least 8 characters.');
    return;
  }
  PropertiesService.getScriptProperties().setProperty('PASS_HASH', hash_(pass));
  setupTabs();
  ui.alert('Passphrase saved.');
}

// ---------- Web app endpoints ----------

/** Reachability check only. Never returns training data. */
function doGet() {
  return out_({ ok: true, app: 'training-tracker' });
}

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ ok: false, error: 'bad_request' });
  }
  const stored = PropertiesService.getScriptProperties().getProperty('PASS_HASH');
  if (!stored) return out_({ ok: false, error: 'no_passphrase' });
  if (typeof req.pass !== 'string' || hash_(normalize_(req.pass)) !== stored) {
    Utilities.sleep(1000);
    return out_({ ok: false, error: 'wrong_passphrase' });
  }
  try {
    if (req.action === 'ping') return out_({ ok: true });
    if (req.action === 'sync') return out_(sync_(req));
    if (req.action === 'history') return out_(history_());
    return out_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return out_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

// ---------- Actions ----------

function sync_(req) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    upsert_(SETS, 'ID', req.sets, req.deleteSets);
    upsert_(SESSIONS, 'Session', req.sessions, req.deleteSessions);
    SpreadsheetApp.flush();
    return { ok: true };
  } finally {
    lock.releaseLock();
  }
}

function history_() {
  const read = (name) => {
    const sh = sheet_(name);
    const cols = sh.getLastColumn();
    const headers = sh.getRange(1, 1, 1, cols).getDisplayValues()[0];
    const n = sh.getLastRow() - 1;
    const rows = n > 0 ? sh.getRange(2, 1, n, cols).getDisplayValues() : [];
    return { headers: headers, rows: rows };
  };
  return { ok: true, sets: read(SETS), sessions: read(SESSIONS) };
}

/**
 * Updates rows whose id already exists, appends new ones, and deletes the
 * ids in deleteIds. Items are objects keyed by column header.
 */
function upsert_(name, idHeader, items, deleteIds) {
  const sh = sheet_(name);
  const headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getDisplayValues()[0];
  const idCol = headers.indexOf(idHeader);
  if (idCol < 0) throw new Error('The ' + name + ' tab is missing its ' + idHeader + ' column');

  const last = sh.getLastRow();
  const rowOf = {};
  if (last > 1) {
    sh.getRange(2, idCol + 1, last - 1, 1).getDisplayValues().forEach((r, i) => {
      if (r[0]) rowOf[r[0]] = i + 2;
    });
  }

  const del = {};
  (deleteIds || []).forEach((id) => (del[String(id)] = true));
  const latest = {};
  (items || []).forEach((it) => {
    const id = String(it[idHeader] || '');
    if (id && !del[id]) latest[id] = it;
  });

  const appends = [];
  Object.keys(latest).forEach((id) => {
    const it = latest[id];
    if (rowOf[id]) {
      const range = sh.getRange(rowOf[id], 1, 1, headers.length);
      const current = range.getValues()[0];
      range.setValues([headers.map((h, i) => (h in it ? clean_(it[h]) : current[i]))]);
    } else {
      appends.push(headers.map((h) => (h in it ? clean_(it[h]) : '')));
    }
  });

  if (appends.length) {
    const start = sh.getLastRow() + 1;
    const missing = start + appends.length - 1 - sh.getMaxRows();
    if (missing > 0) sh.insertRowsAfter(sh.getMaxRows(), missing + 200);
    format_(sh, name, headers, start, appends.length);
    sh.getRange(start, 1, appends.length, headers.length).setValues(appends);
  }

  Object.keys(del)
    .map((id) => rowOf[id])
    .filter(Boolean)
    .sort((a, b) => b - a)
    .forEach((r) => sh.deleteRow(r));
}

// ---------- Helpers ----------

function sheet_(name) {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(name);
  if (sh) return sh;
  const headers = name === SETS ? SET_HEADERS : SESSION_HEADERS;
  sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
  sh.setFrozenRows(1);
  format_(sh, name, headers, 2, sh.getMaxRows() - 1);
  return sh;
}

function format_(sh, name, headers, start, n) {
  const fmt = FORMATS[name] || {};
  Object.keys(fmt).forEach((h) => {
    const c = headers.indexOf(h);
    if (c >= 0) sh.getRange(start, c + 1, n, 1).setNumberFormat(fmt[h]);
  });
}

function clean_(v) {
  return v === null || v === undefined ? '' : v;
}

function normalize_(s) {
  return String(s || '').trim().toLowerCase();
}

function hash_(s) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, s, Utilities.Charset.UTF_8);
  return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
