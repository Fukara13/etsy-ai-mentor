import initSqlJs from 'sql.js'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

// Keep SqlJsDb loose to avoid type issues with sql.js typings.
// We rely on the runtime API (exec, run, export, etc.) that sql.js provides.
export type SqlJsDb = any

let db: SqlJsDb | null = null

const DATA_DIR = path.join(app.getPath('userData'), 'data')
const DB_PATH = path.join(DATA_DIR, 'app.db')

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
`

function persist() {
  if (!db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

function schemaHasColumn(database: SqlJsDb, table: string, column: string): boolean {
  try {
    const result = database.exec(`PRAGMA table_info(${table})`)
    if (!result.length || !result[0].values.length) return false
    const colNames = (result[0].values as (string | number | null)[][]).map((row) => String(row[1]))
    return colNames.includes(column)
  } catch {
    return false
  }
}

export async function initDB(): Promise<SqlJsDb> {
  if (db) return db
  fs.mkdirSync(DATA_DIR, { recursive: true })

  if (fs.existsSync(DB_PATH)) {
    const buf = new Uint8Array(fs.readFileSync(DB_PATH))
    const SQL = await initSqlJs()
    const existing = new SQL.Database(buf) as SqlJsDb

    // Basic check: captures must have parse_status, otherwise recreate DB
    if (!schemaHasColumn(existing, 'captures', 'parse_status')) {
      existing.close()
      try {
        fs.renameSync(DB_PATH, DB_PATH + '.bak')
      } catch {
        fs.unlinkSync(DB_PATH)
      }
    } else {
      // Ensure sessions.competitor_url exists
      if (!schemaHasColumn(existing, 'sessions', 'competitor_url')) {
        existing.exec('ALTER TABLE sessions ADD COLUMN competitor_url TEXT')
      }
      // Ensure competitor_captures table exists with png_path + signals_json
      try {
        const hasCompetitorCaptures = existing.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='competitor_captures'")
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
`)
        } else {
          // If table exists but columns missing, patch them
          if (!schemaHasColumn(existing, 'competitor_captures', 'png_path')) {
            existing.exec("ALTER TABLE competitor_captures ADD COLUMN png_path TEXT DEFAULT ''")
          }
          if (!schemaHasColumn(existing, 'competitor_captures', 'signals_json')) {
            existing.exec("ALTER TABLE competitor_captures ADD COLUMN signals_json TEXT DEFAULT '{}'")
          }
        }
      } catch {
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
        `)
      } catch {
        // ignore
      }

      // Gate 1: stores table + seed
      db = existing
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
        `)
        seedStoresIfEmpty()
        persist()
      } catch {
        // ignore
      }
      return db
    }
  }

  const SQL = await initSqlJs()
  db = new SQL.Database() as SqlJsDb
  db.exec(LATEST_SCHEMA)
  seedStoresIfEmpty()
  persist()
  return db
}

function seedStoresIfEmpty() {
  if (!db) return
  try {
    const res = db.exec('SELECT COUNT(*) as n FROM stores')
    const count = res?.[0]?.values?.[0]?.[0] as number | undefined
    if (count !== undefined && count > 0) return
    db.run(
      'INSERT INTO stores (id, name, url, niche_theme, niche_emotion, niche_buyer, level, risk_profile, active_goal) VALUES (1, $name, $url, $theme, $emotion, $buyer, $level, $risk, $goal)',
      {
        $name: 'Vintage Tee Co',
        $url: 'https://www.etsy.com/shop/vintagetee',
        $theme: 'Retro / vintage',
        $emotion: 'Nostalji, rahat',
        $buyer: 'Hediye alıcılar, koleksiyoncular',
        $level: 'Growing',
        $risk: 'normal',
        $goal: 'Listing görünürlüğü',
      }
    )
    db.run(
      'INSERT INTO stores (id, name, url, niche_theme, niche_emotion, niche_buyer, level, risk_profile, active_goal) VALUES (2, $name, $url, $theme, $emotion, $buyer, $level, $risk, $goal)',
      {
        $name: 'Minimal Quote Shop',
        $url: 'https://www.etsy.com/shop/minimalquote',
        $theme: 'Minimal / typography',
        $emotion: 'Sakin, ilham veren',
        $buyer: 'Etsy alıcıları, hediye alanlar',
        $level: 'Beginner',
        $risk: 'low',
        $goal: 'İlk satışlar',
      }
    )
  } catch {
    // ignore seed errors
  }
}

