# Production-Grade System Architecture Report

**Project:** Etsy Mentor — Electron + React (TypeScript) Desktop Application  
**Generated:** 2026-02-28  
**Purpose:** Secure, minimal architecture map for CI remediation pipeline integration (GitHub CI + GPT analysis + controlled patch agent)

---

## 1. PROJECT FILE TREE (Filtered)

**Excluded:** `node_modules`, `dist`, `build`, `coverage`, `.git`, `dist-electron`, `out`, `.env*`

```
Etsy Mentor/
├── architecture/
│   ├── snapshot-artifacts/
│   │   ├── file-tree.txt
│   │   └── gates-summary.txt
│   └── snapshot-v1.md
├── data/
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_capture_parse_status.sql
├── docs/
│   └── domain/
│       └── domain-v1.md
├── electron/
│   ├── gates/
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
├── src/
│   ├── application/
│   │   ├── AppServices.ts
│   │   ├── types.ts
│   │   └── services/
│   │       ├── CaptureService.ts
│   │       ├── GateService.ts
│   │       ├── SettingsService.ts
│   │       ├── SessionService.ts
│   │       └── StoreService.ts
│   ├── components/
│   │   ├── BrowserPane.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── MentorPanel.tsx
│   │   ├── Sidebar.tsx
│   │   └── StoreCard.tsx
│   ├── lib/
│   │   └── schemas.ts
│   ├── screens/
│   │   ├── BrowserSession.tsx
│   │   ├── Home.tsx
│   │   ├── PortfolioDashboard.tsx
│   │   └── Settings.tsx
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── types.ts
│   ├── vite-env.d.ts
├── .gitattributes
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── tsconfig.json
├── tsconfig.electron.json
├── tsconfig.node.json
└── vite.config.ts
```

**Not present:** `src/main/` (main process lives in `electron/`), `src/renderer/` (renderer is `src/` root), `src/shared/`, `src/ipc/`, `gates/` (under `electron/gates/`), `configs/`, `tests/`, `.github/`

---

## 2. PACKAGE CONFIGURATION

| Item | Value |
|------|-------|
| **name** | etsy-mentor |
| **version** | 1.0.0 |
| **main** | dist-electron/main.js |
| **private** | true |

### Scripts

| Script | Command |
|--------|---------|
| `dev` | `npm run dev:renderer` |
| `dev:renderer` | `vite --port 5173 --strictPort` |
| `dev:electron` | `tsc -p tsconfig.electron.json && npx electron .` |
| `build` | `vite build && tsc -p tsconfig.electron.json` |
| `preview` | `vite preview` |

### Dependencies

| Package | Version |
|---------|---------|
| openai | ^4.73.0 |
| react | ^18.3.1 |
| react-dom | ^18.3.1 |
| sql.js | ^1.13.0 |
| zod | ^3.23.8 |

### DevDependencies

| Package | Version |
|---------|---------|
| @types/react | ^18.3.12 |
| @types/react-dom | ^18.3.1 |
| @vitejs/plugin-react | ^4.3.3 |
| electron | ^33.4.11 |
| typescript | ^5.6.3 |
| vite | ^5.4.11 |

### Build Tools

- **Vite** (renderer): `vite.config.ts` — React plugin, `outDir: dist`, dev server port 5173
- **TypeScript** (Electron main): `tsconfig.electron.json` — `outDir: dist-electron`, `rootDir: electron`
- **electron-builder**: not present
- **Lint config**: not present (no ESLint, Prettier)
- **Test config**: not present
- **Separate build config**: `tsconfig.node.json` exists; no separate build config file

---

## 3. CI/CD WORKFLOWS

**Status:** `.github/` directory does not exist.

No GitHub Actions workflows detected. No CI/CD pipelines, status checks, or automation configured.

---

## 4. GATE SYSTEM STRUCTURE

### Gate State Storage

| Aspect | Implementation |
|--------|----------------|
| **Method** | SQLite settings table |
| **Key** | `gates.state.v1` |
| **Location** | `electron/db.ts` via `getSetting` / `setSetting` |
| **Format** | JSON: `{ version: 1, updatedAt, states: Partial<Record<GateId, GateStatus>> }` |

### Gate-Related Modules

| File | Purpose |
|------|---------|
| `electron/gates/registry.ts` | Defines `GateId`, `GateStatus`, `GateDef`, `GATE_REGISTRY` |
| `electron/gates/store.ts` | `GateState` type, `getDefaultGateState()`, `canOpen`, `setStatus`, `getStatus` |
| `electron/gates/persistence.ts` | `loadGateState()`, `saveGateState()`, `applyDevSeed()` |
| `src/application/services/GateService.ts` | Renderer-side gate check / set via `getCurrentGateState` callback |

