// ── RHYTHM MATES – Google Apps Script Backend ─────────────────────────────────
// Updated to include all fields: artistRate, artistPayment, soundChargeOnly, hideFromSound
//
// COLUMN ORDER (must match exactly in Google Sheet row 1):
// A: id
// B: date
// C: shift
// D: env
// E: client
// F: phone
// G: location
// H: total
// I: advance
// J: balance
// K: soundcheck
// L: crowd
// M: theme
// N: notes
// O: sound
// P: band
// Q: soundCharges
// R: artistRate        ← NEW (add this column to sheet if missing)
// S: artistPayment     ← NEW (add this column to sheet if missing)
// T: soundChargeOnly   ← NEW (add this column to sheet if missing)
// U: hideFromSound     ← NEW (add this column to sheet if missing)
// V: soundNote         ← NEW (add this column to sheet if missing)

const SHEET_NAME = 'Bookings';

// Maps column letter → field name (what the frontend sends/expects)
const COLS = [
  'id',             // A
  'date',           // B
  'shift',          // C
  'env',            // D
  'client',         // E
  'phone',          // F
  'location',       // G
  'total',          // H
  'advance',        // I
  'balance',        // J
  'soundcheck',     // K
  'crowd',          // L
  'theme',          // M
  'notes',          // N
  'sound',          // O
  'band',           // P
  'soundCharges',   // Q
  'artistRate',     // R  ← previously missing
  'artistPayment',  // S  ← previously missing
  'soundChargeOnly',// T  ← previously missing
  'hideFromSound',  // U  ← previously missing
  'soundNote',      // V  ← NEW: third-party sound note
];

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
}

// ── Ensure header row matches COLS ────────────────────────────────────────────
function ensureHeaders() {
  const sheet = getSheet();
  const numCols = COLS.length;
  // Make sure there are enough columns
  if (sheet.getMaxColumns() < numCols) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), numCols - sheet.getMaxColumns());
  }
  const headerRange = sheet.getRange(1, 1, 1, numCols);
  const existingHeaders = headerRange.getValues()[0];
  // Only write headers that are missing / wrong
  const newHeaders = COLS.map((col, i) => existingHeaders[i] === col ? existingHeaders[i] : col);
  headerRange.setValues([newHeaders]);
}

// ── Row ↔ Object helpers ──────────────────────────────────────────────────────
function rowToObj(row) {
  const obj = {};
  COLS.forEach((key, i) => {
    let val = row[i];
    // Numeric fields
    if (['total','advance','balance','band','soundCharges','artistRate','artistPayment','soundChargeOnly'].includes(key)) {
      val = parseFloat(val) || 0;
    }
    // Boolean field
    if (key === 'hideFromSound') {
      val = val === true || val === 'true' || val === 1 || val === '1';
    }
    obj[key] = val;
  });
  return obj;
}

function objToRow(obj) {
  return COLS.map(key => {
    const val = obj[key];
    if (val === undefined || val === null) return '';
    return val;
  });
}

// ── GET – return all bookings as JSON ─────────────────────────────────────────
function doGet(e) {
  try {
    ensureHeaders();
    const sheet = getSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return jsonResponse([]);
    }
    const numCols = COLS.length;
    // Read only up to numCols columns (safe even if sheet has more)
    const data = sheet.getRange(2, 1, lastRow - 1, numCols).getValues();
    const bookings = data
      .filter(row => row[0] !== '' && row[0] !== null && row[0] !== undefined)  // skip empty rows
      .map(rowToObj);
    return jsonResponse(bookings);
  } catch (err) {
    return jsonError(err.toString());
  }
}

// ── POST – create a new booking ───────────────────────────────────────────────
function doPost(e) {
  try {
    ensureHeaders();
    const sheet = getSheet();
    const body = JSON.parse(e.postData.contents);
    const row = objToRow(body);
    sheet.appendRow(row);
    return jsonResponse({ ok: true, id: body.id });
  } catch (err) {
    return jsonError(err.toString());
  }
}

// ── PUT – update an existing booking by id ────────────────────────────────────
function doPut(e) {
  try {
    ensureHeaders();
    const sheet = getSheet();
    const body = JSON.parse(e.postData.contents);
    const id = body.id;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonError('No data');

    const numCols = COLS.length;
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const rowIdx = ids.indexOf(String(id));
    if (rowIdx < 0) {
      // id not found — append instead
      sheet.appendRow(objToRow(body));
      return jsonResponse({ ok: true, action: 'created' });
    }
    const sheetRow = rowIdx + 2;  // 1-indexed, skip header
    const row = objToRow(body);
    sheet.getRange(sheetRow, 1, 1, numCols).setValues([row]);
    return jsonResponse({ ok: true, id });
  } catch (err) {
    return jsonError(err.toString());
  }
}

// ── DELETE – remove booking by id ─────────────────────────────────────────────
function doDelete(e) {
  try {
    const sheet = getSheet();
    const id = e.parameter.id;
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return jsonError('No data');

    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
    const rowIdx = ids.indexOf(String(id));
    if (rowIdx < 0) return jsonResponse({ ok: true, action: 'not_found' });

    const sheetRow = rowIdx + 2;
    sheet.deleteRow(sheetRow);
    return jsonResponse({ ok: true, id });
  } catch (err) {
    return jsonError(err.toString());
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
