# REPORT-04 — REPAIR ENGINE TOPOLOGY AUDIT

**Project:** Etsy AI Mentor  
**Audit Date:** 2025-03-08  
**Architecture:** State-Machine AI Repair Engine  

---

## 1. Executive Summary

The repair system is implemented as a **state-machine–driven pipeline** with a clear orchestration model. A central orchestrator (`repair-loop-orchestrator.ts`) drives a bounded loop that invokes `executeRepairStep`, which dispatches to actors via `step-actor-dispatcher`, computes the next state using `state-transition.ts`, and feeds results back into the loop. The pipeline ends with verdict derivation and operator handoff mapping.

Two parallel subsystems exist:

1. **S22–S25 chain** — Flat state machine (`repair-state-machine.ts`), step executor, loop orchestrator, verdict mapper, operator handoff. Self-contained, deterministic, tested. **Not invoked from main process or IPC.**

2. **Orchestrator bridge (S12)** — Phase-based model (`state-machine.ts`), event normalization, context resolution. Returns action plans; does not execute. **Not connected to the S22–S25 chain.**

The repair engine is well-structured and follows a clear pipeline. The main structural risk is the **dual state model** and the **S22–S25 chain not being wired into the application flow**.

---

## 2. Repair Pipeline Mapping

### Canonical Expected Pipeline

```
CI Failure → Analyzer → Repair Coach → GPT Analysis → Repair Strategy → Verdict → Operator Handoff → Human Authority
```

### Actual Pipeline (S22–S25 Chain)

```
IDLE
  → CI_FAILURE_START → ANALYZE (Analyzer)
  → ANALYSIS_COMPLETED → COACH (RepairCoach)
  → COACH_COMPLETED → JULES_PENDING (JulesPlaceholder)
  → JULES_PATCH_PRODUCED → GUARDIAN_CHECK (Guardian)
  → GUARDIAN_COMPLETED → EVALUATOR_CHECK (Evaluator)
  → EVALUATOR_PASSED → HUMAN (terminal)
  → EVALUATOR_FAILED → CI_RETRY (RetryController)
  → CI_RETRY_COMPLETED → ANALYZE (loop)
  → RETRY_LIMIT_REACHED → EXHAUSTED
  → HUMAN_ESCALATION → HUMAN (terminal)
```

**Verdict:** `deriveRepairRunVerdict(RepairRunOutcome)` → `RepairRunVerdict`  
**Operator handoff:** `mapRepairOperatorHandoff({ verdict, outcome? })` → `RepairOperatorHandoff`

**Alignment:** The actual pipeline matches the expected flow. Analyzer, Repair Coach, and GPT Analysis appear as ANALYZE, COACH, JULES_PENDING. Strategy and verdict map to Guardian, Evaluator, RetryController, and verdict mapper. Human Authority is the terminal HUMAN state.

---

## 3. Repair Engine Components

| Module | Responsibility | Interactions |
|--------|----------------|--------------|
| **repair-state-machine.ts** | Defines `REPAIR_STATE_SEQUENCE`, allowed transitions, `isTerminalRepairState` | Used by `repair-step-executor`, `step-actor-dispatcher` |
| **repair-state.ts** | `REPAIR_STATES`, `TERMINAL_STATES`, `isTerminalState` | Used by `repair-loop-orchestrator`, `repair-step-executor` |
| **state-transition.ts** | `transition(currentState, event) → nextState`. Unknown events escalate to HUMAN | Called by `repair-step-executor` |
| **repair-event.ts** | `REPAIR_EVENTS` enum | Used by `state-transition`, `repair-step-executor` |
| **step-actor-dispatcher.ts** | `getActorForState(state)` → ActorName | Called by `repair-step-executor` |
| **actor-runtime.ts** | `ACTOR_REGISTRY` (state → actor implementation) | Called by `repair-step-executor` |
| **actor-result.ts** | `normalizeActorResult(raw)` → NormalizedActorResult | Called by `repair-step-executor` |
| **repair-step-executor.ts** | Executes one step: get actor, run actor, transition, return result | Called by `repair-loop-orchestrator` |
| **repair-loop-orchestrator.ts** | `runBoundedRepairLoop`: loop over `executeRepairStep` until stop | Calls `repair-step-executor`, uses `repair-loop-policy` |
| **repair-loop-session.ts** | Session state (currentState, stepCount, visitedStates, etc.) | Used by `repair-loop-orchestrator` |
| **repair-loop-policy.ts** | `shouldStop(stepResult, stepCount, maxSteps, visitCounts)` | Called by `repair-loop-orchestrator` |
| **repair-run-verdict-mapper.ts** | `deriveRepairRunVerdict(outcome)` → RepairRunVerdict | Standalone; consumes RepairRunOutcome |
| **operator-handoff-mapper.ts** | `mapRepairOperatorHandoff({ verdict, outcome? })` → RepairOperatorHandoff | Standalone; consumes verdict |
| **orchestrator-bridge.ts** | Normalize event, resolve context, dispatch to phase-based state machine | Uses `event-normalizer`, `context-resolver`, `state-machine` (phase-based) |
| **state-machine.ts** | Phase-based model: ciFailToAnalyze, analyzerToCoach, etc. | Used by `orchestrator-bridge` only |
| **failure-classifier.ts** | `classifyFailure` → FailureClass | Standalone; not called from loop |
| **repair-strategy.ts** | `selectRepairStrategy`, `mapRepairStrategy` | Standalone; not called from loop |
| **repair-decision.ts** | `buildRepairDecision` | Standalone; not called from loop |
| **gpt-analysis.ts** | `analyzeRepairContext`, `mapRepairContextToPrompt` | Standalone; not called from loop |
| **guardian.ts** | `runGuardian` (file path safety check) | Called by Guardian actor in `actor-runtime` |
| **evaluator.ts** | `runEvaluator` | Called by Evaluator actor in `actor-runtime` |
| **retry-controller.ts** | `incrementRetry`, `isExhausted`, `canRetry` | Logic embedded in RetryController actor |

