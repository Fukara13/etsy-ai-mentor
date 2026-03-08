# REPORT-02 — CANONICAL ARCHITECTURE ALIGNMENT

**Project:** Etsy AI Mentor  
**Audit Date:** 2025-03-08  
**Architecture:** State-Machine AI Repair Engine  

---

## 1. Executive Verdict

**Mostly aligned**

The repository respects the canonical architecture constraints: the desktop is read-only, the renderer is untrusted, core repair logic stays outside the UI, and no hidden repo write paths from the UI are present. There are no boundary violations. However, the **AI Repair Engine is not yet integrated**—it is implemented and tested but not invoked from the main process or IPC. The desktop currently displays mock data only. Functionally, the system is aligned with the architecture; the main gap is integration, not misalignment.

---

## 2. Layer Mapping

| Canonical Layer | Code Modules | Evidence |
|-----------------|--------------|----------|
| **GitHub Backbone** | `.github/workflows/` (ci.yml, repair-input.yml, gate-s4..s7) | CI runs, collects failure inputs, retriggers CI (gate-s5). Does not call the repair engine. |
| **AI Repair Engine** | `electron/gates/repair/` (state machine, actors, step executor, loop orchestrator, verdict, handoff) | Deterministic, UI-independent, no DOM/React. Exported but not invoked from main or IPC. |
| **Desktop Control Center** | `electron/desktop/`, `electron/ipc/`, `src/desktop/` | Read-only IPC (`desktop:read:*`, `desktop:health:ping`). Preload exposes only `read.*`. |
| **Human Operator Boundary** | `DecisionConsolePanel`, `desktopApi.read` | Displays approve/reject/escalate options; buttons update local UI state only. No `write`, `execute`, or mutation APIs exposed. |

---

## 3. Responsibility Distribution

| Responsibility | Location | Notes |
|----------------|----------|-------|
| **CI execution** | `.github/workflows/ci.yml` | Runs tests, build. |
| **Repair orchestration** | `electron/gates/repair/repair-loop-orchestrator.ts` | `runBoundedRepairLoop` implemented and tested. Not called from main or IPC. |
| **Failure analysis** | `electron/gates/repair/` (failure-classifier, gpt-analysis) | Implemented. Invoked only from tests. |
| **Repair strategy generation** | `electron/gates/repair/repair-strategy.ts`, `plan-governor` | Implemented. Not invoked at runtime. |
| **Verdict evaluation** | `electron/gates/repair/repair-run-verdict.ts` | Implemented. Not invoked at runtime. |
| **Operator handoff preparation** | `electron/gates/repair/operator-handoff.ts`, `operator-handoff-mapper.ts` | Implemented. Not invoked at runtime. |
| **Telemetry projection** | `electron/gates/repair/repair-telemetry-mapper.ts` | Implemented. Desktop uses mock backbone adapter. |
| **Desktop visualization** | `src/desktop/renderer/features/` | Panels fetch read models via IPC and render. No engine logic. |
| **Operator decision surfaces** | `DecisionConsolePanel` | Uses `desktopApi.read.getDecisionView()`. Buttons only update local `selectedId`. No execution. |

---

## 4. Boundary Violations

**None detected.**

| Constraint | Check | Result |
|------------|-------|--------|
| UI must not contain core repair logic | No imports from `electron` or `gates` in `src/desktop`. `repair-run-timeline-mapper` maps read models to view shapes; state names (ANALYZE, COACH, HUMAN) are display constants. | **Pass** |
| Desktop must remain read-only | Preload exposes only `read.*` and `system.ping`. No `send` or write channels. IPC allow-list contains only read-focused channels. | **Pass** |
| Repair engine must not touch UI | Repair engine does not import from `src/`. No React or DOM usage. | **Pass** |
| No GitHub execution logic in desktop | Desktop does not import or reference workflow files. No GitHub API calls from desktop path. | **Pass** |
| No hidden repo write paths from UI | Desktop IPC channels are read-only. Tests assert absence of `write`, `execute`, `mutate` APIs. | **Pass** |
| AI must not gain execution authority | Repair engine actors are stubs; GPT integration lives in `electron/openai.ts` (full app), not in desktop path. Desktop has no AI execution flows. | **Pass** |

---

## 5. Architecture Drift Indicators

| Pattern | Risk | Details |
|---------|------|---------|
| **Orphaned repair engine** | High | `runBoundedRepairLoop`, `executeRepairStep`, `runOrchestratorBridge` are exported but not called from main or IPC. The engine is self-contained and tested but not yet integrated into application flow. |
| **Mock-only backbone** | Medium | `src/desktop/backbone` uses `createMockBackboneReadAdapter()`. No connection to the repair engine or GitHub. Desktop always displays mock data. |
| **Two Electron entry points** | Medium | Full app (`electron/main.ts`) vs desktop (`electron/desktop/main.ts`). Responsibilities differ; their relationship and intended use are not clearly documented. |
| **State name coupling in UI** | Low | `repair-run-timeline-mapper.ts` hardcodes engine state names (ANALYZE, COACH, JULES_PENDING, etc.) for display. Acceptable view projection; risk if state names change frequently. |
| **Backbone runs in main** | Low | `src/desktop/backbone` is invoked from `electron/ipc/handlers/backbone-read.ts`. Placement under `src/desktop/` may suggest renderer ownership; it executes in main process. |

---

## 6. Alignment Risk Level

**Moderate**

**Strengths**

- Boundaries are enforced: desktop is read-only, renderer is untrusted, core logic remains UI-independent.
- Tests enforce decision-surface contracts (e.g., `api?.write`, `api?.execute` must be undefined).
- IPC allow-list and bounded preload maintain the security model.

**Main risk**

- The AI Repair Engine is not yet wired into the system. The intended flow (GitHub failure → repair engine → handoff → human) is not implemented. The desktop shows mock data only. This is an **integration gap**, not a boundary violation.

**Secondary risk**

- Two Electron entry points with overlapping and distinct responsibilities; selection and documentation need clarification.

---

## 7. Architect Questions

1. **Integration target:** Where should `runBoundedRepairLoop` be invoked—GitHub Actions, Electron main process, or another runtime? What is the intended deployment path?

2. **Backbone wiring:** When should the backbone move from mocks to live data? Will it consume repair engine output via IPC, GitHub API, or another service?

3. **Human authority flow:** `DecisionConsolePanel` displays options only. Where will approve/reject/escalate be executed—GitHub PR actions, external tool, or future IPC handlers?

4. **Electron entry point selection:** For packaged deployment, should the product ship only the desktop entry point, both, or a different configuration? How should `package.json` main be set?

5. **State name source of truth:** Should engine state names used in `repair-run-timeline-mapper` be defined in a shared contract instead of hardcoded in the UI layer?

6. **GitHub workflow scope:** `repair-input.yml` collects diff and logs. `gate-s5` retriggers CI. Should either workflow eventually invoke the repair engine, or is the engine intended to run only inside the Electron app?
