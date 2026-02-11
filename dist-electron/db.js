"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
exports.getDB = getDB;
exports.insertSession = insertSession;
exports.getSession = getSession;
exports.getSessionCompetitorUrl = getSessionCompetitorUrl;
exports.setSessionCompetitorUrl = setSessionCompetitorUrl;
exports.listSessions = listSessions;
exports.updateSessionNote = updateSessionNote;
exports.listStores = listStores;
exports.updateStoreGoal = updateStoreGoal;
exports.insertCapture = insertCapture;
exports.getCapture = getCapture;
exports.listCapturesBySession = listCapturesBySession;
exports.insertCompetitorCapture = insertCompetitorCapture;
exports.updateCompetitorSignals = updateCompetitorSignals;
exports.getLatestCompetitorCapture = getLatestCompetitorCapture;
exports.insertAiOutput = insertAiOutput;
exports.getAiOutputByCapture = getAiOutputByCapture;
exports.getSetting = getSetting;
exports.setSetting = setSetting;
exports.getDataDir = getDataDir;
exports.getAssetsDir = getAssetsDir;
exports.insertListingSnapshot = insertListingSnapshot;
const sql_js_1 = __importDefault(require("sql.js"));
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
let db = null;
const DATA_DIR = path_1.default.join(electron_1.app.getPath('userData'), 'data');
const DB_PATH = path_1.default.join(DATA_DIR, 'app.db');
// Latest schema, including competitor_url and competitor_captures
const LATEST_SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  note TEXT,
  competitor_url TEXT,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now'))
);

CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  html_path TEXT NOT NULL,
  png_path TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  parse_status TEXT DEFAULT 'ok',
  parsed_json TEXT,
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS ai_outputs (
  id TEXT PRIMARY KEY,
  capture_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (capture_id) REFERENCES captures(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS competitor_captures (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  png_path TEXT NOT NULL,
  signals_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS stores (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT,
  niche_theme TEXT,
  niche_emotion TEXT,
  niche_buyer TEXT,
  level TEXT NOT NULL,
  risk_profile TEXT,
  active_goal TEXT
);

CREATE TABLE IF NOT EXISTS listing_snapshots (
  id TEXT PRIMARY KEY,
  store_id INTEGER NOT NULL,
  module TEXT NOT NULL,
  listing_url TEXT NOT NULL,
  title_text TEXT,
  description_text TEXT,
  tags_json TEXT,
  image_count INTEGER,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (store_id) REFERENCES stores(id)
);

CREATE INDEX IF NOT EXISTS idx_captures_session ON captures(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_capture ON ai_outputs(capture_id);
CREATE INDEX IF NOT EXISTS idx_competitor_captures_session ON competitor_captures(session_id);
CREATE INDEX IF NOT EXISTS idx_listing_snapshots_store ON listing_snapshots(store_id);
`;
function persist() {
    if (!db)
        return;
    const data = db.export();
    fs_1.default.writeFileSync(DB_PATH, Buffer.from(data));
}
function schemaHasColumn(database, table, column) {
    try {
        const result = database.exec(`PRAGMA table_info(${table})`);
        if (!result.length || !result[0].values.length)
            return false;
        const colNames = result[0].values.map((row) => String(row[1]));
        return colNames.includes(column);
    }
    catch {
        return false;
    }
}
async function initDB() {
    if (db)
        return db;
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
    if (fs_1.default.existsSync(DB_PATH)) {
        const buf = new Uint8Array(fs_1.default.readFileSync(DB_PATH));
        const SQL = await (0, sql_js_1.default)();
        const existing = new SQL.Database(buf);
        // Basic check: captures must have parse_status, otherwise recreate DB
        if (!schemaHasColumn(existing, 'captures', 'parse_status')) {
            existing.close();
            try {
                fs_1.default.renameSync(DB_PATH, DB_PATH + '.bak');
            }
            catch {
                fs_1.default.unlinkSync(DB_PATH);
            }
        }
        else {
            // Ensure sessions.competitor_url exists
            if (!schemaHasColumn(existing, 'sessions', 'competitor_url')) {
                existing.exec('ALTER TABLE sessions ADD COLUMN competitor_url TEXT');
            }
            // Ensure competitor_captures table exists with png_path + signals_json
            try {
                const hasCompetitorCaptures = existing.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='competitor_captures'");
                if (!hasCompetitorCaptures.length) {
                    existing.exec(`
CREATE TABLE IF NOT EXISTS competitor_captures (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  url TEXT NOT NULL,
  png_path TEXT NOT NULL,
  signals_json TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);
CREATE INDEX IF NOT EXISTS idx_competitor_captures_session ON competitor_captures(session_id);
`);
                }
                else {
                    // If table exists but columns missing, patch them
                    if (!schemaHasColumn(existing, 'competitor_captures', 'png_path')) {
                        existing.exec("ALTER TABLE competitor_captures ADD COLUMN png_path TEXT DEFAULT ''");
                    }
                    if (!schemaHasColumn(existing, 'competitor_captures', 'signals_json')) {
                        existing.exec("ALTER TABLE competitor_captures ADD COLUMN signals_json TEXT DEFAULT '{}'");
                    }
                }
            }
            catch {
                // Best-effort; if this fails we leave existing DB as-is
            }
            // Gate 7: listing_snapshots (neutral listing recognition)
            try {
                existing.exec(`
          CREATE TABLE IF NOT EXISTS listing_snapshots (
            id TEXT PRIMARY KEY,
            store_id INTEGER NOT NULL,
            module TEXT NOT NULL,
            listing_url TEXT NOT NULL,
            title_text TEXT,
            description_text TEXT,
            tags_json TEXT,
            image_count INTEGER,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')),
            FOREIGN KEY (store_id) REFERENCES stores(id)
          );
          CREATE INDEX IF NOT EXISTS idx_listing_snapshots_store ON listing_snapshots(store_id);
        `);
            }
            catch {
                // ignore
            }
            // Gate 1: stores table + seed
            db = existing;
            try {
                existing.exec(`
          CREATE TABLE IF NOT EXISTS stores (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            url TEXT,
            niche_theme TEXT,
            niche_emotion TEXT,
            niche_buyer TEXT,
            level TEXT NOT NULL,
            risk_profile TEXT,
            active_goal TEXT
          );
        `);
                seedStoresIfEmpty();
                persist();
            }
            catch {
                // ignore
            }
            return db;
        }
    }
    const SQL = await (0, sql_js_1.default)();
    db = new SQL.Database();
    db.exec(LATEST_SCHEMA);
    seedStoresIfEmpty();
    persist();
    return db;
}
function seedStoresIfEmpty() {
    if (!db)
        return;
    try {
        const res = db.exec('SELECT COUNT(*) as n FROM stores');
        const count = res?.[0]?.values?.[0]?.[0];
        if (count !== undefined && count > 0)
            return;
        db.run('INSERT INTO stores (id, name, url, niche_theme, niche_emotion, niche_buyer, level, risk_profile, active_goal) VALUES (1, $name, $url, $theme, $emotion, $buyer, $level, $risk, $goal)', {
            $name: 'Vintage Tee Co',
            $url: 'https://www.etsy.com/shop/vintagetee',
            $theme: 'Retro / vintage',
            $emotion: 'Nostalji, rahat',
            $buyer: 'Hediye alıcılar, koleksiyoncular',
            $level: 'Growing',
            $risk: 'normal',
            $goal: 'Listing görünürlüğü',
        });
        db.run('INSERT INTO stores (id, name, url, niche_theme, niche_emotion, niche_buyer, level, risk_profile, active_goal) VALUES (2, $name, $url, $theme, $emotion, $buyer, $level, $risk, $goal)', {
            $name: 'Minimal Quote Shop',
            $url: 'https://www.etsy.com/shop/minimalquote',
            $theme: 'Minimal / typography',
            $emotion: 'Sakin, ilham veren',
            $buyer: 'Etsy alıcıları, hediye alanlar',
            $level: 'Beginner',
            $risk: 'low',
            $goal: 'İlk satışlar',
        });
    }
    catch {
        // ignore seed errors
    }
}
function getDB() {
    if (!db)
        throw new Error('DB not initialized');
    return db;
}
function rowToObject(columns, values) {
    const o = {};
    columns.forEach((c, i) => {
        o[c] = values[i] ?? null;
    });
    return o;
}
// Sessions
function insertSession(id, note) {
    getDB().run('INSERT OR IGNORE INTO sessions (id, note) VALUES ($id, $note)', { $id: id, $note: note ?? null });
    persist();
}
function getSession(id) {
    const res = getDB().exec('SELECT * FROM sessions WHERE id = $id', { $id: id });
    if (!res.length || !res[0].values.length)
        return undefined;
    return rowToObject(res[0].columns, res[0].values[0]);
}
function getSessionCompetitorUrl(id) {
    const session = getSession(id);
    return session?.competitor_url ?? null;
}
function setSessionCompetitorUrl(id, url) {
    getDB().run('UPDATE sessions SET competitor_url = $url WHERE id = $id', { $url: url, $id: id });
    persist();
}
function listSessions(limit = 20) {
    const res = getDB().exec('SELECT * FROM sessions ORDER BY created_at DESC LIMIT $limit', { $limit: limit });
    if (!res.length)
        return [];
    const rows = res[0].values.map((v) => rowToObject(res[0].columns, v));
    return rows;
}
function updateSessionNote(id, note) {
    getDB().run('UPDATE sessions SET note = $note WHERE id = $id', { $note: note, $id: id });
    persist();
}
function listStores() {
    try {
        const res = getDB().exec('SELECT * FROM stores ORDER BY id ASC');
        if (!res.length || !res[0].values.length)
            return [];
        return res[0].values.map((v) => rowToObject(res[0].columns, v));
    }
    catch {
        return [];
    }
}
function updateStoreGoal(id, goal) {
    getDB().run('UPDATE stores SET active_goal = $goal WHERE id = $id', { $goal: goal ?? null, $id: id });
    persist();
}
// Captures
function insertCapture(id, sessionId, url, htmlPath, pngPath, parseStatus, parsedJson) {
    getDB().run('INSERT INTO captures (id, session_id, url, html_path, png_path, parse_status, parsed_json) VALUES ($id, $sessionId, $url, $htmlPath, $pngPath, $parseStatus, $parsedJson)', { $id: id, $sessionId: sessionId, $url: url, $htmlPath: htmlPath, $pngPath: pngPath, $parseStatus: parseStatus ?? null, $parsedJson: parsedJson ?? null });
    persist();
}
function getCapture(id) {
    const res = getDB().exec('SELECT * FROM captures WHERE id = $id', { $id: id });
    if (!res.length || !res[0].values.length)
        return undefined;
    return rowToObject(res[0].columns, res[0].values[0]);
}
function listCapturesBySession(sessionId) {
    const res = getDB().exec('SELECT * FROM captures WHERE session_id = $sessionId ORDER BY created_at DESC', { $sessionId: sessionId });
    if (!res.length)
        return [];
    return res[0].values.map((v) => rowToObject(res[0].columns, v));
}
// Competitor captures
function insertCompetitorCapture(id, sessionId, url, pngPath, signalsJson) {
    const safeSignals = signalsJson || '{}';
    const safePath = pngPath || '';
    getDB().run('INSERT INTO competitor_captures (id, session_id, url, png_path, signals_json) VALUES ($id, $sessionId, $url, $pngPath, $signals)', { $id: id, $sessionId: sessionId, $url: url, $pngPath: safePath, $signals: safeSignals });
    persist();
}
function updateCompetitorSignals(id, signalsJson) {
    getDB().run('UPDATE competitor_captures SET signals_json = $signals WHERE id = $id', { $signals: signalsJson || '{}', $id: id });
    persist();
}
function getLatestCompetitorCapture(sessionId) {
    const res = getDB().exec('SELECT id, signals_json FROM competitor_captures WHERE session_id = $sid ORDER BY created_at DESC LIMIT 1', { $sid: sessionId });
    if (!res.length || !res[0].values.length)
        return undefined;
    const row = res[0].values[0];
    const cols = res[0].columns;
    const obj = rowToObject(cols, row);
    return obj;
}
// AI outputs
function insertAiOutput(id, captureId, type, payload) {
    getDB().run('INSERT INTO ai_outputs (id, capture_id, type, payload) VALUES ($id, $captureId, $type, $payload)', {
        $id: id,
        $captureId: captureId,
        $type: type,
        $payload: payload,
    });
    persist();
}
function getAiOutputByCapture(captureId, type) {
    const res = getDB().exec('SELECT * FROM ai_outputs WHERE capture_id = $captureId AND type = $type ORDER BY created_at DESC LIMIT 1', {
        $captureId: captureId,
        $type: type,
    });
    if (!res.length || !res[0].values.length)
        return undefined;
    return rowToObject(res[0].columns, res[0].values[0]);
}
// Settings
function getSetting(key) {
    const res = getDB().exec('SELECT value FROM settings WHERE key = $key', { $key: key });
    if (!res.length || !res[0].values.length)
        return undefined;
    const v = res[0].values[0][0];
    return v != null ? String(v) : undefined;
}
function setSetting(key, value) {
    getDB().run('INSERT OR REPLACE INTO settings (key, value) VALUES ($key, $value)', { $key: key, $value: value });
    persist();
}
function getDataDir() {
    return DATA_DIR;
}
function getAssetsDir() {
    const assets = path_1.default.join(DATA_DIR, 'assets');
    fs_1.default.mkdirSync(assets, { recursive: true });
    return assets;
}
// Gate 7: neutral listing snapshots (store context only, no interpretation)
function insertListingSnapshot(id, storeId, module, listingUrl, titleText, descriptionText, tagsJson, imageCount) {
    getDB().run(`INSERT INTO listing_snapshots (id, store_id, module, listing_url, title_text, description_text, tags_json, image_count)
     VALUES ($id, $storeId, $module, $url, $title, $desc, $tags, $imgCount)`, {
        $id: id,
        $storeId: storeId,
        $module: module,
        $url: listingUrl,
        $title: titleText ?? null,
        $desc: descriptionText ?? null,
        $tags: tagsJson ?? '[]',
        $imgCount: imageCount ?? null,
    });
    persist();
}
