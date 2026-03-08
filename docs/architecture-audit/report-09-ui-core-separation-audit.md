# REPORT-09 — UI-CORE SEPARATION AUDIT

**Project:** Etsy AI Mentor  
**Audit Date:** 2025-03-08  
**Architecture:** State-Machine AI Repair Engine  

---

## 1. Executive Summary

The UI remains a presentation layer and does not contain repair engine logic. `src/desktop/` does not import from `electron` or `electron/gates/repair`. View mappers map read models to UI shapes; state names (ANALYZE, COACH, etc.) are display constants, not orchestration logic. No business logic, orchestration, or domain leakage into renderer components was found.

---

## 2. Separation Findings

| Check | Result |
|-------|--------|
| **Imports from electron** | None in `src/desktop/`. |
| **Imports from gates/repair** | None in `src/`. |
| **Orchestration in renderer** | None. Renderer calls `desktopApi.read.get*View()` via IPC; no loop, step executor, or state machine. |
| **Domain logic in components** | None. Components render data; view mappers transform read models to view models. |
| **State machine logic in UI** | None. `repair-run-timeline-mapper` uses state name strings for display only; no `transition()`, no `executeRepairStep`. |

---

## 3. Logic Placement

| Layer | Responsibility | Location |
|-------|----------------|----------|
| **Core repair logic** | State machine, actors, step executor, loop | `electron/gates/repair/` |
| **View mappers** | Map read models → view models | `src/desktop/analysis/`, `decision/`, `telemetry/`, `renderer/features/repair-timeline/` |
| **UI components** | Render data, handle local state | `src/desktop/renderer/features/` |
| **Read models** | Shared contracts | `src/shared/read-models/` |

---

## 4. Maintainability Risks

| Risk | Severity | Notes |
|------|----------|-------|
| **State name coupling** | Low | `repair-run-timeline-mapper.ts` hardcodes ANALYZE, COACH, etc. If engine states change, UI must be updated. Consider shared contract. |
| **Backbone path** | Low | `src/desktop/backbone` runs in main but lives under renderer path; could mislead contributors. |
