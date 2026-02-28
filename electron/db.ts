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

let inTransaction = false

function persist() {
  if (inTransaction || !db) return
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

/** Run multiple DB operations atomically; persist() is called once after COMMIT. */
export function runInTransaction(fn: () => void): void {
  const d = getDB()
  d.run('BEGIN')
  inTransaction = true
  try {
    fn()
    d.run('COMMIT')
  } catch (e) {
    try {
      d.run('ROLLBACK')
    } catch {
      // ignore
    }
    throw e
  } finally {
    inTransaction = false
    persist()
  }
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

function schemaHasTable(database: SqlJsDb, table: string): boolean {
  try {
    const result = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name=$name", { $name: table })
    return !!(result.length && result[0].values.length)
  } catch {
    return false
  }
}

/** Migration 003: onboarding (stores new columns + profile_drafts, evidence_log, trends_feed) */
function runMigration003(database: SqlJsDb) {
  if (!schemaHasTable(database, 'stores')) return
  const addCol = (col: string, typeAndDefault: string) => {
    if (!schemaHasColumn(database, 'stores', col)) {
      try {
        database.exec(`ALTER TABLE stores ADD COLUMN ${col} ${typeAndDefault}`)
      } catch {
        // ignore duplicate or invalid
      }
    }
  }
  addCol('platform', 'TEXT')
  addCol('status', "TEXT DEFAULT 'active'")
  addCol('brand_tone', 'TEXT')
  addCol('country', 'TEXT')
  addCol('language', 'TEXT')
  addCol('currency', 'TEXT')
  addCol('price_band_min', 'REAL')
  addCol('price_band_max', 'REAL')
  addCol('product_catalog_summary', 'TEXT')
  addCol('hero_products_json', 'TEXT')
  addCol('created_at', 'TEXT')
  addCol('updated_at', 'TEXT')

  if (!schemaHasTable(database, 'profile_drafts')) {
    database.exec(`
      CREATE TABLE profile_drafts (
        id TEXT PRIMARY KEY,
        store_id INTEGER,
        status TEXT NOT NULL,
        stage TEXT NOT NULL,
        proposed_name TEXT,
        proposed_url TEXT,
        proposed_platform TEXT,
        proposed_country TEXT,
        proposed_language TEXT,
        proposed_currency TEXT,
        proposed_niche_theme TEXT,
        proposed_niche_buyer TEXT,
        proposed_niche_emotion TEXT,
        proposed_brand_tone TEXT,
        proposed_level TEXT,
        proposed_price_band_min REAL,
        proposed_price_band_max REAL,
        proposed_product_catalog_summary TEXT,
        proposed_hero_products_json TEXT,
        mentor_summary TEXT,
        created_from TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_profile_drafts_store ON profile_drafts(store_id);
      CREATE INDEX IF NOT EXISTS idx_profile_drafts_status ON profile_drafts(status);
    `)
  }
  if (!schemaHasTable(database, 'evidence_log')) {
    database.exec(`
      CREATE TABLE evidence_log (
        id TEXT PRIMARY KEY,
        store_id INTEGER,
        draft_id TEXT,
        entity_type TEXT NOT NULL,
        field_key TEXT NOT NULL,
        evidence_type TEXT NOT NULL,
        evidence_ref TEXT,
        evidence_excerpt TEXT,
        evidence_json TEXT,
        source TEXT,
        confidence INTEGER,
        weight INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE,
        FOREIGN KEY (draft_id) REFERENCES profile_drafts(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_evidence_log_store ON evidence_log(store_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_log_draft ON evidence_log(draft_id);
      CREATE INDEX IF NOT EXISTS idx_evidence_log_entity_field ON evidence_log(entity_type, field_key);
    `)
  }
  if (!schemaHasTable(database, 'trends_feed')) {
    database.exec(`
      CREATE TABLE trends_feed (
        id TEXT PRIMARY KEY,
        store_id INTEGER,
        title TEXT NOT NULL,
        summary TEXT,
        category TEXT,
        trend_score INTEGER,
        growth_pct REAL,
        time_window TEXT,
        region TEXT,
        sources_json TEXT,
        evidence_id TEXT,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_trends_feed_store ON trends_feed(store_id);
      CREATE INDEX IF NOT EXISTS idx_trends_feed_status ON trends_feed(status);
      CREATE INDEX IF NOT EXISTS idx_trends_feed_created ON trends_feed(created_at);
    `)
  }

  const now = new Date().toISOString()
  if (schemaHasColumn(database, 'stores', 'created_at')) {
    try {
      database.run('UPDATE stores SET created_at = $now WHERE created_at IS NULL', { $now: now })
    } catch {
      // ignore
    }
  }
  if (schemaHasColumn(database, 'stores', 'updated_at')) {
    try {
      database.run('UPDATE stores SET updated_at = $now WHERE updated_at IS NULL', { $now: now })
    } catch {
      // ignore
    }
  }
}

/** Migration 004: mentor_state singleton for AI orchestrator (step, task list, context). */
function runMigration004(database: SqlJsDb) {
  if (schemaHasTable(database, 'mentor_state')) return
  database.exec(`
    CREATE TABLE mentor_state (
      id TEXT PRIMARY KEY,
      current_store_id INTEGER NULL,
      current_draft_id TEXT NULL,
      conversation_id TEXT NOT NULL,
      step TEXT NOT NULL,
      mode TEXT NOT NULL,
      task_list_json TEXT NOT NULL,
      context_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (current_store_id) REFERENCES stores(id) ON DELETE SET NULL,
      FOREIGN KEY (current_draft_id) REFERENCES profile_drafts(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_mentor_state_id ON mentor_state(id);
  `)
  const now = new Date().toISOString()
  database.run(
    `INSERT INTO mentor_state (id, current_store_id, current_draft_id, conversation_id, step, mode, task_list_json, context_json, updated_at)
     VALUES ('singleton', NULL, NULL, $cid, 'WELCOME', 'dashboard', '[]', '{}', $now)`,
    { $cid: 'conv_' + Date.now(), $now: now }
  )
}

/** Migration 005: mentor_runtime (workflow) + mentor_profile (learning); step is derived, not persisted. */
function runMigration005(database: SqlJsDb) {
  if (!schemaHasTable(database, 'mentor_runtime')) {
    database.exec(`
      CREATE TABLE mentor_runtime (
        id TEXT PRIMARY KEY,
        current_store_id INTEGER NULL,
        current_draft_id TEXT NULL,
        conversation_id TEXT NULL,
        mode TEXT NULL,
        task_list_json TEXT NOT NULL DEFAULT '[]',
        updated_at TEXT NOT NULL,
        FOREIGN KEY (current_store_id) REFERENCES stores(id) ON DELETE SET NULL,
        FOREIGN KEY (current_draft_id) REFERENCES profile_drafts(id) ON DELETE SET NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mentor_runtime_id ON mentor_runtime(id);
    `)
    const now = new Date().toISOString()
    database.run(
      `INSERT OR IGNORE INTO mentor_runtime (id, current_store_id, current_draft_id, conversation_id, mode, task_list_json, updated_at)
       VALUES ('singleton', NULL, NULL, NULL, 'dashboard', '[]', $now)`,
      { $now: now }
    )
  }
  if (!schemaHasTable(database, 'mentor_profile')) {
    database.exec(`
      CREATE TABLE mentor_profile (
        id TEXT PRIMARY KEY,
        user_level TEXT NOT NULL DEFAULT 'L1',
        scores_json TEXT NOT NULL DEFAULT '{}',
        weak_areas_json TEXT NOT NULL DEFAULT '[]',
        last_mistakes_json TEXT NOT NULL DEFAULT '[]',
        preferences_json TEXT NOT NULL DEFAULT '{}',
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_mentor_profile_id ON mentor_profile(id);
    `)
    const now = new Date().toISOString()
    database.run(
      `INSERT OR IGNORE INTO mentor_profile (id, user_level, scores_json, weak_areas_json, last_mistakes_json, preferences_json, updated_at)
       VALUES ('singleton', 'L1', '{}', '[]', '[]', '{}', $now)`,
      { $now: now }
    )
  }
}

function enableForeignKeys(database: SqlJsDb) {
  try {
    database.exec('PRAGMA foreign_keys = ON')
  } catch {
    // ignore
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
      enableForeignKeys(existing)
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
        runMigration003(existing)
        runMigration004(existing)
        runMigration005(existing)
        seedStoresIfEmpty()
        clearSeedStoresOnce()
        persist()
      } catch {
        // ignore
      }
      return db
    }
  }

  const SQL = await initSqlJs()
  db = new SQL.Database() as SqlJsDb
  enableForeignKeys(db)
  db.exec(LATEST_SCHEMA)
  runMigration003(db)
  runMigration004(db)
  runMigration005(db)
  seedStoresIfEmpty()
  clearSeedStoresOnce()
  persist()
  return db
}

