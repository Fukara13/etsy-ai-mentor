# OC-3 Project Understanding Auto Refresh — Implementation Summary

## 1. Implementation Summary

- **New module** `electron/runtime/project-understanding-auto-refresh/`:
  - **project-understanding-refresh-result.ts**: Typed result with `status` ('refreshed' | 'skipped' | 'failed'), `reason`, `artifactPaths`, `commandsRun`, `startedAt`, `finishedAt`, `durationMs`, optional `exitCode`/`stdout`/`stderr`. Runtime-safe and serializable.
  - **should-refresh-project-understanding.ts**: Pure decision function. Policy: `forceRefresh` → refresh; any required artifact missing → refresh; any artifact older than `freshnessWindowMs` → refresh; event category/name in push/pull_request/workflow_run → refresh; else skip (fresh-enough).
  - **run-project-understanding-refresh.ts**: CLI runner with injected `ProcessRunner`. Runs npm scripts in order: `project:dependency-graph`, `project:module-mapping`, `ai-devos:architecture-summary`, `ai-devos:risk-hotspots`. Fails closed on first non-zero exit; captures stdout/stderr.
  - **refresh-project-understanding.ts**: Orchestration: build artifact paths, get stats via injected `FsAdapter`, call `shouldRefreshProjectUnderstanding`; if skip return skipped result; if refresh call `runProjectUnderstandingRefresh` and return result.
  - **default-runtime-adapters.ts**: `createDefaultFsAdapter()` (fs.stat for exists/mtimeMs), `createDefaultProcessRunner()` (child_process.spawn, no shell).
  - **index.ts**: Public API exports.

- **Integration**: Webhook intake handler. Before loading project-understanding artifacts and calling the repair bridge, the handler calls `refreshProjectUnderstanding` with `cwd`, 5-minute freshness window, and `eventCategory`/`eventName` from the normalized backbone event. On `status === 'failed'` it returns **503** with a JSON body (`error`, `reason`, `exitCode`) and does not continue. On skipped or refreshed it proceeds to `loadProjectUnderstandingArtifacts` and the rest of the pipeline unchanged.

- **Trunk**: No changes under `src/repair-engine/`. Loader and repair bridge are unchanged; only the webhook handler was extended.

---

## 2. Files Created / Updated

| File | Change |
|------|--------|
| `electron/runtime/project-understanding-auto-refresh/project-understanding-refresh-result.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/should-refresh-project-understanding.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/run-project-understanding-refresh.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/refresh-project-understanding.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/default-runtime-adapters.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/index.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/should-refresh-project-understanding.test.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/run-project-understanding-refresh.test.ts` | **NEW** |
| `electron/runtime/project-understanding-auto-refresh/refresh-project-understanding.test.ts` | **NEW** |
| `electron/runtime/webhook-intake/webhook-intake-handler.ts` | **MODIFIED** — refresh before load, 503 on refresh failure, handler async |
| `electron/runtime/webhook-intake/create-webhook-server.ts` | **MODIFIED** — await webhookIntakeHandler |
| `electron/runtime/webhook-intake/webhook-intake-handler.test.ts` | **MODIFIED** — mock auto-refresh, tests async/await |
| `docs/OC-3-implementation-summary.md` | **NEW** |

---

## 3. Integration Point Chosen and Why

**Chosen: webhook intake flow, before repair bridge execution (and before `loadProjectUnderstandingArtifacts`).**

- **Why not project-understanding-loader**: The loader is a pure “read from disk” API used by both the webhook handler and the repair-engine bridge. Adding refresh inside the loader would run npm scripts on every load (including from the bridge), increase coupling, and make the loader non–purely functional. Keeping the loader unchanged preserves existing behavior for `run-electron-repair-bridge` and other callers.
- **Why webhook intake**: Refresh is most useful when triggered by repo-changing events (push, pull_request, workflow_run). The webhook path already has the normalized event and cwd; adding a single async step before loading artifacts is a small, clear change. On refresh failure we return 503 with a typed body instead of continuing with unknown artifact state, satisfying fail-transparently.
- **OC-2**: The refresh runs after OC-2 signature verification and after parse/normalize; it does not change the secure webhook boundary.

---

## 4. Test List

| Test file | Cases |
|-----------|--------|
| **should-refresh-project-understanding.test.ts** | force-refresh when `forceRefresh=true`; missing-artifact when any artifact missing; stale-artifact when older than window; event-requires-refresh for push, pull_request, workflow_run; fresh-enough when present and recent. |
| **run-project-understanding-refresh.test.ts** | Commands run in deterministic order; stdout/stderr captured; failed when one command exits non-zero; does not continue after failure. |
| **refresh-project-understanding.test.ts** | Skips when artifacts fresh; refreshes when decision says refresh; returns failed when runner fails; passes through artifact paths and command list. |
| **webhook-intake-handler.test.ts** | All existing cases; mock `refreshProjectUnderstanding` to return skipped so pipeline runs; tests updated to async/await. |

**Run:**  
`npm run test -- --run electron/runtime/project-understanding-auto-refresh electron/runtime/webhook-intake/webhook-intake-handler.test.ts`  
Full suite: `npm run test -- --run`

---

## 5. Deferred Backlog Notes

- **Configurable freshness window**: Currently hard-coded to 5 minutes in the webhook handler. Could be moved to env (e.g. `PROJECT_UNDERSTANDING_FRESHNESS_MS`) if needed.
- **Repair-engine bridge**: `run-electron-repair-bridge` still only calls `loadProjectUnderstandingArtifacts` with no refresh. If bridge usage should also trigger refresh when artifacts are missing/stale, a separate integration step can call `refreshProjectUnderstanding` (with optional `forceRefresh` or no event) before load in that path; not in scope for OC-3.
- **Retries**: Spec explicitly says “no retries in this gate”; none added.
- **Ownership / optional artifacts**: The pipeline uses dependency-graph, module-map, architecture-summary, risk-hotspots. `ai-devos:ownership-inference` and ownership-map are not in the refresh command list; can be added later if required.
