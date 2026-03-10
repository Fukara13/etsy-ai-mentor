# REPORT-15 — Legacy Etsy Archival Plan

**Project:** Etsy AI Mentor / AI-DevOS / Application Factory  
**Date:** 2025-03-08  
**Scope:** Safe archival of the old Etsy Mentor application; protection of the Application Factory / AI DevOS direction  

---

## 1. Executive Summary

The repository contains two distinct products: **Legacy Etsy Mentor App** (store management, browser session, capture, SEO audit, mentor chat) and **Application Factory / AI DevOS** (Desktop Control Center, heroes, repair engine, shared read-models). The strategic goal is to archive the old Etsy Mentor code in-place, remove it from the active system, and validate that the Application Factory remains stable.

**Key findings:**

- **Entry points are already separated:** `index.html` → Etsy (`src/main.tsx`), `index-desktop.html` → Desktop (`src/desktop/main.tsx`). `package.json` main points to `dist-electron/electron/desktop/main.js` (Desktop). The active runtime is Desktop only.
- **Zero Etsy imports in active system:** `src/heroes/`, `src/shared/`, `src/desktop/`, `electron/desktop/`, `electron/gates/repair/`, `electron/ipc/`, `electron/shared/` do not import from Etsy files.
- **Etsy bootstrap is isolated:** `electron/main.ts` (full app) and its chain (preload, db, openai, parser, gates/store|persistence|registry) are used only by the full app. Desktop uses `electron/desktop/main.ts` exclusively.
- **Build config must be updated after archival:** `tsconfig.electron.json` includes Etsy paths; `vite.config.ts` builds both entry points. These must be pruned for the active system.

**Recommendation:** Execute a phased archival inside the repo into `archive/legacy-etsy-mentor/`. No external repo. Snapshot before each phase. Validate Desktop build and tests after each phase. Rollback via git restore if anything breaks.

---

## 2. Legacy Etsy Detection

### DEFINITELY_LEGACY_ETSY

| Path | Rationale |
|------|-----------|
| `src/types.ts` | `Session`, `Capture`, `Store` — Etsy domain entities only |
| `src/App.tsx` | Full app shell (Home, PortfolioDashboard, BrowserSession, Settings) |
| `src/main.tsx` | Full app React entry, imports ErrorBoundary, index.css |
| `src/screens/Home.tsx` | Session list UI |
| `src/screens/PortfolioDashboard.tsx` | Store cards, MentorPanel, Gate 7 SEO capture |
| `src/screens/BrowserSession.tsx` | Browser pane, capture, Etsy listing URLs |
| `src/screens/Settings.tsx` | Settings UI |
| `src/components/Sidebar.tsx` | SEO/prompt/history tabs, listing badge — Etsy-specific |
| `src/components/MentorPanel.tsx` | SEO Audit, Prompt Studio, module confirm |
| `src/components/StoreCard.tsx` | Store display |
| `src/components/BrowserPane.tsx` | Embedded browser for captures |
| `src/components/ErrorBoundary.tsx` | Used only by full app; Desktop does not use |
| `src/application/AppServices.ts` | Wires Session, Capture, Store, Gate, Settings services |
| `src/application/services/SessionService.ts` | Session CRUD |
| `src/application/services/CaptureService.ts` | Capture, runSeoAudit, listing capture, AI output |
| `src/application/services/StoreService.ts` | Store list, update goal |
| `src/application/services/GateService.ts` | Gate state checks (used by main.ts for full app) |
| `src/application/services/SettingsService.ts` | Settings |
| `src/application/types.ts` | GateBlockedError, GateState, GateStatus — used by main.ts |
| `src/lib/schemas.ts` | `ParsedListingSchema`, `SeoAuditResultSchema` — Etsy listing/SEO |
| `index.html` | Full app entry; loads `/src/main.tsx` |
| `index.css` | Used only by `src/App.tsx` and `src/main.tsx` |
| `electron/main.ts` | Full app main — BrowserWindow + BrowserView, gate7, DB, OpenAI, sessions |
| `electron/preload.ts` | electronAPI for full app |
| `electron/db.ts` | SQLite; used only by main.ts chain |
| `electron/openai.ts` | `runSeoAudit`; used only by main.ts |
| `electron/parser.ts` | `parseListing`; used only by main.ts |
| `electron/schemas.ts` | `SeoAuditResultSchema` (duplicate of src/lib/schemas) |
| `electron/gates/store.ts` | Gate state; used only by main.ts |
| `electron/gates/persistence.ts` | Gate persistence; used only by main.ts |
| `electron/gates/registry.ts` | Gate registry; used by store, persistence |