/** Seed disabled: mağazalar kullanıcı tarafından manuel eklenir. */
function seedStoresIfEmpty() {
  if (!db) return
}

/** Eski seed mağazalarını bir kez siler; sonraki açılışlarda tekrarlanmaz. */
function clearSeedStoresOnce() {
  if (!db) return
  try {
    if (getSetting('stores_seed_cleared') === '1') return
    db.run('DELETE FROM stores')
    setSetting('stores_seed_cleared', '1')
    persist()
  } catch {
    // ignore
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

// Stores (Gate 1; extended by migration 003)
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
  platform?: string | null
  status?: string | null
  brand_tone?: string | null
  country?: string | null
  language?: string | null
  currency?: string | null
  price_band_min?: number | null
  price_band_max?: number | null
  product_catalog_summary?: string | null
  hero_products_json?: string | null
  created_at?: string | null
  updated_at?: string | null
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

export function updateStoreNiche(
  id: number,
  niche_theme: string | null,
  niche_emotion: string | null,
  niche_buyer: string | null
) {
  getDB().run(
    'UPDATE stores SET niche_theme = $theme, niche_emotion = $emotion, niche_buyer = $buyer WHERE id = $id',
    { $theme: niche_theme ?? null, $emotion: niche_emotion ?? null, $buyer: niche_buyer ?? null, $id: id }
  )
  persist()
}

export function insertStore(row: Omit<StoreRow, 'id'>): number {
  const res = getDB().exec('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM stores')
  const nextId = (res?.[0]?.values?.[0]?.[0] as number) ?? 1
  getDB().run(
    'INSERT INTO stores (id, name, url, niche_theme, niche_emotion, niche_buyer, level, risk_profile, active_goal) VALUES ($id, $name, $url, $theme, $emotion, $buyer, $level, $risk, $goal)',
    {
      $id: nextId,
      $name: row.name,
      $url: row.url ?? null,
      $theme: row.niche_theme ?? null,
      $emotion: row.niche_emotion ?? null,
      $buyer: row.niche_buyer ?? null,
      $level: row.level,
      $risk: row.risk_profile ?? null,
      $goal: row.active_goal ?? null,
    }
  )
  persist()
  return nextId
}

export function getStore(id: number): StoreRow | undefined {
  const res = getDB().exec('SELECT * FROM stores WHERE id = $id', { $id: id })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as StoreRow
}

type StoreDraftUpdateRow = {
  name?: string | null
  url?: string | null
  platform?: string | null
  status?: string | null
  niche_theme?: string | null
  niche_emotion?: string | null
  niche_buyer?: string | null
  brand_tone?: string | null
  level?: string | null
  country?: string | null
  language?: string | null
  currency?: string | null
  price_band_min?: number | null
  price_band_max?: number | null
  product_catalog_summary?: string | null
  hero_products_json?: string | null
}

const STORE_DRAFT_FIELDS: { key: keyof StoreDraftUpdateRow; col: string }[] = [
  { key: 'name', col: 'name' },
  { key: 'url', col: 'url' },
  { key: 'platform', col: 'platform' },
  { key: 'status', col: 'status' },
  { key: 'niche_theme', col: 'niche_theme' },
  { key: 'niche_emotion', col: 'niche_emotion' },
  { key: 'niche_buyer', col: 'niche_buyer' },
  { key: 'brand_tone', col: 'brand_tone' },
  { key: 'level', col: 'level' },
  { key: 'country', col: 'country' },
  { key: 'language', col: 'language' },
  { key: 'currency', col: 'currency' },
  { key: 'price_band_min', col: 'price_band_min' },
  { key: 'price_band_max', col: 'price_band_max' },
  { key: 'product_catalog_summary', col: 'product_catalog_summary' },
  { key: 'hero_products_json', col: 'hero_products_json' },
]

/** Full store update (used only when committing a profile draft). Dynamic SET: only fields with value !== undefined are updated; undefined does not overwrite. */
export function updateStoreFromDraft(id: number, row: StoreDraftUpdateRow) {
  const now = new Date().toISOString()
  const setClauses: string[] = ['updated_at = $updatedAt']
  const params: Record<string, unknown> = { $id: id, $updatedAt: now }
  for (const { key, col } of STORE_DRAFT_FIELDS) {
    const v = row[key]
    if (v === undefined) continue
    setClauses.push(`${col} = $${col}`)
    params['$' + col] = v
  }
  if (setClauses.length <= 1) return
  getDB().run(`UPDATE stores SET ${setClauses.join(', ')} WHERE id = $id`, params as any)
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

// --- Profile drafts (onboarding) ---
export type ProfileDraftRow = {
  id: string
  store_id: number | null
  status: string
  stage: string
  proposed_name: string | null
  proposed_url: string | null
  proposed_platform: string | null
  proposed_country: string | null
  proposed_language: string | null
  proposed_currency: string | null
  proposed_niche_theme: string | null
  proposed_niche_buyer: string | null
  proposed_niche_emotion: string | null
  proposed_brand_tone: string | null
  proposed_level: string | null
  proposed_price_band_min: number | null
  proposed_price_band_max: number | null
  proposed_product_catalog_summary: string | null
  proposed_hero_products_json: string | null
  mentor_summary: string | null
  created_from: string | null
  created_at: string
  updated_at: string
}

export function insertProfileDraft(row: ProfileDraftRow) {
  const d = getDB()
  d.run(
    `INSERT INTO profile_drafts (id, store_id, status, stage, proposed_name, proposed_url, proposed_platform, proposed_country, proposed_language, proposed_currency,
     proposed_niche_theme, proposed_niche_buyer, proposed_niche_emotion, proposed_brand_tone, proposed_level,
     proposed_price_band_min, proposed_price_band_max, proposed_product_catalog_summary, proposed_hero_products_json,
     mentor_summary, created_from, created_at, updated_at)
     VALUES ($id, $storeId, $status, $stage, $name, $url, $platform, $country, $language, $currency,
     $theme, $buyer, $emotion, $brandTone, $level, $priceMin, $priceMax, $catalogSummary, $heroJson,
     $mentorSummary, $createdFrom, $createdAt, $updatedAt)`,
    {
      $id: row.id,
      $storeId: row.store_id ?? null,
      $status: row.status,
      $stage: row.stage,
      $name: row.proposed_name ?? null,
      $url: row.proposed_url ?? null,
      $platform: row.proposed_platform ?? null,
      $country: row.proposed_country ?? null,
      $language: row.proposed_language ?? null,
      $currency: row.proposed_currency ?? null,
      $theme: row.proposed_niche_theme ?? null,
      $buyer: row.proposed_niche_buyer ?? null,
      $emotion: row.proposed_niche_emotion ?? null,
      $brandTone: row.proposed_brand_tone ?? null,
      $level: row.proposed_level ?? null,
      $priceMin: row.proposed_price_band_min ?? null,
      $priceMax: row.proposed_price_band_max ?? null,
      $catalogSummary: row.proposed_product_catalog_summary ?? null,
      $heroJson: row.proposed_hero_products_json ?? null,
      $mentorSummary: row.mentor_summary ?? null,
      $createdFrom: row.created_from ?? null,
      $createdAt: row.created_at,
      $updatedAt: row.updated_at,
    }
  )
  persist()
}

export function getProfileDraft(id: string): ProfileDraftRow | undefined {
  const res = getDB().exec('SELECT * FROM profile_drafts WHERE id = $id', { $id: id })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as ProfileDraftRow
}

export function updateProfileDraftProposed(
  id: string,
  updates: Partial<Pick<ProfileDraftRow, 'proposed_name' | 'proposed_url' | 'proposed_platform' | 'proposed_country' | 'proposed_language' | 'proposed_currency' | 'proposed_niche_theme' | 'proposed_niche_buyer' | 'proposed_niche_emotion' | 'proposed_brand_tone' | 'proposed_level' | 'proposed_price_band_min' | 'proposed_price_band_max' | 'proposed_product_catalog_summary' | 'proposed_hero_products_json' | 'mentor_summary'>>
) {
  const now = new Date().toISOString()
  const d = getDB()
  const setClauses: string[] = ['updated_at = $updatedAt']
  const params: Record<string, unknown> = { $id: id, $updatedAt: now }
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) continue
    setClauses.push(`${k} = $${k}`)
    params['$' + k] = v
  }
  if (setClauses.length <= 1) return
  d.run(`UPDATE profile_drafts SET ${setClauses.join(', ')} WHERE id = $id`, params as any)
  persist()
}

export function updateProfileDraftStatus(id: string, status: string, stage?: string) {
  const now = new Date().toISOString()
  if (stage !== undefined) {
    getDB().run('UPDATE profile_drafts SET status = $status, stage = $stage, updated_at = $updatedAt WHERE id = $id', { $id: id, $status: status, $stage: stage, $updatedAt: now })
  } else {
    getDB().run('UPDATE profile_drafts SET status = $status, updated_at = $updatedAt WHERE id = $id', { $id: id, $status: status, $updatedAt: now })
  }
  persist()
}

export function listProfileDraftsByStore(storeId: number | null): ProfileDraftRow[] {
  const res = storeId == null
    ? getDB().exec('SELECT * FROM profile_drafts WHERE store_id IS NULL ORDER BY created_at DESC')
    : getDB().exec('SELECT * FROM profile_drafts WHERE store_id = $storeId ORDER BY created_at DESC', { $storeId: storeId })
  if (!res.length || !res[0].values.length) return []
  return (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v) as ProfileDraftRow)
}