### Gate Definitions (from `registry.ts`)

| GateId | Title | Description | Default | Deps |
|--------|-------|-------------|---------|------|
| gate7 | Gate 7 | Neutral listing recognition + back navigation | PASS | — |
| gate8 | Gate 8 | Git security setup | PASS | — |
| gate8_2 | Gate 8.2 | Stop tracking dist-electron + ignore | PASS | gate8 |
| gate9 | Gate 9 | Repo hygiene + ignore + line endings | PASS | gate8_2 |
| gate10 | Gate 10 | Gate motor enforcement (state-driven) | OPEN | gate9 |
| gate11 | Persistence | Gate state persistence | OPEN | gate10 |
| gate12 | Listing Builder MVP | Manual listing content construction | LOCKED | gate11 |

### Gate-A Logic

No explicit `gate-A` in registry. Tags `gate-A-pass`, `gate-A-recovered` exist; gate-A appears to be a checkpoint/snapshot identifier, not a runtime gate.

### PASS / FAIL Tracking

- **Status values:** `LOCKED`, `OPEN`, `PASS`
- **Boot check:** In `electron/main.ts` line ~316: if `gateState.gate9 !== 'PASS'`, `app.quit()` and startup is aborted
- **Dev override:** `GATE_DEV_SEED` env (non-production) parsed in `applyDevSeed()` — format: `gate10=PASS,gate11=OPEN`

### Snapshot / Tagging Logic

- Gate state snapshot: `loadGateState()` at boot stored in `bootGateState` (used when IPC is restored)
- No automated tagging of gate state; git tags (`gate-8-pass`, `gate-9-pass`, etc.) appear manual

### Recovery / Rollback

- No in-app rollback for gate state
- Git branches `recover-from-gate-A` and tags `gate-A-recovered` suggest external recovery via version control

---

## 5. IPC LAYER STATUS

### IPC Contract (Renderer Expectations)

Defined in `src/vite-env.d.ts` — `ElectronAPI` includes:

- `sendAppView`, `browserSetBounds`, `navGo`, `getCurrentUrl`, `onUrlChanged`
- `createSession`, `captureCreate`, `onCaptureCreated`, `onCaptureFailed`, `analyzeCapture`
- `listSessions`, `listStores`, `updateStoreGoal`, `getSession`, `getSetting`, `setSetting`
- `getCapture`, `getAiOutput`, `listCaptures`, `getCaptureImage`, `getParsedListing`, `updateSessionNote`
- `setCompetitor`, `clearCompetitor`, `getCompetitorUrl`, `competitorCapture`, `getLatestCompetitorSignals`
- `gate7CaptureListing`, `gate7SetContext`, `onGate7ListingCaptured`, `gate7CloseBrowser`

### Preload (`electron/preload.ts`)

Exposed to renderer:

| Key | Channel / Behavior |
|-----|--------------------|
| `ping` | Returns `'pong'` |
| `guardianGetInitialGreeting` | `ipcRenderer.invoke('guardian:getInitialGreeting', 1)` |
| `mentorExecuteCommand` | `ipcRenderer.invoke('mentor:executeCommand', payload)` |
| `navGo` | `ipcRenderer.invoke('nav:go', target)` |
| `sendAppView` | `ipcRenderer.send('app:view', view)` |

### Main Process

- **Comment in `main.ts`:** "IPC handlers removed until ipc/* modules are reintroduced"
- **No registration of:** `guardian:getInitialGreeting`, `mentor:executeCommand`, `nav:go`, `app:view`, or any other IPC channels
- **No `electron/ipc/` source folder**

### Disabled / Bypassed IPC

- All handlers for the channels above are not registered in main
- Renderer calls `window.electronAPI?.listStores`, `gate7CaptureListing`, etc. — these will fail at runtime (undefined / no handler)
- Gate 7 `did-finish-load` capture logic: "IPC gate7 capture logic removed until ipc/* modules are restored" (main.ts ~215–218)

### Temporary Stubs

- Preload exposes a minimal API; renderer uses optional chaining (`?.`) to tolerate missing methods
- No stub handlers in main; channels are simply unregistered

---

## 6. TEST INFRASTRUCTURE

| Item | Status |
|------|--------|
| **Test runner** | None (no Jest, Vitest, Playwright) |
| **Test folders** | None |
| **CI test commands** | N/A |
| **Coverage setup** | None |

---

## 7. DOMAIN LAYER

**Location:** `docs/domain/domain-v1.md`

### Domain Entities

