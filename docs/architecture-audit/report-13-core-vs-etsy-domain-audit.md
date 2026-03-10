# REPORT-13 — Core Engine vs Etsy Domain Architecture Audit

**Project:** Etsy AI Mentor / AI-DevOS  
**Audit Date:** 2025-03-08  
**Scope:** Full repository classification for extraction feasibility  

---

## STEP 1 — Repository Overview

### High-Level Architecture

The repository is a **dual-mode Electron application**:

1. **Full app** (`index.html` → `src/main.tsx` → `src/App.tsx`): Etsy Mentor product — store management, browser session, capture, SEO audit, mentor chat.
2. **Desktop Control Center** (`index-desktop.html` → `src/desktop/main.tsx`): Read-only operator cockpit for repair engine observability — state machine, repair timeline, telemetry, decision console.

### Major Subsystems

| Subsystem | Location | Purpose |
|-----------|----------|---------|
| **Hero system** | `src/heroes/` | Event-to-hero selection, execution, projection. Domain-agnostic reasoning layer. **Not yet wired into UI or Electron.** |
| **Runtime** | `src/heroes/runtime/` | Thin orchestration over registry + executor. Maps `HeroExecutionContext` → `HeroExecutionResult`. |
| **Pipeline** | `src/heroes/pipeline/` | Single entry point: `HeroEvent` → `HeroSelector` → `HeroRuntime` → `HeroPipelineResult`. |
| **Projection** | `src/heroes/projection/` | Maps `HeroPipelineResult` → `HeroReadModel` for UI/telemetry. |
| **Desktop** | `src/desktop/`, `electron/desktop/` | Read-only Control Center: backbone read service, IPC, preload, update service. |
| **Repair engine** | `electron/gates/repair/` | State-machine AI repair loop: bounded retries, actors, verdicts, handoff. Domain-agnostic. |
| **Decision console** | `src/desktop/renderer/features/decision/` | Human Decision Console UI; displays `DecisionView` from repair handoff. |
| **Domain logic** | `src/application/`, `src/screens/`, `src/components/` | Etsy-specific: Store, Capture, Session, SEO, mentor flows. |

---

## STEP 2 — File Classification

### A) CORE ENGINE (domain-agnostic infrastructure)