// --- Evidence log ---
export type EvidenceLogRow = {
  id: string
  store_id: number | null
  draft_id: string | null
  entity_type: string
  field_key: string
  evidence_type: string
  evidence_ref: string | null
  evidence_excerpt: string | null
  evidence_json: string | null
  source: string | null
  confidence: number | null
  weight: number | null
  created_at: string
}

export function insertEvidence(row: EvidenceLogRow) {
  getDB().run(
    `INSERT INTO evidence_log (id, store_id, draft_id, entity_type, field_key, evidence_type, evidence_ref, evidence_excerpt, evidence_json, source, confidence, weight, created_at)
     VALUES ($id, $storeId, $draftId, $entityType, $fieldKey, $evidenceType, $evidenceRef, $evidenceExcerpt, $evidenceJson, $source, $confidence, $weight, $createdAt)`,
    {
      $id: row.id,
      $storeId: row.store_id ?? null,
      $draftId: row.draft_id ?? null,
      $entityType: row.entity_type,
      $fieldKey: row.field_key,
      $evidenceType: row.evidence_type,
      $evidenceRef: row.evidence_ref ?? null,
      $evidenceExcerpt: row.evidence_excerpt ?? null,
      $evidenceJson: row.evidence_json ?? null,
      $source: row.source ?? null,
      $confidence: row.confidence ?? null,
      $weight: row.weight ?? null,
      $createdAt: row.created_at,
    }
  )
  persist()
}