### POSSIBLY_LEGACY_ETSY

| Path | Rationale |
|------|-----------|
| (none) | All candidates above are definitively Etsy. No ambiguity. |

### NOT_LEGACY_ETSY

| Path | Rationale |
|------|-----------|
| `src/heroes/**` | Hero Ministry; domain-agnostic |
| `src/shared/**` | Read models, deterministic utils |
| `src/desktop/**` | Desktop Control Center — backbone, mappers, renderer UI |
| `index-desktop.html` | Desktop entry |
| `electron/desktop/**` | Desktop main, preload, window, update-service |
| `electron/gates/repair/**` | Repair engine only |
| `electron/ipc/**` | IPC handlers (backbone-read, health-check, version) |
| `electron/shared/**` | desktop-contracts |

---

## 3. Active System Boundary

### ACTIVE SYSTEM (must remain)

- `src/heroes/**` — Hero Ministry, Application Factory
- `src/shared/**` — Read models
- `src/desktop/**` — Desktop Control Center UI
- `index-desktop.html` — Desktop entry point
- `electron/desktop/**` — Desktop main process
- `electron/gates/repair/**` — Repair engine
- `electron/ipc/**` — IPC handlers
- `electron/shared/**` — Contracts

### LEGACY ETSY (archive candidates)

All paths listed under DEFINITELY_LEGACY_ETSY above.

### MIXED / NEEDS REVIEW

| Path | Notes |
|------|-------|
| `tools/arch-snapshot.mjs` | References `electron/main.ts` for IPC/architecture snapshot. After archival, this tool will fail or produce incomplete output. Not part of build; REVIEW_MANUALLY for post-archive tooling. |
| `docs/**` | Architecture docs reference Etsy; informational only. Can remain; no build impact. |

---

## 4. Archive Candidate Table