export function getDB(): SqlJsDb {
  if (!db) throw new Error('DB not initialized')
  return db
}

function rowToObject(columns: string[], values: (string | number | null)[]): Record<string, unknown> {
  const o: Record<string, unknown> = {}
  columns.forEach((c, i) => {
    o[c] = values[i] ?? null
  })
  return o
}

// Sessions
export function insertSession(id: string, note?: string) {
  getDB().run('INSERT OR IGNORE INTO sessions (id, note) VALUES ($id, $note)', { $id: id, $note: note ?? null })
  persist()
}

export function getSession(id: string) {
  const res = getDB().exec('SELECT * FROM sessions WHERE id = $id', { $id: id })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as {
    id: string
    note: string | null
    competitor_url: string | null
    created_at: number
  }
}

export function getSessionCompetitorUrl(id: string): string | null {
  const session = getSession(id)
  return session?.competitor_url ?? null
}

export function setSessionCompetitorUrl(id: string, url: string | null) {
  getDB().run('UPDATE sessions SET competitor_url = $url WHERE id = $id', { $url: url, $id: id })
  persist()
}

export function listSessions(limit = 20) {
  const res = getDB().exec('SELECT * FROM sessions ORDER BY created_at DESC LIMIT $limit', { $limit: limit })
  if (!res.length) return []
  const rows = (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v))
  return rows as { id: string; note: string | null; competitor_url: string | null; created_at: number }[]
}

export function updateSessionNote(id: string, note: string) {
  getDB().run('UPDATE sessions SET note = $note WHERE id = $id', { $note: note, $id: id })
  persist()
}

// Stores (Gate 1)
export type StoreRow = {
  id: number
  name: string
  url: string | null
  niche_theme: string | null
  niche_emotion: string | null
  niche_buyer: string | null
  level: string
  risk_profile: string | null
  active_goal: string | null
}

export function listStores(): StoreRow[] {
  try {
    const res = getDB().exec('SELECT * FROM stores ORDER BY id ASC')
    if (!res.length || !res[0].values.length) return []
    return (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v) as StoreRow)
  } catch {
    return []
  }
}

export function updateStoreGoal(id: number, goal: string | null) {
  getDB().run('UPDATE stores SET active_goal = $goal WHERE id = $id', { $goal: goal ?? null, $id: id })
  persist()
}

// Captures
export function insertCapture(
  id: string,
  sessionId: string,
  url: string,
  htmlPath: string,
  pngPath: string,
  parseStatus?: string,
  parsedJson?: string
) {
  getDB().run(
    'INSERT INTO captures (id, session_id, url, html_path, png_path, parse_status, parsed_json) VALUES ($id, $sessionId, $url, $htmlPath, $pngPath, $parseStatus, $parsedJson)',
    { $id: id, $sessionId: sessionId, $url: url, $htmlPath: htmlPath, $pngPath: pngPath, $parseStatus: parseStatus ?? null, $parsedJson: parsedJson ?? null }
  )
  persist()
}

export function getCapture(id: string) {
  const res = getDB().exec('SELECT * FROM captures WHERE id = $id', { $id: id })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as {
    id: string
    session_id: string
    url: string
    html_path: string
    png_path: string
    created_at: number
    parse_status?: string
    parsed_json?: string
  }
}

