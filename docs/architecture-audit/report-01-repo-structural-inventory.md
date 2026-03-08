# REPORT-01 — REPO STRUCTURAL INVENTORY

**Project:** Etsy AI Mentor  
**Audit Date:** 2025-03-08  
**Architecture:** State-Machine AI Repair Engine  

---

## 1. Executive Summary

Etsy AI Mentor is an Electron + React + Vite application following a canonical **State-Machine AI Repair Engine** architecture. The repository contains:

- **Two Electron entry points:** Full app (`electron/main.ts`) and Desktop Control Center (`electron/desktop/main.ts`)
- **AI Repair Engine** in `electron/gates/repair/` (~60 TS files), implemented and tested but not yet wired to GitHub or desktop runtime
- **Desktop Control Center** in `electron/desktop/` and `src/desktop/` — read-only operator cockpit with bounded preload and IPC
- **GitHub Backbone** workflows in `.github/workflows/` — CI, gate-s4..s7, repair-input
- **Shared read models** in `src/shared/read-models/` — DC-3 contracts

Key structural notes: `package.json` main points to `dist-electron/main.js`, which the current build does not produce (output is `dist-electron/electron/main.js`). The `src/desktop/backbone` module runs in the main process (via IPC handlers) but lives under the renderer path. Overall structure is **partially aligned** with some configuration and ownership ambiguities.

---

## 2. Top-Level Repository Map

