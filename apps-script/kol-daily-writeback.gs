/**
 * KOL DAILY — write-back endpoint for the KOL Command Center.
 *
 * This turns the Google Sheet into a two-way mirror: the web app / Supabase can
 * POST updates here and they land in the right row. Reads still go through the
 * normal published CSV — this is write-only.
 *
 * ── DEPLOY (≈2 min, no extra accounts) ───────────────────────────────────────
 *  1. Open the KOL DAILY sheet → Extensions → Apps Script.
 *  2. Delete any boilerplate, paste this whole file, Save.
 *  3. Set TOKEN below to a random string (keep it secret).
 *  4. Deploy → New deployment → type "Web app".
 *       - Execute as:  Me
 *       - Who has access:  Anyone
 *     Deploy → authorize → copy the /exec URL.
 *  5. Send me the /exec URL + the TOKEN. I'll wire the app to push to it.
 *
 * Security: only requests carrying the matching token can write. Treat the URL
 * + token like a password.
 */

const TOKEN = 'CHANGE_ME_to_a_random_string';

// Column layout per tab (1-based). Matches the live KOL DAILY structure:
// POOL: A handle, B tier, C link, D contact, E ratecard, F scope, G status, H keterangan
// JUNI: A handle, B tier, C link, D contact, E ratecard, F scope, G keterangan
const SHEETS = {
  'KOL - POOL': { handle: 1, tier: 2, link: 3, contact: 4, ratecard: 5, scope: 6, status: 7, keterangan: 8 },
  'KOL - JUNI': { handle: 1, tier: 2, link: 3, contact: 4, ratecard: 5, scope: 6, keterangan: 7 },
};

function doGet() {
  return json({ ok: true, service: 'kol-daily-writeback', tabs: Object.keys(SHEETS) });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.token !== TOKEN) return json({ ok: false, error: 'bad_token' });
    if (body.action === 'upsert')      return json(upsertRow(body.sheet, body.handle, body.fields || {}));
    if (body.action === 'bulk_upsert') return json(bulkUpsert(body.sheet, body.rows || []));
    return json({ ok: false, error: 'unknown_action' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/**
 * Update (or append) a row by handle.
 * fields keys are logical names: tier, link, contact, ratecard, scope, status, keterangan.
 */
function upsertRow(sheetName, handle, fields) {
  const cfg = SHEETS[sheetName];
  if (!cfg) return { ok: false, error: 'unknown_sheet: ' + sheetName };
  const sh = SpreadsheetApp.getActive().getSheetByName(sheetName);
  if (!sh) return { ok: false, error: 'no_sheet: ' + sheetName };

  const last = sh.getLastRow();
  const handles = last > 1
    ? sh.getRange(2, cfg.handle, last - 1, 1).getValues().map(r => String(r[0]).trim().toLowerCase())
    : [];
  const target = String(handle).trim().toLowerCase();
  let rowIdx = handles.indexOf(target);  // 0-based within data
  let sheetRow;

  if (rowIdx === -1) {
    sheetRow = last + 1;                  // append
    sh.getRange(sheetRow, cfg.handle).setValue(handle);
  } else {
    sheetRow = rowIdx + 2;                // +2: header + 1-based
  }

  Object.keys(fields).forEach(key => {
    if (cfg[key]) sh.getRange(sheetRow, cfg[key]).setValue(fields[key]);
  });
  return { ok: true, action: rowIdx === -1 ? 'appended' : 'updated', row: sheetRow, handle: handle };
}

function bulkUpsert(sheetName, rows) {
  const out = rows.map(r => upsertRow(sheetName, r.handle, r.fields || {}));
  return { ok: true, count: out.length, results: out };
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
