/**
 * KOL DAILY — reformat to carry the consideration layer (run-once, non-destructive).
 *
 * What it does, to BOTH "KOL - POOL" and "KOL - JUNI":
 *   1. Appends structured columns to the RIGHT (so existing A–H indices and the current
 *      sync keep working until we switch sync to the new layout):
 *        Content Style · Family · Brief Type · Produk · Angle/Hook · Ref Link · Bulan
 *   2. Adds dropdown data-validation to Content Style / Family / Brief Type.
 *   3. Best-effort back-parses each row's existing notes into the new columns.
 *      `keterangan` is left untouched — it becomes the "free notes" column.
 *   Idempotent: re-running won't duplicate columns; it refreshes empty cells only.
 *
 * ── HOW TO RUN (you approve by running it) ──────────────────────────────────────
 *   1. KOL DAILY → Extensions → Apps Script → paste this file → Save.
 *   2. Run ▸ reformatKolDaily  (authorize once).
 *   3. Eyeball the new columns, fix any mis-parses by hand (dropdowns make it fast).
 *   Nothing is deleted; to undo, just delete the appended columns.
 */

var NEW_COLS = ['Content Style', 'Family', 'Brief Type', 'Produk', 'Angle/Hook', 'Ref Link', 'Bulan'];
var STYLES   = ['Educational','Fashion','Baby','Sleep','FamilyVlog','Mom'];
var FAMILY   = ['Solo','Sibling','Twins'];
var BRIEFS   = ['Soft-selling','Mid-selling','Hard-selling'];
var MONTHS   = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
var PRODUCTS = ['UltraCool','PureKnit','BreatheKnit','SoftAir','ActiveKnit','Wonder Set','Sunny Days','Serena','Culotte'];

function reformatKolDaily() {
  ['KOL - POOL', 'KOL - JUNI'].forEach(reformatTab_);
  SpreadsheetApp.getActive().toast('Reformat selesai — cek kolom baru di kanan.', 'KOL DAILY', 6);
}

function reformatTab_(tabName) {
  var sh = SpreadsheetApp.getActive().getSheetByName(tabName);
  if (!sh) return;
  var lastRow = sh.getLastRow(); if (lastRow < 2) return;
  var header = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);

  // where is the existing notes column ("keterangan")?
  var noteIdx = header.findIndex(function (h) { return /keterangan/i.test(h); });
  if (noteIdx < 0) noteIdx = header.length - 1;

  // ensure each new column exists; remember its column index (1-based)
  var colOf = {};
  NEW_COLS.forEach(function (name) {
    var i = header.indexOf(name);
    if (i < 0) { i = header.length; header.push(name); sh.getRange(1, i + 1).setValue(name).setFontWeight('bold'); }
    colOf[name] = i + 1;
  });

  // dropdowns
  setValidation_(sh, colOf['Content Style'], lastRow, STYLES);
  setValidation_(sh, colOf['Family'],        lastRow, FAMILY);
  setValidation_(sh, colOf['Brief Type'],    lastRow, BRIEFS);

  // back-parse notes → new columns (only fill empties; never overwrite human edits)
  var notes = sh.getRange(2, noteIdx + 1, lastRow - 1, 1).getValues();
  var out = {}; NEW_COLS.forEach(function (n) { out[n] = []; });
  for (var r = 0; r < notes.length; r++) {
    var t = String(notes[r][0] || '');
    out['Content Style'].push([inferStyle_(t)]);
    out['Family'].push([inferFamily_(t)]);
    out['Brief Type'].push([inferBrief_(t)]);
    out['Produk'].push([inferProducts_(t)]);
    out['Angle/Hook'].push([inferHook_(t)]);
    out['Ref Link'].push([inferRef_(t)]);
    out['Bulan'].push([inferMonth_(t)]);
  }
  NEW_COLS.forEach(function (name) {
    var rng = sh.getRange(2, colOf[name], lastRow - 1, 1);
    var cur = rng.getValues();
    var merged = cur.map(function (row, i) { return [row[0] ? row[0] : out[name][i][0]]; });
    rng.setValues(merged);
  });
}

function setValidation_(sh, col, lastRow, list) {
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(list, true).setAllowInvalid(true).build();
  sh.getRange(2, col, lastRow - 1, 1).setDataValidation(rule);
}

// ── heuristics (mirror kol/js/intelligence.js) ──────────────────────────────────
function inferStyle_(t) {
  t = t.toLowerCase();
  if (/fashion|style|ootd|outfit|aesthetic|dress|culotte/.test(t)) return 'Fashion';
  if (/tidur|sleep|malam|bedtime|sleepwear/.test(t))               return 'Sleep';
  if (/vlog|family|keluarga|ayah|suami/.test(t))                   return 'FamilyVlog';
  if (/baby|bayi|newborn|lahir|babywear/.test(t))                  return 'Baby';
  if (/edukasi|tips|review|jujur|teliti|detail|honest/.test(t))    return 'Educational';
  return 'Mom';
}
function inferFamily_(t) {
  t = t.toLowerCase();
  if (/\btwins?\b|kembar/.test(t))                       return 'Twins';
  if (/adik|kakak|sibling|saudara|twinning/.test(t))     return 'Sibling';
  return 'Solo';
}
function inferBrief_(t) {
  var m = t.toLowerCase().match(/(soft|mid|hard)[\s-]*selling/);
  return m ? ({soft:'Soft-selling',mid:'Mid-selling',hard:'Hard-selling'})[m[1]] : '';
}
function inferRef_(t) { var m = t.match(/(https?:\/\/[^\s,)]+)/); return m ? m[1] : ''; }
function inferProducts_(t) {
  var lo = t.toLowerCase(), found = [];
  PRODUCTS.forEach(function (p) { if (lo.indexOf(p.toLowerCase()) >= 0 && found.indexOf(p) < 0) found.push(p); });
  return found.join(', ');
}
function inferMonth_(t) {
  for (var i = 0; i < MONTHS.length; i++) if (new RegExp('\\b' + MONTHS[i] + '\\b', 'i').test(t)) return MONTHS[i] + ' 2026';
  return '';
}
function inferHook_(t) {
  var m = t.match(/["“']([^"“”']{8,})["”']/);          // a quoted hook, if present
  return m ? m[1] : '';
}