| Entity | Attributes |
|--------|------------|
| User | id, level, goal, disciplineScore, createdAt |
| Store | id, userId, niche, positioning, brandDirection, kpis, createdAt |
| Concept | id, storeId, productType, targetAudience, competitionLevel, demandSignal, ideaScore, createdAt |
| Listing | id, conceptId, title, tags, descriptionQualityScore, seoScore, imageQualityScore, pricingStrategy, createdAt |
| MarketSignals | id, listingId, demandLevel, competitionIntensity, trendDirection, competitorPatterns, analyzedAt |
| MentorSession | id, userId, storeId, contextType, inputSnapshot, analysisOutput, decisionScore, createdAt |
| DecisionPlan | id, sessionId, tasks, priorityLevel, impactScore, difficultyScore, status, createdAt |
| SkillProgress | id, userId, seoLevel, productResearchLevel, brandingLevel, executionDisciplineLevel, lastUpdatedAt |

### Store-Related Models

- `StoreRow` in `electron/db.ts` — maps to `stores` table
- `src/application/services/StoreService.ts` — renderer store service

### Persistence Linkage

- SQLite via sql.js in `electron/db.ts`
- Path: `{userData}/data/app.db`
- Tables include: sessions, captures, ai_outputs, settings, competitor_captures, stores, listing_snapshots, profile_drafts, evidence_log, trends_feed, mentor_state, mentor_runtime, mentor_profile

---

## 8. ELECTRON BOOT PATH

### App Entrypoint

| Layer | File | Role |
|-------|------|------|
| Electron main | `electron/main.ts` | Main process entry |
| Renderer HTML | `index.html` | Loads `/src/main.tsx` |
| Renderer entry | `src/main.tsx` | React root + ErrorBoundary |
| App root | `src/App.tsx` | View routing (dashboard, home, session, settings) |

### Main Process Bootstrap

1. `app.whenReady()`
2. `initDB()` — SQLite init, migrations, seed
3. `loadGateState()` — gate state from settings
4. Gate 9 check: if `gateState.gate9 !== 'PASS'` → `app.quit()`
5. `createWindow()` — BrowserWindow + BrowserView (OAuth / Etsy)
6. Menu setup
7. IPC handlers: **not registered** (removed)

### Renderer Initialization

1. `index.html` loads `src/main.tsx`
2. `main.tsx` mounts `<App />` wrapped in `<ErrorBoundary>`
3. React Strict Mode disabled (per comment)
4. App switches views: dashboard, home, session, settings

### Preload Layer

- **File:** `electron/preload.ts`
- **Usage:** `path.resolve(__dirname, 'preload.js')` in BrowserWindow webPreferences
- **Bridge:** `contextBridge.exposeInMainWorld('electronAPI', api)`
- **Exposed:** `ping`, `guardianGetInitialGreeting`, `mentorExecuteCommand`, `navGo`, `sendAppView`

---

## 9. BRANCH & SNAPSHOT STATE

### Branches

| Branch | Notes |
|--------|-------|
| main | Default branch |
| pr-1 | PR branch |
| recover-from-gate-A | Recovery branch |
| work/next | Current working branch |

### Tags

| Tag | Purpose |
|-----|---------|
| gate-A-pass | Gate A passed checkpoint |
| gate-A-recovered | Gate A recovered checkpoint |
| gate-8-pass | Gate 8 passed |
| gate-8-2-pass | Gate 8.2 passed |
| gate-9-pass | Gate 9 passed |
| gate-10-pass | Gate 10 passed |
| gate-10-pre | Gate 10 pre-state |
| gate-11-pass | Gate 11 passed |

---

## 10. SYSTEM READINESS SUMMARY

| Criterion | Status | Notes |
|-----------|--------|-------|
| **CI readiness** | ❌ Low | No `.github/` workflows; no automated build/test/lint |
| **Test determinism** | ❌ None | No test framework or tests |
| **Gate stability** | ✅ Good | Gate 9 boot guard, persistence, dev seed; no migration path for registry changes |
| **IPC completeness** | ❌ Incomplete | Main handlers removed; preload exposes minimal API; renderer expects many unimplemented methods |
| **Pipeline integration readiness** | ⚠️ Partial | Gate system and domain are defined; CI, tests, and full IPC wiring are missing |

### Recommendations for Pipeline Integration

1. Add `.github/workflows/` for build, lint, and tests.
2. Restore or implement IPC handlers in main to match `ElectronAPI` in `vite-env.d.ts`.
3. Add a test runner (e.g., Vitest) and basic unit/integration tests.
4. Introduce lint/format config (ESLint, Prettier) and run them in CI.
5. Document or automate gate-state migration when the registry changes.

---

*Report generated from detected structure only. No speculation included.*
