# Architecture Snapshot v1

Generated: 2026-02-11T17:43:47.129Z

## A) Project Overview (Proje Genel)

**Stack:** Electron + React + Vite

**Evidence:**
- `package.json`: `electron`, `react`, `react-dom`, `vite` dependencies
- `electron/main.ts`: Electron main process entry point
- `src/`: React renderer source code
- `vite.config.ts`: Vite configuration

**Dev Port:** 5173
- Defined in: `vite.config.ts` (`server.port: 5173`)
- Also referenced in: `package.json` script `dev:renderer` (`--port 5173`)
- Loaded in: `electron/main.ts` (`const devUrl = 'http://localhost:5173'`)

## B) File Tree (Dosya Ağacı)

```
├── architecture
│   ├── snapshot-artifacts
│   │   ├── file-tree.txt
│   │   ├── gates-summary.txt
│   │   ├── ipc-handlers.txt
│   │   └── package-scripts.txt
│   └── snapshot-v1.md
├── data
│   └── migrations
│       ├── 001_init.sql
│       └── 002_capture_parse_status.sql
├── electron
│   ├── gates
│   │   ├── persistence.ts
│   │   ├── registry.ts
│   │   └── store.ts
│   ├── db.ts
│   ├── main.ts
│   ├── openai.ts
│   ├── parser.ts
│   ├── preload.ts
│   ├── schemas.ts
│   └── sql.js.d.ts
├── src
│   ├── components
│   │   ├── BrowserPane.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── MentorPanel.tsx
│   │   ├── Sidebar.tsx
│   │   └── StoreCard.tsx
│   ├── lib
│   │   └── schemas.ts
│   ├── screens
│   │   ├── BrowserSession.tsx
│   │   ├── Home.tsx
│   │   ├── PortfolioDashboard.tsx
│   │   └── Settings.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   └── vite-env.d.ts
├── tools
│   └── arch-snapshot.mjs
├── .gitattributes
├── .gitignore
├── index.html
├── package-lock.json
├── package.json
├── README.md
├── tsconfig.electron.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## C) Gate System (Gate Sistemi)

**Gate Registry:** `electron/gates/registry.ts`
- Defines `GateId`, `GateStatus`, `GateDef`, and `GATE_REGISTRY`

**Gate Store:** `electron/gates/store.ts`
- Defines `GateState` type and `getDefaultGateState()`
- Default state is dynamically derived from `GATE_REGISTRY` and `DEFAULT_STATUSES`

**Persistence:** `electron/gates/persistence.ts`
- `loadGateState()`: Loads from settings DB (`gates.state.v1` key), sanitizes, merges with defaults, applies dev seed
- `saveGateState(state)`: Saves to settings DB
- Dev seed parsing: `process.env.GATE_DEV_SEED` parsed in `applyDevSeed()` (format: `gate10=PASS,gate11=OPEN`)

**Gate List:**

Gate Registry:
============================================================
gate7 (Gate 7)
  Description: Neutral listing recognition + back navigation.
  Default Status: PASS
gate8 (Gate 8)
  Description: Git security setup.
  Default Status: PASS
gate8_2 (Gate 8.2)
  Description: Stop tracking dist-electron + ignore.
  Default Status: PASS
  Dependencies: gate8
gate9 (Gate 9)
  Description: Repo hygiene + ignore + line endings.
  Default Status: PASS
  Dependencies: gate8_2
gate10 (Gate 10)
  Description: Gate motor enforcement (state-driven).
  Default Status: OPEN
  Dependencies: gate9
gate11 (Persistence)
  Description: Gate state persistence.
  Default Status: OPEN
  Dependencies: gate10
gate12 (Listing Builder MVP)
  Description: Manual listing content builder (Title, Tags, Description).
  Default Status: OPEN
  Dependencies: gate11
Gate Files:
============================================================
- Registry: electron/gates/registry.ts
- Store: electron/gates/store.ts
- Persistence: electron/gates/persistence.ts
Dev Seed: Parsed from process.env.GATE_DEV_SEED in persistence.ts
  Format: "gate10=PASS,gate11=OPEN" (comma or semicolon separated)

## D) IPC Map (IPC Haritası)

All IPC handlers are registered in `electron/main.ts` via `registerIpcHandlers()`.

| Type | Channel | Location | Purpose |
|------|---------|----------|---------|
| ON | app:view | electron/main.ts:244 | App view change |
| ON | gate7:closeBrowser | electron/main.ts:264 | Gate 7: Close BrowserView |
| HANDLE | gate7:setContext | electron/main.ts:275 | Gate 7: BrowserView listing capture |
| ON | browser:setBounds | electron/main.ts:279 | BrowserView bounds update |
| HANDLE | nav:go | electron/main.ts:286 | BrowserView navigation |
| HANDLE | getCurrentUrl | electron/main.ts:295 | ' + u |
| HANDLE | session:create | electron/main.ts:300 | Session management |
| HANDLE | competitor:set | electron/main.ts:310 | Competitor analysis |
| HANDLE | competitor:clear | electron/main.ts:316 | Competitor analysis |
| HANDLE | getCompetitorUrl | electron/main.ts:321 | No description |
| HANDLE | getLatestCompetitorSignals | electron/main.ts:326 | No description |
| HANDLE | gate7:captureListing | electron/main.ts:339 | Gate 7: BrowserView listing capture |
| HANDLE | ping | electron/main.ts:361 | No description |
| HANDLE | competitor:capture | electron/main.ts:366 | Capture management |
| HANDLE | capture:create | electron/main.ts:481 | Capture management |
| HANDLE | listSessions | electron/main.ts:571 | No description |
| HANDLE | listStores | electron/main.ts:572 | No description |
| HANDLE | updateStoreGoal | electron/main.ts:573 | No description |
| HANDLE | getSession | electron/main.ts:577 | No description |
| HANDLE | getSetting | electron/main.ts:578 | No description |
| HANDLE | setSetting | electron/main.ts:579 | No description |
| HANDLE | updateSessionNote | electron/main.ts:580 | No description |
| HANDLE | getCapture | electron/main.ts:584 | No description |
| HANDLE | getAiOutput | electron/main.ts:585 | No description |
| HANDLE | listCaptures | electron/main.ts:594 | No description |
| HANDLE | getCaptureImage | electron/main.ts:599 | No description |
| HANDLE | getParsedListing | electron/main.ts:610 | No description |
| HANDLE | capture:analyze | electron/main.ts:602 | Capture management |
| HANDLE | builder:getState | electron/main.ts:620 | Listing Builder |
| HANDLE | builder:updateState | electron/main.ts:626 | Listing Builder |
| HANDLE | builder:reset | electron/main.ts:632 | Listing Builder |

**Gate Enforcement:**
- `session:create`: Guarded at `electron/main.ts:300-305` (checks `gateState.gate10`)
- `capture:create`: Guarded at `electron/main.ts:481-486` (checks `gateState.gate10`)
- `capture:analyze`: Guarded at `electron/main.ts:621-626` (checks `gateState.gate10`)

## E) Boot Flow (Başlatma Akışı)

`electron/main.ts` boot sequence:

1. app.whenReady() triggers
2. initDB() initializes database
3. loadGateState() loads persisted gate state
4. Gate 9 boot check: if not PASS, app.quit()
5. createWindow() creates BrowserWindow
6. In dev: loadURL('http://localhost:5173')
7. registerIpcHandlers() registers all IPC channels

## F) Runtime Configuration (Çalışma Ayarları)

**Environment Variables:**
- `GATE_DEV_SEED`: Override gate states in development (e.g., `gate10=PASS,gate11=OPEN`)
  - Parsed in: `electron/gates/persistence.ts` → `applyDevSeed()`
  - Only active when `NODE_ENV !== 'production'`

**Package Scripts:**

```
dev: npm run dev:renderer
dev:renderer: vite --port 5173 --strictPort
dev:electron: tsc -p tsconfig.electron.json && npx electron .
build: vite build && tsc -p tsconfig.electron.json
preview: vite preview
arch:snapshot: node tools/arch-snapshot.mjs
```

## G) Known Risks / TODO (Riskler / Yapılacaklar)

1. **Gate State Persistence:** Gate state is persisted in SQLite settings DB, but there's no migration mechanism if the gate registry changes (e.g., gates removed/renamed).

2. **IPC Handler Registration:** All handlers are registered in a single function (`registerIpcHandlers()`), which could become unwieldy as the app grows.

3. **BrowserView Lifecycle:** Gate 7 BrowserView management relies on `gate7Active` flag; potential race conditions if multiple views are attempted.

4. **Dev Seed Parsing:** Dev seed parser tolerates various formats but doesn't validate gate dependencies (e.g., setting `gate11=OPEN` without `gate10=PASS`).

5. **Error Handling:** Some IPC handlers return `null` on error without structured error responses, making error tracking difficult.

---

*Generated by tools/arch-snapshot.mjs*
