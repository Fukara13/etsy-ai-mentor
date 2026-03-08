# REPORT-05 — DETERMINISM BOUNDARY AUDIT

**Project:** Etsy AI Mentor  
**Audit Date:** 2025-03-08  
**Architecture:** State-Machine AI Repair Engine  

---

## 1. Executive Summary

The repair engine separates deterministic logic from side-effect logic effectively. Core orchestration (state-transition, repair-step-executor, actor stubs, verdict mapper, operator handoff) is deterministic and pure. Side effects are confined to trace IDs (non-deterministic), timestamps, and logging. Actors are stubs with no network or filesystem access. One non-determinism source exists: `createRepairTraceId()` uses `Date.now()` and `Math.random()`, affecting production trace IDs but not decision logic.

---

## 2. Deterministic Zones

| Module | Evidence | Notes |
|--------|----------|-------|
| `electron/gates/repair/state-transition.ts` | Pure `transition(currentState, event) → nextState` | No I/O, no Date, no random |
| `electron/gates/repair/repair-state-machine.ts` | `getAllowedNextStates`, `canTransition`, `isTerminalRepairState` | Pure lookup |
| `electron/gates/repair/step-actor-dispatcher.ts` | `getActorForState(state)` | Pure Map lookup |
| `electron/gates/repair/actor-runtime.ts` | Actors return stubs; Guardian/Evaluator call pure logic | No network; guardian/evaluator are pure checks |
| `electron/gates/repair/actor-result.ts` | `normalizeActorResult(raw)` | Pure mapping |
| `electron/gates/repair/repair-step-executor.ts` | Calls actors, `transition`, returns result | Orchestration; actors are stubs |
| `electron/gates/repair/repair-loop-policy.ts` | `shouldStop(stepResult, stepCount, maxSteps, visitCounts)` | Pure policy |
| `electron/gates/repair/repair-run-verdict-mapper.ts` | `deriveRepairRunVerdict(outcome)` | Pure mapping |
| `electron/gates/repair/operator-handoff-mapper.ts` | `mapRepairOperatorHandoff({ verdict, outcome? })` | Pure mapping |
| `electron/gates/repair/failure-classifier.ts` | `classifyFailure` | Pure classification |
| `electron/gates/repair/repair-strategy.ts` | `selectRepairStrategy`, `mapRepairStrategy` | Pure mapping |
| `electron/gates/repair/repair-decision.ts` | `buildRepairDecision` | Pure mapping |
| `electron/gates/repair/safety-guard.ts` | `evaluateSafety` | Pure evaluation |
| `electron/gates/repair/plan-validator.ts` | `validateActionPlan` | Pure validation |
| `electron/gates/repair/plan-governor.ts` | `governActionPlan` | Pure governance |
| `src/shared/deterministic.ts` | Deterministic utilities | Explicitly deterministic |
| `src/desktop/renderer/features/repair-timeline/repair-run-timeline-mapper.ts` | `mapRepairRunToTimeline` | Pure mapping from read models |
| `src/desktop/analysis/`, `decision/`, `telemetry/` mappers | View mappers | Pure mapping |

---

## 3. Side-Effect Zones

| Module | Side Effect | Bounded? |
|--------|-------------|----------|
| `electron/gates/repair/repair-trace.ts` | `createRepairTraceId()` uses `Date.now()`, `Math.random()` | Yes; trace IDs for correlation, not decisions |
| `electron/gates/repair/repair-loop-orchestrator.ts` | `new Date().toISOString()` for `endedAt` | Yes; timestamps only |
| `electron/gates/repair/repair-loop-session.ts` | `startedAt: new Date().toISOString()` | Yes |
| `electron/gates/repair/event-normalizer.ts` | `timestamp: options?.timestampOverride ?? new Date().toISOString()` | Yes; overridable in tests |
| `electron/gates/repair/orchestrator-bridge.ts` | Fallback timestamp in error path | Yes |
| `electron/gates/repair/repair-logger.ts` | `new Date().toISOString()` for log timestamp | Yes; logging only |
| `electron/db.ts` | SQLite read/write | Bounded; main process only |
| `electron/openai.ts` | OpenAI API calls | Bounded; full app only, not desktop |
| `electron/parser.ts` | Parse operations | Bounded; main process |

---

## 4. Mixed-Boundary Findings

| Finding | Location | Severity |
|---------|----------|----------|
| Trace ID non-determinism | `electron/gates/repair/repair-trace.ts` lines 6–7: `Date.now()`, `Math.random()` | Low. Tests can inject sessionId; production trace IDs are unique but not reproducible. Does not affect repair decisions. |
| Timestamp in loop outcome | `electron/gates/repair/repair-loop-orchestrator.ts` line 31: `endedAt = session.endedAt ?? new Date().toISOString()` | Low. Used for metadata only; decision logic uses state, stepCount, visitedStates. |
| Event normalizer timestamp | `electron/gates/repair/event-normalizer.ts` line 53 | Mitigated. `options?.timestampOverride` allows deterministic tests. |

**No pure logic mixed with I/O** in repair engine core. Actors do not perform fetch, fs, exec, or spawn.

---

## 5. Architectural Risk

**Low**

- Core orchestration and decision logic remain deterministic.
- Side effects are limited to trace IDs, timestamps, and logging; bounded and documented.
- Retry logic (`retry-controller.ts`, RetryController actor) is pure; no mutable external boundaries.
- Orchestration loop uses deterministic `shouldStop`; no hidden I/O in the loop.
- Tests can achieve determinism via sessionId injection and timestamp override.