export function listEvidenceByDraft(draftId: string): EvidenceLogRow[] {
  const res = getDB().exec('SELECT * FROM evidence_log WHERE draft_id = $draftId ORDER BY created_at', { $draftId: draftId })
  if (!res.length || !res[0].values.length) return []
  return (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v) as EvidenceLogRow)
}

export function listEvidenceByStoreAndField(storeId: number, entityType: string, fieldKey: string): EvidenceLogRow[] {
  const res = getDB().exec('SELECT * FROM evidence_log WHERE store_id = $storeId AND entity_type = $entityType AND field_key = $fieldKey ORDER BY created_at DESC', { $storeId: storeId, $entityType: entityType, $fieldKey: fieldKey })
  if (!res.length || !res[0].values.length) return []
  return (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v) as EvidenceLogRow)
}

// --- Trends feed ---
export type TrendsFeedRow = {
  id: string
  store_id: number | null
  title: string
  summary: string | null
  category: string | null
  trend_score: number | null
  growth_pct: number | null
  time_window: string | null
  region: string | null
  sources_json: string | null
  evidence_id: string | null
  status: string
  created_at: string
}

const TRENDS_VALID_STATUSES = ['active', 'saved', 'dismissed'] as const

export function insertTrend(row: TrendsFeedRow) {
  const status = TRENDS_VALID_STATUSES.includes(row.status as any) ? row.status : 'active'
  getDB().run(
    `INSERT INTO trends_feed (id, store_id, title, summary, category, trend_score, growth_pct, time_window, region, sources_json, evidence_id, status, created_at)
     VALUES ($id, $storeId, $title, $summary, $category, $trendScore, $growthPct, $timeWindow, $region, $sourcesJson, $evidenceId, $status, $createdAt)`,
    {
      $id: row.id,
      $storeId: row.store_id ?? null,
      $title: row.title,
      $summary: row.summary ?? null,
      $category: row.category ?? null,
      $trendScore: row.trend_score ?? null,
      $growthPct: row.growth_pct ?? null,
      $timeWindow: row.time_window ?? null,
      $region: row.region ?? null,
      $sourcesJson: row.sources_json ?? null,
      $evidenceId: row.evidence_id ?? null,
      $status: status,
      $createdAt: row.created_at,
    }
  )
  persist()
}