| Folder | Purpose | Layer |
|--------|---------|-------|
| **electron/** | Main process: full app entry, desktop entry, IPC, gates, repair engine, DB, parser, OpenAI | Main process / Repair Engine |
| **src/** | Renderer: React app (web + desktop), application services, shared types, components | Renderer UI / Shared |
| **data/** | SQLite migrations | Data |
| **docs/** | Architecture, desktop gates, domain, bootstrap | Documentation |
| **architecture/** | Snapshot v1, artifacts (file-tree, gates-summary, ipc-handlers, package-scripts) | Documentation / Artifacts |
| **.github/** | CI workflows (ci.yml, gate-s4..s7, repair-input.yml) | Workflows |
| **tools/** | arch-snapshot.mjs | Build / Tooling |
| **dist/** | Vite build output (renderer) | Build output |
| **dist-electron/** | TypeScript build output (Electron main) | Build output |

---

## 3. Module Classification Table

| Path | Role | Layer | Risk | Notes |
|------|------|-------|------|-------|
| **electron/main.ts** | Full app entry | Main process | Medium | BrowserWindow + BrowserView, gate7, DB, OpenAI, sessions. Large surface. |
| **electron/desktop/main.ts** | Desktop Control Center entry | Main process | Low | Minimal: createMainWindow, IPC registration, load index-desktop |
| **electron/desktop/create-main-window.ts** | Window factory | Desktop boundary | Low | DC-10: navigation policy, DevTools policy |
| **electron/desktop/navigation-policy.ts** | Navigation helper | Desktop boundary | Low | Pure logic, testable without Electron |
| **electron/desktop/preload/** | Preload bridge | Preload | Low | Bounded `desktopApi`; read-only invoke only |
| **electron/desktop/allowed-ipc-channels.ts** | IPC allow-list | Desktop boundary | Low | Single source of truth for channel names |
| **electron/ipc/** | IPC registry + channels + handlers | Main process | Low | Read-only channels; backbone-read, health-check |
| **electron/ipc/handlers/backbone-read.ts** | Backbone read IPC | Main process | Medium | Imports `src/desktop/backbone` (main runs desktop code) |
| **electron/gates/** | Gate registry, store, persistence | Config / State | Low | Gate state, dev seed |
| **electron/gates/repair/** | AI Repair Engine | Repair Engine | Low | State machine, actors, loop orchestrator, verdict, handoff. Not invoked from main or IPC. |
| **electron/db.ts** | SQLite (sql.js) | Main process | Medium | Sessions, captures, AI outputs, settings |
| **electron/openai.ts** | OpenAI client | Main process | Medium | GPT integration |
| **electron/parser.ts** | Listing parser | Main process | Low | Parsing logic |
| **electron/schemas.ts** | DB schemas | Main process | Low | Validation |
| **electron/shared/desktop-contracts.ts** | Minimal contracts | Shared | Low | HealthCheckResponse only |
| **src/desktop/** | Desktop Control Center UI | Renderer UI | Medium | Features + backbone; backbone runs in main |
| **src/desktop/backbone/** | Backbone read service | Shared / Boundary | Medium | Used by main via IPC; lives under renderer path |
| **src/desktop/renderer/features/** | Feature panels | Renderer UI | Low | State machine, timeline, analysis, telemetry, decision |
| **src/desktop/analysis/, decision/, telemetry/** | View-models + mappers | Boundary | Low | Map read models → view models |
| **src/shared/read-models/** | DC-3 read model contracts | Shared | Low | RepairRunView, StateMachineView, etc. |
| **src/application/** | Application services | Shared | Medium | AppServices, GateService, etc.; used by full app |
| **src/components/** | Shared React components | Renderer UI | Low | MentorPanel, Sidebar, StoreCard, etc. |
| **src/screens/** | Web app screens | Renderer UI | Low | Home, BrowserSession, PortfolioDashboard, Settings |
| **src/lib/schemas.ts** | Zod schemas | Shared | Low | Shared validation |
| **src/types.ts** | Shared types | Shared | Low | Global types |
| **data/migrations/** | SQL migrations | Data | Low | 001_init.sql, 002_capture_parse_status.sql |
| **.github/workflows/** | CI and gate workflows | Workflows | Low | ci, gate-s4..s7, repair-input |
| **docs/** | Architecture, desktop, gates | Documentation | Low | DC-1 docs, ARCHITECTURE_REPORT, etc. |
| **architecture/** | Snapshot artifacts | Documentation | Low | Snapshot v1, file-tree, gates summary |
| **tools/arch-snapshot.mjs** | Architecture snapshot generator | Config / Tooling | Low | Node script |

---

## 4. Suspicious or Ambiguous Zones

### 4.1 `package.json` main vs build output

- **Path:** `package.json` line 5  
- **Issue:** `main` is `dist-electron/main.js`  
- **Build reality:** `tsconfig.electron.json` emits `electron/main.ts` → `dist-electron/electron/main.js`  
- **Result:** `dist-electron/main.js` is never produced. `dev:electron` (`npx electron .`) may fail.

### 4.2 Two Electron entry points

- **Paths:** `electron/main.ts` and `electron/desktop/main.ts`  
- **Issue:** Different launch paths and responsibilities; selection criteria not documented.  
- **Full app:** BrowserWindow + BrowserView, gate7, DB, OpenAI, write IPC.  
- **Desktop:** Single window, read-only IPC only.

### 4.3 `src/desktop/backbone` ownership

- **Path:** `src/desktop/backbone/`  
- **Issue:** Backbone service, adapter, mapper run in the **main process** (via `electron/ipc/handlers/backbone-read.ts`) but live under a renderer path.  
- **Impact:** Semantically shared/main-process logic stored in a UI-oriented tree.

### 4.4 `tsconfig.electron.json` include vs actual dependencies

- **Path:** `tsconfig.electron.json`  
- **Include:** `electron/**`, `src/application/**`, `src/types.ts`, `src/lib/schemas.ts`  
- **Missing:** `src/desktop/**` is not included, yet `electron/ipc/handlers/backbone-read.ts` imports from it. It is compiled as a transitive dependency.

### 4.5 Orphaned repair engine

- **Path:** `electron/gates/repair/`  
- **Issue:** `runBoundedRepairLoop`, `executeRepairStep`, `runOrchestratorBridge` are exported but never called from main or IPC.  
- **Result:** Engine is implemented and tested but not integrated.

---

## 5. Preliminary Architecture Health

**Verdict: Partially aligned**

**Strengths**

- Desktop is read-only: bounded preload, IPC allow-list, navigation policy.
- Repair engine is isolated: no UI imports, no DOM.
- Shared read models separate contracts from UI.
- Tests enforce security and read-only constraints.
- Gate discipline is documented (DC-1 through DC-10).

**Weaknesses**

- `package.json` main targets a non-existent output path.
- Two Electron entry points without clear documentation of their roles.
- Backbone placement under `src/desktop/` blurs main vs renderer ownership.
- Repair engine not wired to GitHub or desktop.

**Risks**

- `dev:electron` may fail if `dist-electron/main.js` is never produced.
- Backbone placement may confuse future contributors about process boundaries.

---

## 6. Architect Questions

1. **Main entry point:** Should `package.json` `main` be `dist-electron/electron/main.js` or `dist-electron/electron/desktop/main.js`, or should a build step produce `dist-electron/main.js`?
2. **Full vs desktop app:** When should each Electron entry be used (dev vs prod vs different products)?
3. **`src/desktop/backbone` ownership:** Should it move to `src/shared/backbone-read` or `electron/shared/backbone-read` for clearer ownership?
4. **Repair engine integration:** Where should `runBoundedRepairLoop` be invoked — GitHub Actions, Electron main, or another runtime?
5. **Electron build scope:** Should `tsconfig.electron.json` explicitly include `src/desktop/**` instead of relying on transitive inclusion?
6. **DC-11 packaging:** For DC-11, which Electron entry point will be packaged as the desktop app — desktop only or full app?