| Path | Description |
|------|-------------|
| **src/heroes/** | Hero Ministry — core, runtime, selection, pipeline, projection, contracts, heroes (ci-failure, review, analysis, escalation) |
| **src/shared/** | `read-models/` (RepairRunView, StateMachineView, etc.), `deterministic.ts` |
| **electron/gates/** | Repair engine, store, persistence, registry |
| **electron/desktop/** | Main process, preload, create-main-window, navigation-policy, update-service |
| **electron/ipc/** | IPC channels, handlers (health-check, backbone-read) |
| **electron/shared/** | `desktop-contracts.ts` |
| **src/desktop/backbone/** | Backbone read service, adapter, mapper, types — maps engine output to read models |
| **src/desktop/analysis/** | `analysis-view.mapper.ts`, `analysis.view-model.ts` — maps shared read models to UI view models |
| **src/desktop/decision/** | `decision-view.mapper.ts`, `decision.view-model.ts` — maps DecisionView to UI |
| **src/desktop/telemetry/** | `telemetry-view.mapper.ts`, `telemetry.view-model.ts` — maps TelemetryView to UI |
| **src/desktop/renderer/** | UI shell, features (state-machine, repair-timeline, analysis, telemetry, decision), shared UI primitives |
| **src/desktop/App.tsx** | Desktop Control Center shell — uses backbone IPC only |
| **src/desktop/main.tsx** | Desktop React entry |
| **src/desktop/main.ts** | Desktop bootstrap |
| **src/desktop/app.ts** | Desktop app init with mockRepairRunView |
| **src/desktop/desktop.d.ts** | Preload API typings |

### B) ETSY DOMAIN (legacy Etsy mentor logic)

| Path | Description |
|------|-------------|
| **src/types.ts** | `Session`, `Capture`, `Store` — Etsy entities |
| **src/application/AppServices.ts** | Wires SessionService, CaptureService, StoreService, GateService — Etsy flows |
| **src/application/services/SessionService.ts** | Session CRUD |
| **src/application/services/CaptureService.ts** | Capture, `runSeoAudit`, listing capture, AI output |
| **src/application/services/StoreService.ts** | Store list, update goal |
| **src/application/services/SettingsService.ts** | Settings (used by both) |
| **src/application/services/GateService.ts** | Gate state checks (used by both) |
| **src/screens/Home.tsx** | Session list UI |
| **src/screens/PortfolioDashboard.tsx** | Store cards, MentorPanel, Gate 7 SEO capture, `listStores`, `updateStoreGoal` |
| **src/screens/BrowserSession.tsx** | Browser pane, capture, analyze, Etsy listing URLs |
| **src/screens/Settings.tsx** | Settings UI |
| **src/components/Sidebar.tsx** | SEO/prompt/history tabs, listing badge, capture list — Etsy-specific |
| **src/components/MentorPanel.tsx** | SEO Audit, Prompt Studio, module confirm — Etsy mentor flows |
| **src/components/StoreCard.tsx** | Store display |
| **src/components/BrowserPane.tsx** | Embedded browser for captures |
| **src/components/ErrorBoundary.tsx** | Generic; used by both |
| **src/App.tsx** | Full app shell — Home, PortfolioDashboard, BrowserSession, Settings |
| **src/main.tsx** | Full app React entry |
| **src/lib/schemas.ts** | `ParsedListingSchema`, `SeoAuditResultSchema` — Etsy listing/SEO |
| **electron/main.ts** | Full app main process — BrowserView, Gate 7, captureListingSnapshot, runSeoAudit, createAppServices |
| **electron/db.ts** | SQLite — sessions, captures, stores, ai_output, competitor_capture, listing_snapshot |
| **electron/openai.ts** | `runSeoAudit` — Etsy SEO audit |
| **electron/parser.ts** | `parseListing` — Etsy listing HTML parse |
| **index.html** | Full app entry |

### C) MIXED / DEPENDENCY RISK

| Path | Risk | Notes |
|------|------|-------|
| **src/application/types.ts** | LOW | `GateState`, `GateBlockedError` — generic; used by electron/main |
| **electron/main.ts** | HIGH | Imports AppServices, GateBlockedError; runs full Etsy flow. Desktop entry (`electron/desktop/main.ts`) is separate. |
| **src/application/AppServices.ts** | MEDIUM | Uses Etsy types (Session, Capture, Store) but also GateService. GateService is generic. |
| **electron/desktop/engine-backed-provider.ts** | LOW | Imports `src/shared/read-models` and `src/desktop/backbone` — core + desktop only. No Etsy. |
| **src/desktop/backbone/backbone-read.adapter.ts** | LOW | Imports from shared read-models. Adapter uses engine-backed-provider; no Etsy. |

---

## STEP 3 — Dependency Mapping

### Core → Etsy

| Core File | Imports Etsy | Notes |
|-----------|--------------|-------|
| None | — | **Core engine does not import Etsy domain.** Heroes, repair engine, shared read-models, desktop backbone are Etsy-free. |

### Etsy → Core

| Etsy File | Imports Core | Notes |
|-----------|--------------|-------|
| `electron/main.ts` | `AppServices`, `GateBlockedError` | Full app main process uses application layer |
| `src/application/AppServices.ts` | `GateService` (from types) | GateService is in application/ |
| `src/screens/*` | `../types`, `../components` | Etsy screens use Etsy types |

### Electron Structure

- **electron/desktop/main.ts** — Desktop Control Center. Uses `backbone-read`, `engine-backed-provider`. **No Etsy imports.**
- **electron/main.ts** — Full app. Uses `createAppServices`, `runSeoAudit`, `parseListing`, `db`. **Heavy Etsy coupling.**
- **electron/gates/** — Repair engine. **No Etsy imports.**
- **electron/ipc/** — Handlers. `backbone-read` uses engine-backed-provider; **no Etsy.** Full app has separate IPC in main.ts.

### Coupling Risks

1. **Single electron/main.ts** — Full app and some shared setup live in one file. Desktop has its own entry.
2. **electron/db.ts** — Schemas for sessions, captures, stores, ai_output, etc. Etsy-specific. Desktop does not use it.
3. **Vite build** — Two entries: `main` (Etsy) and `desktop` (core). Already separated.

---

## STEP 4 — Extraction Feasibility

### 1. Files That Can Be Moved Immediately (to Etsy-only repo)

All Etsy domain files can move as a coherent unit:

```
src/types.ts
src/App.tsx
src/main.tsx
src/screens/Home.tsx
src/screens/PortfolioDashboard.tsx
src/screens/BrowserSession.tsx
src/screens/Settings.tsx
src/components/Sidebar.tsx
src/components/MentorPanel.tsx
src/components/StoreCard.tsx
src/components/BrowserPane.tsx
src/application/AppServices.ts
src/application/services/SessionService.ts
src/application/services/CaptureService.ts
src/application/services/StoreService.ts
src/lib/schemas.ts
index.html
```

Plus from electron (would need a fork or shared package):

```
electron/main.ts (full app logic only)
electron/db.ts
electron/openai.ts
electron/parser.ts
```

### 2. Files That Require Refactoring Before Moving

| File | Refactor |
|------|----------|
| **src/application/AppServices.ts** | Extract `GateService`, `SettingsService` into a shared package if both apps need them. |
| **src/application/types.ts** | Keep `GateBlockedError`, `GateStatus`, `GateState` in core; Etsy app can depend on it. |
| **electron/main.ts** | Split: one module for full-app setup (BrowserView, Gate 7, capture, SEO), one for shared Electron bootstrap. |

### 3. Files That Must Remain in Core Engine

```
src/heroes/**           # Hero Ministry
src/shared/**           # Read models, deterministic
src/desktop/**          # Desktop Control Center (except any Etsy-specific panels — none found)
electron/desktop/**     # Desktop main process
electron/gates/**       # Repair engine
electron/ipc/**         # IPC (backbone-read is core)
electron/shared/**      # desktop-contracts
index-desktop.html      # Desktop entry
```

---

## STEP 5 — Final Architecture Diagram

```
CORE ENGINE (domain-agnostic)
├── src/heroes/
│   ├── core/           # Types, registry, executor
│   ├── runtime/        # HeroExecutionContext → HeroExecutionResult
│   ├── selection/      # HeroEvent → HeroSelectionResult
│   ├── pipeline/       # HeroPipeline: event → selector → runtime
│   ├── projection/     # HeroPipelineResult → HeroReadModel
│   ├── contracts/      # HeroAdvice, HeroRiskLevel, HeroActionSuggestion
│   └── heroes/         # ci-failure, review, analysis, escalation
├── src/shared/
│   ├── read-models/    # RepairRunView, StateMachineView, etc.
│   └── deterministic.ts
├── src/desktop/        # Control Center UI + backbone
│   ├── backbone/       # Backbone read service, adapter, mapper
│   ├── analysis/       # Analysis view model
│   ├── decision/       # Decision view model
│   ├── telemetry/      # Telemetry view model
│   └── renderer/       # State machine, repair timeline, panels
├── electron/
│   ├── desktop/        # Desktop main, preload, update
│   ├── gates/          # Repair engine
│   ├── ipc/            # Handlers (health, backbone-read)
│   └── shared/         # desktop-contracts
└── index-desktop.html

ETSY DOMAIN (legacy)
├── src/
│   ├── types.ts        # Session, Capture, Store
│   ├── App.tsx         # Full app shell
│   ├── main.tsx        # Full app entry
│   ├── screens/        # Home, PortfolioDashboard, BrowserSession, Settings
│   ├── components/     # Sidebar, MentorPanel, StoreCard, BrowserPane
│   ├── application/    # AppServices, SessionService, CaptureService, StoreService
│   └── lib/schemas.ts  # ParsedListing, SeoAuditResult
├── electron/
│   ├── main.ts         # Full app main (BrowserView, Gate 7, capture, SEO)
│   ├── db.ts           # SQLite (sessions, captures, stores)
│   ├── openai.ts       # runSeoAudit
│   └── parser.ts       # parseListing
└── index.html

MIXED / NEEDS REFACTOR
├── src/application/types.ts      # GateBlockedError, GateState — extract to shared
├── src/application/services/GateService.ts    # Could move to core
├── src/application/services/SettingsService.ts # Shared
└── electron/main.ts              # Split full-app vs shared bootstrap
```

---

## STEP 6 — Cleanup Recommendation

### Phase 1: Isolate Etsy Domain (no extraction yet)

1. **Create `src/etsy/`** — Move `screens/`, `components/`, `application/` (Etsy services), `types.ts`, `lib/schemas.ts` under `src/etsy/`.
2. **Create `electron/etsy/`** — Move full-app logic from `main.ts` into `electron/etsy/full-app.ts`. Keep `electron/main.ts` as a router: load desktop or full app based on entry.
3. **Shared package** — Extract `GateBlockedError`, `GateState`, `GateService`, `SettingsService` into `src/shared/application/` or a small `@etsy-mentor/core` package.

### Phase 2: Extract Etsy to New Repo

1. **New repo** `etsy-mentor-app` with:
   - All `src/etsy/` content
   - `electron/etsy/` full-app logic
   - `electron/db.ts`, `electron/openai.ts`, `electron/parser.ts`
   - Dependency on `@etsy-mentor/core` (or subtree) for shared types and gate logic.
2. **Core repo** keeps:
   - Heroes, repair engine, desktop, shared read-models
   - Desktop Control Center as the main product
   - Clean architecture for AI-DevOS orchestration

### Phase 3: Wire Heroes (optional)

- Add IPC channel for Hero pipeline.
- Desktop UI can call `pipeline.run(event, context)` and render `HeroReadModel` via projection.
- Heroes remain domain-agnostic; Etsy app would not use them unless explicitly integrated.

---

## Summary

| Category | File Count (approx) | Extraction |
|----------|---------------------|------------|
| Core engine | ~70 | Keep in repo |
| Etsy domain | ~25 | Move to new repo |
| Mixed | ~5 | Refactor then move or keep in core |

The architecture is **already split** by entry point (index.html vs index-desktop.html). The Hero system is **fully isolated** and never imports Etsy code. The main coupling is `electron/main.ts`, which hosts the full Etsy app. A clean extraction is feasible with moderate refactoring.