/** status filter: 'active' | 'saved' | 'dismissed'; default 'active'. */
export function listTrends(storeId: number | null, limit = 20, statusFilter: string = 'active'): TrendsFeedRow[] {
  const params: Record<string, unknown> = { $limit: limit, $status: statusFilter }
  const res = storeId == null
    ? getDB().exec('SELECT * FROM trends_feed WHERE status = $status ORDER BY created_at DESC LIMIT $limit', { ...params })
    : getDB().exec('SELECT * FROM trends_feed WHERE status = $status AND (store_id = $storeId OR store_id IS NULL) ORDER BY created_at DESC LIMIT $limit', { ...params, $storeId: storeId })
  if (!res.length || !res[0].values.length) return []
  return (res[0].values as (string | number | null)[][]).map((v) => rowToObject(res[0].columns as string[], v) as TrendsFeedRow)
}

export function updateTrendStatus(id: string, status: string) {
  const normalized = TRENDS_VALID_STATUSES.includes(status as any) ? status : 'active'
  getDB().run('UPDATE trends_feed SET status = $status WHERE id = $id', { $id: id, $status: normalized })
  persist()
}

export function getTrend(id: string): TrendsFeedRow | undefined {
  const res = getDB().exec('SELECT * FROM trends_feed WHERE id = $id', { $id: id })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as TrendsFeedRow
}

