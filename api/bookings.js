/**
 * RHYTHM MATES – Bookings API
 * Vercel serverless function – handles all booking CRUD via Google Sheets.
 *
 * Routes:
 *   GET    /api/bookings          → return all bookings
 *   POST   /api/bookings          → create new booking  (body: booking object)
 *   PUT    /api/bookings          → update booking      (body: booking object with id)
 *   DELETE /api/bookings?id=xxx   → delete booking by id
 */

const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SHEET_NAME = 'Bookings';

// Column order MUST match the header row in the Google Sheet
const COLUMNS = [
    'id', 'date', 'shift', 'env', 'client', 'phone',
    'location', 'total', 'advance', 'balance',
    'soundcheck', 'crowd', 'theme', 'notes',
    'sound', 'band', 'soundCharges',
    'artistRate', 'artistPayment', 'soundChargeOnly', 'hideFromSound', 'soundNote',
    'addReqDesc', 'addReqCost',
];

// ── Auth ──────────────────────────────────────────────────────────────────────
function getAuth() {
    return new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_SA_EMAIL,
            // Vercel stores \n literally; restore real newlines
            private_key: (process.env.GOOGLE_SA_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
}

async function getSheets() {
    const auth = getAuth();
    return google.sheets({ version: 'v4', auth });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getAllRows(sheets) {
    const resp = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: `${SHEET_NAME}!A2:Z`,
    });
    const rows = resp.data.values || [];
    return rows.map(row => {
        const obj = {};
        COLUMNS.forEach((col, i) => { obj[col] = row[i] ?? ''; });
        obj.total = parseFloat(obj.total) || 0;
        obj.advance = parseFloat(obj.advance) || 0;
        obj.balance = parseFloat(obj.balance) || 0;
        obj.band = parseFloat(obj.band) || 0;
        obj.soundCharges = parseFloat(obj.soundCharges) || 0;
        obj.artistRate = parseFloat(obj.artistRate) || 0;
        obj.artistPayment = parseFloat(obj.artistPayment) || 0;
        obj.soundChargeOnly = parseFloat(obj.soundChargeOnly) || 0;
        obj.addReqCost = parseFloat(obj.addReqCost) || 0;
        obj.hideFromSound = obj.hideFromSound === 'true' || obj.hideFromSound === true;
        return obj;
    });
}

function bookingToRow(b) {
    return COLUMNS.map(c => (b[c] !== undefined && b[c] !== null) ? b[c] : '');
}

// Column letter for last column (e.g. 14 cols → N)
const LAST_COL = String.fromCharCode(64 + COLUMNS.length);

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
    // CORS – allow Vercel preview URLs and your custom domain
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    let sheets;
    try {
        sheets = await getSheets();
    } catch (err) {
        console.error('Auth error:', err);
        return res.status(500).json({ error: 'Google auth failed', detail: err.message });
    }

    try {
        // ── GET all ────────────────────────────────────────────────────────────────
        if (req.method === 'GET') {
            const bookings = await getAllRows(sheets);
            return res.status(200).json(bookings);
        }

        // ── POST (create) ──────────────────────────────────────────────────────────
        if (req.method === 'POST') {
            const b = req.body;
            if (!b || !b.id) return res.status(400).json({ error: 'Missing booking id' });

            await sheets.spreadsheets.values.append({
                spreadsheetId: SHEET_ID,
                range: `${SHEET_NAME}!A:${LAST_COL}`,
                valueInputOption: 'RAW',
                insertDataOption: 'INSERT_ROWS',
                requestBody: { values: [bookingToRow(b)] },
            });
            return res.status(201).json({ ok: true, booking: b });
        }

        // ── PUT (update) ───────────────────────────────────────────────────────────
        if (req.method === 'PUT') {
            const b = req.body;
            if (!b || !b.id) return res.status(400).json({ error: 'Missing booking id' });

            const all = await getAllRows(sheets);
            const idx = all.findIndex(x => x.id === b.id);
            if (idx < 0) return res.status(404).json({ error: 'Booking not found' });

            const sheetRow = idx + 2; // +1 header, +1 for 1-indexing
            await sheets.spreadsheets.values.update({
                spreadsheetId: SHEET_ID,
                range: `${SHEET_NAME}!A${sheetRow}:${LAST_COL}${sheetRow}`,
                valueInputOption: 'RAW',
                requestBody: { values: [bookingToRow(b)] },
            });
            return res.status(200).json({ ok: true, booking: b });
        }

        // ── DELETE ─────────────────────────────────────────────────────────────────
        if (req.method === 'DELETE') {
            const id = req.query.id;
            if (!id) return res.status(400).json({ error: 'Missing id query param' });

            const all = await getAllRows(sheets);
            const idx = all.findIndex(x => x.id === id);
            if (idx < 0) return res.status(404).json({ error: 'Booking not found' });

            // Need the numeric sheetId (not the spreadsheet string ID) for batchUpdate
            const meta = await sheets.spreadsheets.get({ spreadsheetId: SHEET_ID });
            const sheetMeta = meta.data.sheets.find(s => s.properties.title === SHEET_NAME);
            if (!sheetMeta) return res.status(404).json({ error: `Sheet "${SHEET_NAME}" not found` });

            const sheetRow = idx + 2; // 1-indexed, row 1 is header
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId: SHEET_ID,
                requestBody: {
                    requests: [{
                        deleteDimension: {
                            range: {
                                sheetId: sheetMeta.properties.sheetId,
                                dimension: 'ROWS',
                                startIndex: sheetRow - 1,  // 0-indexed
                                endIndex: sheetRow,
                            },
                        },
                    }],
                },
            });
            return res.status(200).json({ ok: true });
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        console.error('API error:', err);
        return res.status(500).json({ error: 'Server error', detail: err.message });
    }
}