| Path | Classification | Archive Recommendation | Risk Level | Reason |
|------|----------------|------------------------|------------|--------|
| `src/types.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/App.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/main.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/screens/**` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/components/Sidebar.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/components/MentorPanel.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/components/StoreCard.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/components/BrowserPane.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/components/ErrorBoundary.tsx` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/application/**` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `src/lib/schemas.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | No active imports |
| `index.html` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | MEDIUM | Vite input; must remove from rollupOptions |
| `index.css` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only Etsy uses it |
| `electron/main.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | MEDIUM | tsconfig.electron.json compiles it; must exclude |
| `electron/preload.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only main.ts uses |
| `electron/db.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only main.ts uses |
| `electron/openai.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only main.ts uses |
| `electron/parser.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only main.ts uses |
| `electron/schemas.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Consolidate with src/lib/schemas in archive |
| `electron/gates/store.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only main.ts uses |
| `electron/gates/persistence.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only main.ts uses |
| `electron/gates/registry.ts` | LEGACY_ETSY | ARCHIVE_IMMEDIATELY | LOW | Only store, persistence use |
| `src/heroes/**` | ACTIVE_CORE | KEEP_ACTIVE | — | Application Factory |
| `src/shared/**` | ACTIVE_CORE | KEEP_ACTIVE | — | Read models |
| `src/desktop/**` | ACTIVE_CORE | KEEP_ACTIVE | — | Desktop Control Center |
| `index-desktop.html` | ACTIVE_CORE | KEEP_ACTIVE | — | Desktop entry |
| `electron/desktop/**` | ACTIVE_CORE | KEEP_ACTIVE | — | Desktop main process |
| `electron/gates/repair/**` | ACTIVE_CORE | KEEP_ACTIVE | — | Repair engine |
| `electron/ipc/**` | ACTIVE_CORE | KEEP_ACTIVE | — | IPC handlers |
| `electron/shared/**` | ACTIVE_CORE | KEEP_ACTIVE | — | Contracts |
| `tools/arch-snapshot.mjs` | SHARED | REVIEW_MANUALLY | MEDIUM | Expects electron/main.ts; will fail post-archive |

---

## 5. Breakage Risk Analysis

| Breaking Point | Why It Breaks | Severity | Recommended Fix |
|----------------|---------------|----------|-----------------|
| `tsconfig.electron.json` includes `src/application/**`, `src/types.ts`, `src/lib/schemas.ts` | After moving these to archive, Electron build will fail: "Cannot find module" | HIGH | Remove these paths from `include` in Phase 2 |
| `tsconfig.electron.json` compiles `electron/main.ts` | main.ts imports db, openai, parser, gates/store|persistence|registry. If we move main.ts, those imports break. If we keep main.ts in tree but move deps, main.ts breaks. | HIGH | Move entire Etsy chain to archive. Exclude `archive/**` from tsconfig. Electron build compiles `electron/**` only; main.ts will be gone from electron/. |
| `vite.config.ts` rollupOptions.input.main = 'index.html' | Vite will try to build index.html → src/main.tsx. If main.tsx is archived, build fails. | HIGH | Remove `main` entry from rollupOptions; keep only `desktop` in Phase 2 |
| `index.html` references `/src/main.tsx` | If index.html is archived, Vite will not build it. No break if we remove from vite input. | LOW | Remove main entry; archive index.html |
| `package.json` main | Already `dist-electron/electron/desktop/main.js`. No change needed. | N/A | None |
| Tests | All tests live in heroes, desktop, shared, electron/gates/repair, electron/desktop. None import Etsy. | N/A | No test changes required |
| `tools/arch-snapshot.mjs` | Reads `electron/main.ts` for IPC and structure. After archival, file not found. | MEDIUM | Update tool to skip or handle missing main.ts; or leave as known limitation |
| `npm run build` / `npm run desktop:build` | Same command: `vite build && tsc -p tsconfig.electron.json`. Vite build will fail if main entry references archived files. | HIGH | Fix vite + tsconfig in Phase 2 |

### Summary of Required Config Changes (Phase 2)

1. **tsconfig.electron.json** — Remove from `include`: `src/application/**/*.ts`, `src/types.ts`, `src/lib/schemas.ts`. Ensure `electron/**` does not include archived electron files (they will be in archive/, not electron/).
2. **vite.config.ts** — Change `rollupOptions.input` from `{ main: 'index.html', desktop: 'index-desktop.html' }` to `{ desktop: 'index-desktop.html' }` (or equivalent single entry).

---

## 6. Proposed Archive Structure

```
archive/
└── legacy-etsy-mentor/
    ├── README.md                    # Explains: archived 2025-03-08, inactive, for reference only
    ├── index.html
    ├── index.css
    ├── src/
    │   ├── types.ts
    │   ├── App.tsx
    │   ├── main.tsx
    │   ├── screens/
    │   │   ├── Home.tsx
    │   │   ├── PortfolioDashboard.tsx
    │   │   ├── BrowserSession.tsx
    │   │   └── Settings.tsx
    │   ├── components/
    │   │   ├── Sidebar.tsx
    │   │   ├── MentorPanel.tsx
    │   │   ├── StoreCard.tsx
    │   │   ├── BrowserPane.tsx
    │   │   └── ErrorBoundary.tsx
    │   ├── application/
    │   │   ├── AppServices.ts
    │   │   ├── types.ts
    │   │   └── services/
    │   │       ├── SessionService.ts
    │   │       ├── CaptureService.ts
    │   │       ├── StoreService.ts
    │   │       ├── GateService.ts
    │   │       └── SettingsService.ts
    │   └── lib/
    │       └── schemas.ts
    └── electron/
        ├── main.ts
        ├── preload.ts
        ├── db.ts
        ├── openai.ts
        ├── parser.ts
        ├── schemas.ts
        └── gates/
            ├── store.ts
            ├── persistence.ts
            └── registry.ts
```

**Design notes:**

- Archive is **out of the build path** — `vite` and `tsc` do not include `archive/` by default.
- Structure mirrors original layout for easy reference.
- `electron/gates/repair/` stays in active tree; only `store`, `persistence`, `registry` move to archive.
- Root `archive/legacy-etsy-mentor/README.md` documents purpose and date.

---

## 7. Pre-Archive Safety Checklist

Before starting any archival work:

| # | Action | Purpose |
|---|--------|---------|
| 1 | Create git tag: `git tag pre-archive-etsy-v1` | Rollback anchor |
| 2 | Create branch: `git checkout -b archive/legacy-etsy` | Isolated work |
| 3 | Run baseline build: `npm run desktop:build` | Must succeed |
| 4 | Run tests: `npm test` | Record pass count and any failures |
| 5 | Run Desktop app: `npm run dev:desktop` | Confirm it launches |
| 6 | Record output of `npm run desktop:build` and `npm test` to a file | Evidence for comparison |
| 7 | Inspect `tsconfig.electron.json` and `vite.config.ts` | Understand current includes/inputs |
| 8 | Ensure working tree is clean: `git status` | Avoid accidental commits |

---

## 8. Post-Archive Validation

After archiving and applying config fixes:

| # | Check | Command / Action |
|---|-------|------------------|
| 1 | Vite build | `npm run vite build` or `npm run desktop:build` — must succeed |
| 2 | Electron build | `tsc -p tsconfig.electron.json` — must succeed |
| 3 | Full build | `npm run desktop:build` — must succeed |
| 4 | Tests | `npm test` — all tests must pass |
| 5 | Desktop launch | `npm run dev:desktop` — app must open |
| 6 | Import check | Grep for `from '../application'`, `from '../types'`, etc. in `src/desktop`, `src/heroes`, `electron/desktop` — must find none |
| 7 | Config check | `vite.config.ts` has only desktop input; `tsconfig.electron.json` excludes Etsy paths |

**Success criteria:** "Did archiving the old Etsy Mentor app affect the active system?" → **No.** Build green, tests green, Desktop runs.

---

## 9. Rollback Plan

| Scenario | Action |
|----------|--------|
| Build fails after Phase 1 (move files) | `git checkout -- .` to restore moved files; or `git restore archive/` and delete `archive/` if created |
| Build fails after Phase 2 (config changes) | Revert config commits: `git checkout -- tsconfig.electron.json vite.config.ts` |
| Tests fail | Same as build — revert last phase |
| Full rollback | `git checkout main` (or previous branch); `git tag -d pre-archive-etsy-v1` if tag was created locally and not pushed |

**Tag strategy:** Push `pre-archive-etsy-v1` to remote before starting. If anything goes wrong: `git checkout pre-archive-etsy-v1` and create a new branch from there.

**Restore order if partial rollback:**

1. Restore config files (`tsconfig.electron.json`, `vite.config.ts`) first — fastest path to green build.
2. If config restore is insufficient, restore moved files from archive back to original paths.

---

## 10. Phased Execution Plan

### Phase 0 — Snapshot

- **Goal:** Establish baseline, tag, branch.
- **Files touched:** None (git only).
- **Risks:** None.
- **Validation:** `npm run desktop:build`, `npm test`, `npm run dev:desktop` all pass.
- **Rollback:** N/A.

### Phase 1 — Archive Legacy Etsy Files

- **Goal:** Move all DEFINITELY_LEGACY_ETSY files into `archive/legacy-etsy-mentor/` preserving structure.
- **Files touched:** All paths in Archive Candidate Table with ARCHIVE_IMMEDIATELY.
- **Risks:** Build and tests will fail (vite + tsconfig still reference removed paths).
- **Validation:** Expect build failure; do not proceed to Phase 3 until Phase 2 is done.
- **Rollback:** `git checkout -- src/ electron/ index.html index.css` (paths as needed).

### Phase 2 — Repair Active System References

- **Goal:** Update tsconfig.electron.json and vite.config.ts so the active system builds.
- **Files touched:**
  - `tsconfig.electron.json` — remove `src/application/**/*.ts`, `src/types.ts`, `src/lib/schemas.ts` from include.
  - `vite.config.ts` — remove `main: 'index.html'` from rollupOptions.input.
- **Risks:** Typos or wrong paths could break build.
- **Validation:** `npm run desktop:build`, `npm test`, `npm run dev:desktop`.
- **Rollback:** Revert config files.

### Phase 3 — Validate Application Factory / AI DevOS

- **Goal:** Prove Desktop and Application Factory work without Etsy.
- **Files touched:** None.
- **Risks:** None if Phase 2 is correct.
- **Validation:** Same as Post-Archive Validation. Optional: run `arch:snapshot` and note it may fail or produce partial output (document known limitation).
- **Rollback:** N/A if validation passes.

### Phase 4 — Decide Whether to Permanently Delete Later

- **Goal:** Do not delete yet. Keep archive in repo. Revisit deletion only after Application Factory is stable for a sustained period.
- **Files touched:** None.
- **Validation:** N/A.
- **Rollback:** N/A.

---

## 11. Final Recommendation

1. **Execute archival in-repo** — Move legacy Etsy code into `archive/legacy-etsy-mentor/`. Do not create a separate repository.
2. **Snapshot first** — Tag `pre-archive-etsy-v1`, create branch `archive/legacy-etsy`.
3. **Phase 1 + 2 together** — Move files and update config in the same PR (or sequential commits) so the tree is never left in a broken state for long.
4. **Validate rigorously** — Run build, tests, and desktop launch. Grep for stray Etsy imports in active code.
5. **Document** — Add `archive/legacy-etsy-mentor/README.md` stating: "Archived 2025-03-08. Inactive. For reference only. Do not use in active builds."
6. **Do not delete** — Keep the archive. Revisit permanent deletion only after the Application Factory / AI DevOS system has been stable without Etsy for an agreed period.
7. **Handle tools** — `tools/arch-snapshot.mjs` will fail or be incomplete after archival. Either update it to handle missing `electron/main.ts` or document as a known limitation.

---

*End of Report*