// --- Mentor state (migration 004) ---
export type MentorStateRow = {
  id: string
  current_store_id: number | null
  current_draft_id: string | null
  conversation_id: string
  step: string
  mode: string
  task_list_json: string
  context_json: string
  updated_at: string
}

const MENTOR_STATE_ID = 'singleton'

/** @legacy Migration 004. Read-only; active state is mentor_runtime + mentor_profile. Do not call upsertMentorState from app code. */
export function getMentorState(): MentorStateRow | undefined {
  const res = getDB().exec('SELECT * FROM mentor_state WHERE id = $id', { $id: MENTOR_STATE_ID })
  if (!res.length || !res[0].values.length) return undefined
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as MentorStateRow
}

/** @legacy Migration 004. mentor_state is read-only; use upsertMentorRuntime/upsertMentorProfile instead. */
export function upsertMentorState(patch: Partial<Omit<MentorStateRow, 'id'>>): void {
  const existing = getMentorState()
  const now = new Date().toISOString()
  const row: MentorStateRow = {
    id: MENTOR_STATE_ID,
    current_store_id: patch.current_store_id !== undefined ? patch.current_store_id : existing?.current_store_id ?? null,
    current_draft_id: patch.current_draft_id !== undefined ? patch.current_draft_id : existing?.current_draft_id ?? null,
    conversation_id: patch.conversation_id !== undefined ? patch.conversation_id : existing?.conversation_id ?? 'conv_' + Date.now(),
    step: patch.step !== undefined ? patch.step : existing?.step ?? 'WELCOME',
    mode: patch.mode !== undefined ? patch.mode : existing?.mode ?? 'dashboard',
    task_list_json: patch.task_list_json !== undefined ? patch.task_list_json : existing?.task_list_json ?? '[]',
    context_json: patch.context_json !== undefined ? patch.context_json : existing?.context_json ?? '{}',
    updated_at: now,
  }
  if (existing) {
    getDB().run(
      `UPDATE mentor_state SET current_store_id = $storeId, current_draft_id = $draftId, conversation_id = $convId, step = $step, mode = $mode, task_list_json = $taskList, context_json = $context, updated_at = $updated WHERE id = $id`,
      {
        $id: row.id,
        $storeId: row.current_store_id,
        $draftId: row.current_draft_id,
        $convId: row.conversation_id,
        $step: row.step,
        $mode: row.mode,
        $taskList: row.task_list_json,
        $context: row.context_json,
        $updated: row.updated_at,
      }
    )
  } else {
    getDB().run(
      `INSERT INTO mentor_state (id, current_store_id, current_draft_id, conversation_id, step, mode, task_list_json, context_json, updated_at) VALUES ($id, $storeId, $draftId, $convId, $step, $mode, $taskList, $context, $updated)`,
      {
        $id: row.id,
        $storeId: row.current_store_id,
        $draftId: row.current_draft_id,
        $convId: row.conversation_id,
        $step: row.step,
        $mode: row.mode,
        $taskList: row.task_list_json,
        $context: row.context_json,
        $updated: row.updated_at,
      }
    )
  }
  persist()
}