export function listCapturesBySession(sessionId: string) {
  const res = getDB().exec('SELECT * FROM captures WHERE session_id = $sessionId ORDER BY created_at DESC', { $sessionId: sessionId })
  if (!res.length) return []
  return (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v)) as {
    id: string
    session_id: string
    url: string
    html_path: string
    png_path: string
    created_at: number
    parse_status?: string
    parsed_json?: string
  }[]
}

// Competitor captures
export function insertCompetitorCapture(id: string, sessionId: string, url: string, pngPath: string, signalsJson: string) {
  const safeSignals = signalsJson || '{}'
  const safePath = pngPath || ''
  getDB().run(
    'INSERT INTO competitor_captures (id, session_id, url, png_path, signals_json) VALUES ($id, $sessionId, $url, $pngPath, $signals)',
    { $id: id, $sessionId: sessionId, $url: url, $pngPath: safePath, $signals: safeSignals }
  )
  persist()
}

export function updateCompetitorSignals(id: string, signalsJson: string) {
  getDB().run('UPDATE competitor_captures SET signals_json = $signals WHERE id = $id', { $signals: signalsJson || '{}', $id: id })
  persist()
}

export function getLatestCompetitorCapture(sessionId: string): { id: string; signals_json: string } | undefined {
  const res = getDB().exec(
    'SELECT id, signals_json FROM competitor_captures WHERE session_id = $sid ORDER BY created_at DESC LIMIT 1',
    { $sid: sessionId }
  )
  if (!res.length || !res[0].values.length) return undefined
  const row = res[0].values[0] as (string | number | null)[]
  const cols = res[0].columns as string[]
  const obj = rowToObject(cols, row) as { id: string; signals_json: string }
  return obj
}

// AI outputs
export function insertAiOutput(id: string, captureId: string, type: string, payload: string) {
  getDB().run('INSERT INTO ai_outputs (id, capture_id, type, payload) VALUES ($id, $captureId, $type, $payload)', {
    $id: id,
    $captureId: captureId,
    $type: type,
    $payload: payload,
  })
  persist()
}

export function getAiOutputByCapture(captureId: string, type: string) {
  const res = getDB().exec('SELECT * FROM ai_outputs WHERE capture_id = $captureId AND type = $type ORDER BY created_at DESC LIMIT 1', {
    $captureId: captureId,
    $type: type,
  })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as {
    id: string
    capture_id: string
    type: string
    payload: string
    created_at: number
  }
}

// Settings
export function getSetting(key: string): string | undefined {
  const res = getDB().exec('SELECT value FROM settings WHERE key = $key', { $key: key })
  if (!res.length || !res[0].values.length) return undefined
  const v = res[0].values[0][0]
  return v != null ? String(v) : undefined
}

export function setSetting(key: string, value: string) {
  getDB().run('INSERT OR REPLACE INTO settings (key, value) VALUES ($key, $value)', { $key: key, $value: value })
  persist()
}

export function getDataDir() {
  return DATA_DIR
}

export function getAssetsDir() {
  const assets = path.join(DATA_DIR, 'assets')
  fs.mkdirSync(assets, { recursive: true })
  return assets
}

// Gate 7: neutral listing snapshots (store context only, no interpretation)
export function insertListingSnapshot(
  id: string,
  storeId: number,
  module: string,
  listingUrl: string,
  titleText: string | null,
  descriptionText: string | null,
  tagsJson: string,
  imageCount: number | null
) {
  getDB().run(
    `INSERT INTO listing_snapshots (id, store_id, module, listing_url, title_text, description_text, tags_json, image_count)
     VALUES ($id, $storeId, $module, $url, $title, $desc, $tags, $imgCount)`,
    {
      $id: id,
      $storeId: storeId,
      $module: module,
      $url: listingUrl,
      $title: titleText ?? null,
      $desc: descriptionText ?? null,
      $tags: tagsJson ?? '[]',
      $imgCount: imageCount ?? null,
    }
  )
  persist()
}

