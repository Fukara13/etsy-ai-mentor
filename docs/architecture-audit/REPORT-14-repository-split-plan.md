# REPORT-14 — Repository Split Plan

**Project:** Etsy AI Mentor / AI-DevOS  
**Date:** 2025-03-08  
**Scope:** Implementation-oriented plan to split into two repositories  

---

## 1. Executive Summary

The repository contains two logical products: **Etsy Mentor App** (legacy) and **AI DevOS / Core Engine** (new). The split is feasible because:

- **Entry points are already separated:** `index.html` (Etsy) vs `index-desktop.html` (Core). Vite builds both. `package.json` main points to Desktop.
- **Core engine has zero Etsy imports:** Heroes, repair engine, shared read-models, desktop backbone are Etsy-free.
- **Gate subsystem is Etsy-only:** `gates/store`, `gates/persistence`, `gates/registry` are used only by `electron/main.ts`. They move with Etsy. Core keeps only `gates/repair` (repair engine).

**Recommendation:** Extract Etsy domain into a new repo. Core repo keeps heroes, repair engine, desktop. Duplicate `GateBlockedError`/`GateState` in Etsy (3 small types). Execute in 8 phases with snapshot tags between phases.

---

## 2. Current Repository Topology

### Module Map

| Path | Classification | Purpose |
|------|----------------|---------|
| **src/heroes/** | CORE | Hero Ministry. Domain-agnostic. No Etsy imports. |
| **src/shared/** | CORE | Read models, deterministic utils |
| **src/desktop/** | CORE | Control Center — backbone, mappers, renderer UI |
| **src/application/** | ETSY | AppServices, Session/Capture/Store/Gate/Settings services |
| **src/screens/** | ETSY | Home, PortfolioDashboard, BrowserSession, Settings |
| **src/components/** | ETSY | Sidebar, MentorPanel, StoreCard, BrowserPane, ErrorBoundary |
| **src/types.ts** | ETSY | Session, Capture, Store |
| **src/lib/schemas.ts** | ETSY | ParsedListingSchema, SeoAuditResultSchema |
| **src/App.tsx**, **src/main.tsx** | ETSY | Full app shell and entry |
| **electron/desktop/** | CORE | Desktop main, preload, window, update-service |
| **electron/gates/repair/** | CORE | Repair engine only |
| **electron/gates/store.ts** | ETSY | Used only by main.ts for gate boot |
| **electron/gates/persistence.ts** | ETSY | Used only by main.ts; imports db |
| **electron/gates/registry.ts** | ETSY | Used by store, persistence |
| **electron/ipc/** | CORE | Channels, backbone-read, version-handler |
| **electron/shared/** | CORE | desktop-contracts |
| **electron/main.ts** | ETSY | Full app main |
| **electron/preload.ts** | ETSY | electronAPI |
| **electron/db.ts** | ETSY | SQLite |
| **electron/openai.ts** | ETSY | runSeoAudit |
| **electron/parser.ts** | ETSY | parseListing |
| **electron/schemas.ts** | ETSY | SeoAuditResultSchema (duplicate of src/lib) |

---

## 3. Split Classification Table

| Path | Classification | Why | Target Repo | Action Needed |
|------|----------------|-----|-------------|---------------|
| src/heroes/** | CORE | Domain-agnostic | KEEP | keep as is |
| src/shared/** | CORE | Read models | KEEP | keep as is |
| src/desktop/** | CORE | Control Center | KEEP | keep as is |
| electron/desktop/** | CORE | Desktop main | KEEP | keep as is |
| electron/gates/repair/** | CORE | Repair engine | KEEP | keep as is |
| electron/ipc/** | CORE | IPC handlers | KEEP | keep as is |
| electron/shared/** | CORE | contracts | KEEP | keep as is |
| src/types.ts | ETSY | Session, Capture, Store | MOVE | move directly |
| src/App.tsx | ETSY | Full app shell | MOVE | move directly |
| src/main.tsx | ETSY | Full app entry | MOVE | move directly |
| src/screens/** | ETSY | Etsy screens | MOVE | move directly |
| src/components/*.tsx | ETSY | Sidebar, MentorPanel, etc. | MOVE | move directly |
| src/components/ErrorBoundary.tsx | ETSY | Used by full app only; Desktop does not use | MOVE | move directly |
| src/application/** | ETSY | Services | MOVE | move directly |
| src/lib/schemas.ts | ETSY | Etsy schemas | MOVE | move directly |
| electron/main.ts | ETSY | Full app main | MOVE | move directly |
| electron/preload.ts | ETSY | electronAPI | MOVE | move directly |
| electron/db.ts | ETSY | SQLite | MOVE | move directly |
| electron/openai.ts | ETSY | SEO audit | MOVE | move directly |
| electron/parser.ts | ETSY | parseListing | MOVE | move directly |
| electron/schemas.ts | ETSY | Duplicate schema | MOVE | consolidate with src/lib/schemas |
| electron/gates/store.ts | ETSY | Gate boot only | MOVE | move directly |
| electron/gates/persistence.ts | ETSY | Gate boot only | MOVE | move directly |
| electron/gates/registry.ts | ETSY | Gate boot only | MOVE | move directly |
| index.html | ETSY | Full app entry | MOVE | move directly |
| index-desktop.html | CORE | Desktop entry | KEEP | keep as is |

---

## 4. Hidden Dependency Audit

| Edge | Risk | Breaks if | Fix |
|------|------|-----------|-----|
| persistence → db | Etsy-internal | db moved without persistence | Both move together. Safe. |
| main.ts → gates/store, persistence | Etsy-internal | Gates moved to Core without main | store, persistence, registry move WITH main to Etsy. |
| openai.ts → electron/schemas | Etsy-internal | Schemas split incorrectly | Consolidate: use src/lib/schemas in Etsy; remove electron/schemas. |
| AppServices → application/types | Etsy-internal | types moved | types move with application. GateBlockedError duplicated in Etsy. |
| tsconfig.electron.json includes src/application, src/types, src/lib | Build | Etsy paths removed | After move, remove Etsy paths from Core tsconfig. Etsy repo has own tsconfig. |
| index.css | Shared assets | Both use it | Full app uses index.css. Desktop uses src/desktop/styles.css, shell.css. Audit: if index.css has Etsy-only styles, move with Etsy. Desktop may need its own minimal index.css or inherits from build. |
| electron/main.ts → createAppServices | Etsy-internal | AppServices moved | AppServices moves with main. Safe. |

**No Core→Etsy dependencies.** All risky edges are within Etsy tree.

---

## 5. Target Two-Repo Architecture

### A) Current Repo After Split (AI DevOS / Core Engine)

```
ai-devos/  (or etsy-mentor)
├── package.json                 # main: dist-electron/electron/desktop/main.js
├── index-desktop.html
├── vite.config.ts               # input: desktop only
├── tsconfig.json
├── tsconfig.electron.json       # electron, src/desktop, src/shared, src/heroes
├── src/
│   ├── heroes/
│   ├── shared/
│   └── desktop/
├── electron/
│   ├── desktop/
│   ├── gates/
│   │   └── repair/              # store, persistence, registry removed
│   ├── ipc/
│   └── shared/
└── docs/, tools/, etc.
```

### B) New Etsy Repo

```
etsy-mentor-app/
├── package.json                 # main: dist-electron/main.js
├── index.html
├── vite.config.ts
├── tsconfig.json
├── tsconfig.electron.json
├── src/
│   ├── types.ts
│   ├── lib/schemas.ts
│   ├── App.tsx
│   ├── main.tsx
│   ├── screens/
│   ├── components/
│   └── application/
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   ├── db.ts
│   ├── openai.ts
│   ├── parser.ts
│   └── gates/
│       ├── store.ts
│       ├── persistence.ts
│       └── registry.ts
└── index.css
```

### C) Shared Package

**Prefer duplication.** Copy `GateBlockedError`, `GateStatus`, `GateState` from `src/application/types.ts` into Etsy repo's `src/application/types.ts`. Three small types. No npm package.

---

## 6. File-by-File Extraction Buckets

### BUCKET A — Move Immediately

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
src/components/ErrorBoundary.tsx          # duplicate; keep copy in Core or remove if Core doesn't use
src/application/AppServices.ts
src/application/services/SessionService.ts
src/application/services/CaptureService.ts
src/application/services/StoreService.ts
src/application/services/GateService.ts
src/application/services/SettingsService.ts
src/application/types.ts
src/lib/schemas.ts
index.html
electron/main.ts
electron/preload.ts
electron/db.ts
electron/openai.ts
electron/parser.ts
electron/schemas.ts
electron/gates/store.ts
electron/gates/persistence.ts
electron/gates/registry.ts
```

**Why safe:** No Core imports. Self-contained Etsy tree.

### BUCKET B — Small Refactor Before Move

| File | Refactor |
|------|----------|
| electron/openai.ts | Change `import from './schemas'` to `import from '../src/lib/schemas'` (or consolidate into one schemas file in Etsy). |
| electron/schemas.ts | Delete after consolidating with src/lib/schemas. |

### BUCKET C — Keep in Current Repo

```
src/heroes/**
src/shared/**
src/desktop/**
electron/desktop/**
electron/gates/repair/**
electron/ipc/**
electron/shared/**
index-desktop.html
```

### BUCKET D — Duplicate (No Extract)

| Item | Action |
|------|--------|
| ErrorBoundary | Etsy only. Desktop does not use it. Move with Etsy. |
| GateBlockedError, GateState | Copy into Etsy `src/application/types.ts` before move. Remove from Core after. |

---

## 7. Electron Split Plan

### File Ownership

| File | Owner | Notes |
|------|-------|-------|
| electron/desktop/* | CORE | Desktop Control Center |
| electron/main.ts | ETSY | Full app |
| electron/preload.ts | ETSY | electronAPI |
| electron/db.ts | ETSY | |
| electron/openai.ts | ETSY | |
| electron/parser.ts | ETSY | |
| electron/schemas.ts | ETSY | Consolidate then remove |
| electron/gates/repair/* | CORE | Repair engine |
| electron/gates/store.ts | ETSY | |
| electron/gates/persistence.ts | ETSY | |
| electron/gates/registry.ts | ETSY | |
| electron/ipc/* | CORE | |
| electron/shared/* | CORE | |

### Bootstrap

- **Core:** `package.json` main = `dist-electron/electron/desktop/main.js`. No change.
- **Etsy:** New repo. `package.json` main = `dist-electron/main.js`. Own Electron bootstrap.

### No Shared Bootstrap

Core and Etsy are separate processes. No refactor needed.

---

## 8. Build / Test / Rollback Strategy

### Phase 1: Preparation

- **Goal:** Baseline, branch, tag.
- **Actions:** Create `split/preparation` branch. Tag `pre-split-v1`. Run `npm run desktop:build`, `npm test`. Record results.
- **Validation:** All tests pass.
- **Rollback:** `git checkout main`.

### Phase 2: Consolidate Schemas

- **Goal:** Single schemas source for Etsy.
- **Actions:** In electron/openai.ts, change import from `./schemas` to `../src/lib/schemas`. Delete electron/schemas.ts.
- **Validation:** `npm run build`, tests pass.
- **Rollback:** Revert commit.

### Phase 3: Copy Gate Types to Etsy-Bound Files

- **Goal:** Etsy files don't depend on shared types that will remain.
- **Actions:** Ensure application/types.ts (GateBlockedError, etc.) is self-contained. It already is. It moves with application.
- **Validation:** Build passes.
- **Rollback:** Revert.

### Phase 4: Create Etsy Repo and Move Files

- **Goal:** New repo with Etsy tree.
- **Actions:**
  1. Create new repo `etsy-mentor-app`.
  2. Copy package.json, tsconfig, vite.config (adapted).
  3. Move all BUCKET A files.
  4. Move electron/gates/store, persistence, registry.
- **Validation:** Etsy repo builds. Core repo builds after removing moved files.
- **Rollback:** Delete Etsy repo. Restore Core from tag.

### Phase 5: Update Core Repo

- **Goal:** Remove Etsy files, fix tsconfig, fix vite.
- **Actions:**
  1. Delete moved files.
  2. Update tsconfig.electron.json: remove src/application, src/types, src/lib, src/screens, src/components, src/App.tsx, src/main.tsx.
  3. Update vite.config: remove main entry; keep desktop only.
  4. Remove index.html if only Etsy used it (or keep for redirect; likely remove).
- **Validation:** `npm run desktop:build`, `npm test`.
- **Rollback:** Restore from tag.

### Phase 6: Wire Etsy Repo

- **Goal:** Etsy repo builds and runs.
- **Actions:** Add package.json scripts, fix imports, add index.html entry.
- **Validation:** Etsy `npm run build`, `electron .` (with main = main.js).
- **Rollback:** Fix Etsy repo.

### Phase 7: Verification

- **Goal:** Both repos stable.
- **Actions:** Full test run in both. Manual run of both apps.
- **Validation:** Desktop runs. Full app runs in Etsy repo.
- **Rollback:** Fix until green.

### Phase 8: Cleanup

- **Goal:** Remove dead code, update docs.
- **Actions:** Remove unused files. Update README. Tag `post-split-v1`.

---

## 9. Risks and Blockers

| Blocker | Severity | Explanation | Fix Before Split? | Mitigation |
|---------|----------|-------------|-------------------|------------|
| tsconfig.electron includes Etsy paths | MEDIUM | Core build fails after move | Yes | Remove Etsy paths in Phase 5 |
| Vite multi-entry | LOW | Both index.html and index-desktop | No | Core keeps desktop only |
| index.css shared | LOW | May have shared base | No | Duplicate or split; minimal risk |
| ErrorBoundary usage | LOW | May be in both | No | Check; duplicate if needed |
| Data dir / SQLite path | MEDIUM | db.ts uses app.getPath | No | Etsy keeps same; no shared data |
| Gate types in AppServices | LOW | application/types moves with AppServices | No | Self-contained |

---

## 10. Recommended Execution Order

1. **Tag baseline** — `git tag pre-split-v1`
2. **Consolidate schemas** — electron/openai → src/lib/schemas; delete electron/schemas
3. **Create Etsy repo** — init, copy configs
4. **Move Etsy src tree** — types, App, main, screens, components, application, lib
5. **Move Etsy electron tree** — main, preload, db, openai, parser, gates/store, persistence, registry
6. **Move index.html**
7. **Remove moved files from Core**
8. **Update Core tsconfig and vite** — remove Etsy paths and main entry
9. **Wire Etsy repo** — scripts, imports, main entry
10. **Run tests in both repos**
11. **Tag** — `post-split-v1`

---

## 11. Final Recommendation

Execute the split in two stages:

**Stage 1 (In-Repo Isolation):** Move Etsy files under `src/etsy/` and `electron/etsy/` within the current repo. Update imports. Validate both entry points work. Tag `split-stage1-done`.

**Stage 2 (Extract):** Create new repo. Move `src/etsy` and `electron/etsy` content. Remove from Core. Validate. Tag `post-split-v1`.

This reduces risk by allowing rollback at each stage and keeps the option to pause after Stage 1.