/** @legacy Migration 004. Use resetMentorRuntime/resetMentorProfile for active state. */
export function resetMentorState(): void {
  const now = new Date().toISOString()
  getDB().run(
    `UPDATE mentor_state SET current_store_id = NULL, current_draft_id = NULL, conversation_id = $cid, step = 'WELCOME', mode = 'dashboard', task_list_json = '[]', context_json = '{}', updated_at = $now WHERE id = $id`,
    { $id: MENTOR_STATE_ID, $cid: 'conv_' + Date.now(), $now: now }
  )
  persist()
}

// --- Mentor runtime (migration 005) ---
export type MentorRuntimeRow = {
  id: string
  current_store_id: number | null
  current_draft_id: string | null
  conversation_id: string | null
  mode: string | null
  task_list_json: string
  updated_at: string
}

const MENTOR_RUNTIME_ID = 'singleton'

export function getMentorRuntime(): MentorRuntimeRow | null {
  if (!schemaHasTable(getDB(), 'mentor_runtime')) return null
  const res = getDB().exec('SELECT * FROM mentor_runtime WHERE id = $id', { $id: MENTOR_RUNTIME_ID })
  if (!res.length || !res[0].values.length) return null
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as MentorRuntimeRow
}

export function upsertMentorRuntime(patch: Partial<Omit<MentorRuntimeRow, 'id'>>): void {
  const existing = getMentorRuntime()
  const now = new Date().toISOString()
  const row: MentorRuntimeRow = {
    id: MENTOR_RUNTIME_ID,
    current_store_id: patch.current_store_id !== undefined ? patch.current_store_id : existing?.current_store_id ?? null,
    current_draft_id: patch.current_draft_id !== undefined ? patch.current_draft_id : existing?.current_draft_id ?? null,
    conversation_id: patch.conversation_id !== undefined ? patch.conversation_id : existing?.conversation_id ?? null,
    mode: patch.mode !== undefined ? patch.mode : existing?.mode ?? 'dashboard',
    task_list_json: patch.task_list_json !== undefined ? patch.task_list_json : existing?.task_list_json ?? '[]',
    updated_at: now,
  }
  if (existing) {
    getDB().run(
      `UPDATE mentor_runtime SET current_store_id = $storeId, current_draft_id = $draftId, conversation_id = $convId, mode = $mode, task_list_json = $taskList, updated_at = $updated WHERE id = $id`,
      {
        $id: row.id,
        $storeId: row.current_store_id,
        $draftId: row.current_draft_id,
        $convId: row.conversation_id,
        $mode: row.mode,
        $taskList: row.task_list_json,
        $updated: row.updated_at,
      }
    )
  } else {
    getDB().run(
      `INSERT INTO mentor_runtime (id, current_store_id, current_draft_id, conversation_id, mode, task_list_json, updated_at) VALUES ($id, $storeId, $draftId, $convId, $mode, $taskList, $updated)`,
      {
        $id: row.id,
        $storeId: row.current_store_id,
        $draftId: row.current_draft_id,
        $convId: row.conversation_id,
        $mode: row.mode,
        $taskList: row.task_list_json,
        $updated: row.updated_at,
      }
    )
  }
  persist()
}