---

## 4. Orchestration Model

**Hybrid: True state machine + centralized orchestrator**

| Aspect | Finding |
|--------|---------|
| **State machine** | Yes. `repair-state-machine.ts` defines allowed transitions. `state-transition.ts` implements event-driven transitions. Transitions are deterministic. |
| **Central orchestrator** | Yes. `repair-loop-orchestrator.ts` drives the loop and calls `executeRepairStep` in sequence. |
| **Distributed services** | No. The S22–S25 chain is a single module; actors are stubs in the same process. |
| **Ad-hoc logic** | No. Flow is structured; transitions go through `transition()`; no bypass paths. |

**Orchestration flow**

1. `runBoundedRepairLoop` creates a session and enters a loop.
2. Each iteration: `executeRepairStep(ctx)` → `getActorForState` → actor runs → `transition(currentState, event)` → nextState.
3. `shouldStop` checks terminal, halted, max steps, cycle suspicion.
4. On exit: `deriveRepairRunVerdict(outcome)` → `mapRepairOperatorHandoff(verdict)`.

**Parallel path:** The orchestrator bridge (`runOrchestratorBridge`) uses the phase-based `state-machine.ts`, normalizes events, and returns an action plan. It does not execute and is not called by the S22–S25 chain.

---

## 5. Structural Risks

| Risk | Severity | Details |
|------|----------|---------|
| **Dual state models** | Medium | `state-machine.ts` (phase-based) vs `repair-state-machine.ts` (flat). Orchestrator bridge uses the former; S22–S25 uses the latter. No shared mapping. |
| **S22–S25 chain not integrated** | High | `runBoundedRepairLoop`, `executeRepairStep`, `runOrchestratorBridge` are exported but never called from main or IPC. The engine is implemented and tested but not wired into the application. |
| **Duplicate state semantics** | Low | `repair-state.ts` vs `repair-state-machine.ts`. `isTerminalState` (EXHAUSTED or HUMAN) vs `isTerminalRepairState` (HUMAN only). Minor duplication; step executor uses the correct one. |
| **Standalone intelligence modules** | Medium | `failure-classifier`, `repair-strategy`, `repair-decision`, `gpt-analysis` are not invoked from the loop. They are separate; future integration may require explicit wiring. |

---

## 6. Architecture Strengths

| Strength | Evidence |
|----------|----------|
| **Single source of truth for transitions** | All transitions go through `state-transition.ts`. Unknown events escalate to HUMAN. |
| **Clear pipeline** | IDLE → ANALYZE → COACH → JULES_PENDING → GUARDIAN → EVALUATOR → CI_RETRY/EXHAUSTED/HUMAN. |
| **Bounded loop** | `repair-loop-policy` enforces max steps, cycle suspicion, retry limits. |
| **Actor abstraction** | State → actor mapping in `step-actor-dispatcher`; actors are stubs, no external calls. |
| **Pure verdict and handoff** | `deriveRepairRunVerdict` and `mapRepairOperatorHandoff` are pure mapping functions. |
| **Escalation policy** | Blocked or `requiresHuman` always leads to HUMAN. No hidden bypass. |
| **Comprehensive tests** | Step executor, loop orchestrator, state transition, and orchestrator bridge have focused tests. |

---

## 7. Architecture Risk Level

**Moderate**

**Reasoning**

- The repair engine is **well-structured**: clear state machine, central orchestrator, bounded loop, and pure post-processing. Responsibilities are separated.
- **Structural risk** is moderate: the S22–S25 chain is not integrated; the dual state model (phase-based vs flat) could complicate future integration.
- **Operational risk** is low: actors are stubs; no hidden side effects or uncontrolled automation.

---

## 8. Architect Observations

1. **Pipeline matches the canonical flow** — Analyzer, Repair Coach, GPT Analysis, Strategy, Verdict, Operator Handoff, Human Authority are present and ordered correctly.

2. **Orchestrator bridge and S22–S25 chain are disconnected** — The orchestrator bridge returns action plans; the S22–S25 chain runs the repair loop. There is no code path that uses both.

3. **Integration point is missing** — `runBoundedRepairLoop` needs a caller: GitHub Actions, Electron main, or another runtime. The intended integration path is not documented in code.

4. **Actors are deterministic stubs** — Actors (Analyzer, RepairCoach, JulesPlaceholder, etc.) return fixed or context-derived values. No real GPT or Jules integration in the loop.

5. **Verdict and handoff are transport-agnostic** — `RepairOperatorHandoff` can be passed to GitHub API, desktop IPC, or logs without changes to the repair engine.

6. **Two RepairState-like sources** — `repair-state.ts` and `repair-state-machine.ts` both define state-related types. Consolidation would reduce confusion.