export function resetMentorRuntime(): void {
  const now = new Date().toISOString()
  if (!schemaHasTable(getDB(), 'mentor_runtime')) return
  getDB().run(
    `UPDATE mentor_runtime SET current_store_id = NULL, current_draft_id = NULL, conversation_id = NULL, task_list_json = '[]', updated_at = $now WHERE id = $id`,
    { $id: MENTOR_RUNTIME_ID, $now: now }
  )
  persist()
}

// --- Mentor profile (migration 005) ---
export type MentorProfileRow = {
  id: string
  user_level: string
  scores_json: string
  weak_areas_json: string
  last_mistakes_json: string
  preferences_json: string
  updated_at: string
}

const MENTOR_PROFILE_ID = 'singleton'

const LAST_MISTAKES_MAX = 20

export function getMentorProfile(): MentorProfileRow | null {
  if (!schemaHasTable(getDB(), 'mentor_profile')) return null
  const res = getDB().exec('SELECT * FROM mentor_profile WHERE id = $id', { $id: MENTOR_PROFILE_ID })
  if (!res.length || !res[0].values.length) return null
  return rowToObject(res[0].columns as string[], res[0].values[0] as (string | number | null)[]) as MentorProfileRow
}

export function upsertMentorProfile(patch: Partial<Omit<MentorProfileRow, 'id'>>): void {
  const existing = getMentorProfile()
  const now = new Date().toISOString()
  const row: MentorProfileRow = {
    id: MENTOR_PROFILE_ID,
    user_level: patch.user_level !== undefined ? patch.user_level : existing?.user_level ?? 'L1',
    scores_json: patch.scores_json !== undefined ? patch.scores_json : existing?.scores_json ?? '{}',
    weak_areas_json: patch.weak_areas_json !== undefined ? patch.weak_areas_json : existing?.weak_areas_json ?? '[]',
    last_mistakes_json: patch.last_mistakes_json !== undefined ? patch.last_mistakes_json : existing?.last_mistakes_json ?? '[]',
    preferences_json: patch.preferences_json !== undefined ? patch.preferences_json : existing?.preferences_json ?? '{}',
    updated_at: now,
  }
  if (existing) {
    getDB().run(
      `UPDATE mentor_profile SET user_level = $level, scores_json = $scores, weak_areas_json = $weak, last_mistakes_json = $mistakes, preferences_json = $prefs, updated_at = $updated WHERE id = $id`,
      {
        $id: row.id,
        $level: row.user_level,
        $scores: row.scores_json,
        $weak: row.weak_areas_json,
        $mistakes: row.last_mistakes_json,
        $prefs: row.preferences_json,
        $updated: row.updated_at,
      }
    )
  } else {
    getDB().run(
      `INSERT INTO mentor_profile (id, user_level, scores_json, weak_areas_json, last_mistakes_json, preferences_json, updated_at) VALUES ($id, $level, $scores, $weak, $mistakes, $prefs, $updated)`,
      {
        $id: row.id,
        $level: row.user_level,
        $scores: row.scores_json,
        $weak: row.weak_areas_json,
        $mistakes: row.last_mistakes_json,
        $prefs: row.preferences_json,
        $updated: row.updated_at,
      }
    )
  }
  persist()
}

export function resetMentorProfile(): void {
  const now = new Date().toISOString()
  if (!schemaHasTable(getDB(), 'mentor_profile')) return
  getDB().run(
    `UPDATE mentor_profile SET user_level = 'L1', scores_json = '{}', weak_areas_json = '[]', last_mistakes_json = '[]', updated_at = $now WHERE id = $id`,
    { $id: MENTOR_PROFILE_ID, $now: now }
  )
  persist()
}export { LAST_MISTAKES_MAX }