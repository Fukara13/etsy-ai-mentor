# Etsy AI Mentor — Complete Architecture Report

**Date:** 2025-03-07  
**Scope:** Full repository analysis with focus on `electron/gates/repair` (Repair Engine)  
**Current Gate Status:** Gate-S25 PASS

---

## 1. SYSTEM OVERVIEW

The Etsy AI Mentor is a production-grade AI Development Operating System (DevOS) built on Electron, with a React frontend and a state-machine–driven repair engine for automated CI failure handling.

**Core design principle:** The repair engine orchestrates automated repair attempts for CI failures via a pipeline:

```
CI Failure → Analyzer → Repair Coach → Jules Patch Engine → Guardian → Evaluator → Retry Controller → Human Authority
```

**Key constraints:**
- Retry limit = 3
- Human authority is final
- GitHub workflows are execution workers; they must not contain system decision logic
- State machine is the single source of truth for repair flow

**Technology stack:**
- Frontend: React 18, Vite
- Backend: Electron main process
- Tests: Vitest
- Persistence: sql.js (SQLite in-browser)

---

## 2. REPOSITORY STRUCTURE

### 2.1 Top-Level Directories

| Directory | Purpose |
|-----------|---------|
| `src/` | React renderer: components, screens, application services (GateService, CaptureService, StoreService, etc.) |
| `electron/` | Main process: IPC handlers, DB, OpenAI integration, gates (repair engine) |
| `.github/workflows/` | CI and gate workflows (ci.yml, gate-s4–s7) |
| `docs/` | Gate documentation, bootstrap, architecture |
| `scripts/` | Build/CI helper scripts |

### 2.2 Repair Engine Root: `electron/gates/repair/`

| Layer | Files | Purpose |
|-------|-------|---------|
| **Contracts** | types.ts, bridge-types.ts, repair-state.ts, repair-event.ts | Domain types, events, state constants |
| **State Machine** | repair-state-machine.ts, state-transition.ts | Canonical transitions and allowed next states |
| **Legacy State** | state-machine.ts | Phase-based repair loop (Gate-S10) |
| **Actor Runtime** | actor-runtime.ts, actor-runtime.types.ts, actor-result.ts | Actor registry, normalization |
| **Dispatcher** | step-actor-dispatcher.ts, actor-dispatcher.ts | State → actor mapping |
| **Step Executor** | repair-step-executor.ts | Single-step execution (S22) |
| **Loop Orchestrator** | repair-loop-orchestrator.ts, repair-loop-session.ts, repair-loop-policy.ts | Bounded loop (S23) |
| **Verdict** | repair-run-verdict.ts, repair-run-verdict-mapper.ts | Interpretation of outcome (S24) |
| **Handoff** | operator-handoff.types.ts, operator-handoff-mapper.ts, operator-handoff.ts | Operator envelope (S25) |
| **Support** | guardian.ts, evaluator.ts, retry-controller.ts, jules-integration.ts, execution-boundary.ts | Policy, evaluator, Jules stubs |
| **Bridge/Plan** | orchestrator-bridge.ts, decision-plan-adapter.ts, plan-validator.ts, plan-governor.ts | Event normalization, action plans |
| **Observability** | repair-trace.ts, trace-context.ts, repair-logger.ts, repair-telemetry.ts | Trace IDs, logging |

### 2.3 Data Flow (S21 → S25)

```
RepairState + RepairRuntimeContext
    → executeRepairStep (S22)
    → StepExecutionResult
    → runBoundedRepairLoop (S23)
    → RepairRunOutcome
    → deriveRepairRunVerdict (S24)
    → RepairRunVerdict
    → mapRepairOperatorHandoff (S25)
    → RepairOperatorHandoff
```

---

## 3. REPAIR ENGINE ARCHITECTURE

### 3.1 State Machine (Gate-S21)

**Source:** `repair-state-machine.ts`

- **REPAIR_STATE_SEQUENCE:** IDLE, ANALYZE, COACH, JULES_PENDING, GUARDIAN_CHECK, EVALUATOR_CHECK, CI_RETRY, EXHAUSTED, HUMAN
- **ALLOWED_TRANSITIONS:** Explicit map of allowed next states. HUMAN has no outgoing transitions.
- **isTerminalRepairState(state):** Returns true only for `HUMAN`. EXHAUSTED is not terminal (must transition to HUMAN).

The state machine is used by:
- `repair-step-executor` (isTerminalRepairState)
- `step-actor-dispatcher` (RepairState type)

### 3.2 Event-Driven Transition (Gate-S19)

**Source:** `state-transition.ts`

- **transition(currentState, event) → nextState**
- Unknown events escalate to HUMAN
- EXHAUSTED → HUMAN only via `HUMAN_ESCALATION`

### 3.3 Actor Runtime (Gate-S22)

**Source:** `actor-runtime.ts`, `actor-result.ts`

- **ACTOR_REGISTRY:** Map of ActorName → ExecuteFn
- Actors: Analyzer, RepairCoach, JulesPlaceholder, Guardian, Evaluator, RetryController, HumanEscalation
- All actors are deterministic stubs; no external calls
- **JulesPlaceholder** always returns `JULES_FROZEN_OUTCOME` and `requiresHuman: true` (Jules frozen)
- **normalizeActorResult** maps raw output to NormalizedActorResult (blocked, requiresHuman, event)

### 3.4 Step Executor (Gate-S22)

**Source:** `repair-step-executor.ts`

- Calls `getActorForState` → actor
- Executes actor, normalizes result
- Uses `transition(currentState, event)` for nextState
- Handles blocked/requiresHuman by escalating to HUMAN
- Returns StepExecutionResult (previousState, actor, nextState, halted, requiresHuman, terminal)

### 3.5 Bounded Loop Orchestrator (Gate-S23)

**Source:** `repair-loop-orchestrator.ts`

- **runBoundedRepairLoop(input)** → RepairRunOutcome
- Loops: `executeRepairStep` → update session → `shouldStop`
- Session tracks: stepCount, visitedStates, requiresHuman, halted, terminal, exhaustionReached
- Stop policy: terminal/HUMAN, halted, requiresHuman, blocked, stepCount >= maxSteps, cycle suspicion

### 3.6 Verdict Layer (Gate-S24)

**Source:** `repair-run-verdict-mapper.ts`

- **deriveRepairRunVerdict(outcome)** → RepairRunVerdict
- Mapping order: exhaustionReached → cycle_suspicion → blocked → requiresHuman → terminal resolved → max_steps → halted
- Output: status, reasonCode, requiresHuman, safeToRetry, safeToClose, operatorMessage

### 3.7 Operator Handoff (Gate-S25)

**Source:** `operator-handoff-mapper.ts`

- **mapRepairOperatorHandoff({ verdict, outcome? })** → RepairOperatorHandoff
- Adds: handoffIntent, nextAction, summary
- reasonCode drives handoffIntent (inform, review, intervene, stop)
- Optional outcome provides finalState; otherwise defaults to HUMAN

---

## 4. STATE MACHINE VALIDATION

### 4.1 Single Source of Truth

- **repair-state-machine.ts** defines allowed transitions and terminal state.
- **state-transition.ts** implements event → nextState; invalid events escalate to HUMAN.
- **repair-step-executor** uses `transition()` for all nextState; it does not compute nextState independently.

**Finding:** The state machine is the canonical decision layer for transitions.

### 4.2 Duplicate State Sources (Minor)

- **repair-state.ts** (Gate-S19): `REPAIR_STATES`, `TERMINAL_STATES`, `isTerminalState` (EXHAUSTED or HUMAN)
- **repair-state-machine.ts** (Gate-S21): `REPAIR_STATE_SEQUENCE`, `isTerminalRepairState` (HUMAN only)

The types are structurally identical. `isTerminalState` treats EXHAUSTED as terminal (no further automated actions); `isTerminalRepairState` treats only HUMAN as terminal (no outgoing transitions). The step executor uses `isTerminalRepairState` for halted logic, which is correct: EXHAUSTED must still transition to HUMAN.

**Risk:** Two `RepairState`-like type sources. Low impact; consider unifying in a future refactor.

### 4.3 Hidden Transitions

None. All transitions go through `transition()`. Unknown events escalate to HUMAN.

### 4.4 Parallel State Model (Gate-S10 vs S21)

- **state-machine.ts** (Gate-S10): Phase-based `RepairLoopState` with rich context (analyzer, coach, retry, etc.)
- **repair-state-machine.ts** (Gate-S21): Flat `RepairState` string union

The orchestrator-bridge uses `ciFailToAnalyze()` from state-machine.ts. The S22–S25 chain uses the flat RepairState. These are two parallel models; no direct bridge between them. The S22+ chain does not consume the orchestrator-bridge output.

**Finding:** Architectural duality. S22+ repair engine is self-contained and not yet wired to the orchestrator-bridge.

---

## 5. ACTOR SYSTEM ANALYSIS

### 5.1 Execution Path

1. `getActorForState(state)` → ActorName
2. `ACTOR_REGISTRY.get(actorName)` → ExecuteFn
3. ExecuteFn(input) → ActorRawOutput
4. `normalizeActorResult(raw)` → NormalizedActorResult
5. `toRepairEvent(normalized.recommendedEvent)` → RepairEvent | null
6. `transition(currentState, event)` → nextState

### 5.2 Coupling

- **step-actor-dispatcher** maps state → actor; it does not decide next state.
- **repair-step-executor** coordinates actor execution and state transition.
- Actors receive `ActorExecuteInput` (currentState, retryCount, maxRetries, context); they return `ActorRawOutput` (event, blocked, requiresHuman, etc.). Actors do not call the state machine directly.

**Finding:** Clear separation; no coupling that would allow actors to bypass the state machine.

### 5.3 Execution Ambiguity

- Unknown actor → blocked, requiresHuman, halted.
- Terminal state (HUMAN) → immediate no-op return.
- Blocked or requiresHuman without event → HUMAN_ESCALATION.

**Finding:** No execution ambiguity; all paths are defined.

### 5.4 Hidden Side Effects

- Actors are stubs: no network, no file I/O, no GPT.
- `createRepairTraceId()` uses `Date.now()` and `Math.random()`; non-deterministic but only for trace IDs, not for decisions.

---

## 6. REPAIR LOOP SAFETY

### 6.1 Bounded Execution

- **DEFAULT_MAX_STEPS = 50**
- **CYCLE_SUSPICION_THRESHOLD = 3** (same state visited ≥ 3 times → stop)
- Loop policy order: terminal/HUMAN → halted → requiresHuman → blocked → stepCount >= maxSteps → cycle suspicion

**Finding:** Loop is strictly bounded; no unbounded iteration.

### 6.2 Infinite Loop Risks

- Every iteration increments stepCount.
- stop conditions are evaluated after each step.
- Cycle suspicion stops when any state is visited 3 times.

**Finding:** No infinite loop risk under the current design.

### 6.3 Retry Safety

- Retry count is passed via `RepairRuntimeContext`.
- RetryController actor uses `retryCount >= maxRetries` to return RETRY_LIMIT_REACHED.
- EXHAUSTED transitions only to HUMAN (via HumanEscalation).

**Finding:** Retry logic is bounded and does not bypass human escalation.

### 6.4 Deterministic Stopping

- `shouldStop` is pure and deterministic.
- Session updates are local; no external state.

**Finding:** Stopping behavior is deterministic.

---

## 7. VERDICT & HANDOFF DESIGN

### 7.1 Verdict Layer (S24)

- **Input:** RepairRunOutcome
- **Output:** RepairRunVerdict (status, reasonCode, requiresHuman, safeToRetry, safeToClose, operatorMessage)
- Mapping is first-match; order ensures correct precedence.

**Finding:** Verdict layer is pure and deterministic.

### 7.2 Operator Handoff (S25)

- **Input:** { verdict, outcome? }
- **Output:** RepairOperatorHandoff (adds handoffIntent, nextAction, summary)
- summary = short, standardized; operatorMessage = more descriptive.

**Finding:** Handoff layer preserves verdict semantics and adds operator-facing structure.

### 7.3 Contract Consistency

- Outcome → Verdict → Handoff is a linear pipeline.
- Each layer preserves required fields; no information loss for operator decisions.

---

## 8. ARCHITECTURE COMPLIANCE

### 8.1 State Machine as Single Source of Truth

**Verified.** Transitions flow through `transition()`; actors do not invent transitions.

### 8.2 GitHub Workflows

- Workflows (`gate-s4-retry-controller`, `gate-s5-auto-remediation`, `gate-s6-gpt-failure-analyzer`, `gate-s7-stability-layer`) handle:
  - Triggers (workflow_run, workflow_dispatch)
  - PR resolution, label checks, attempt counting
  - Artifact collection, re-run CI

- Workflows do **not** implement repair state logic, transition rules, or verdict mapping. Decision logic resides in the repair engine code.

**Finding:** Workflows act as execution workers; system decisions stay in code.

### 8.3 Bounded Automation

- Max steps, cycle suspicion, and retry limit enforce bounds.
- HUMAN and EXHAUSTED both require human before further automation.

**Finding:** Automation is bounded.

### 8.4 Human Authority

- Blocked/requiresHuman paths escalate to HUMAN.
- EXHAUSTED → HumanEscalation → HUMAN.
- No auto-merge or automation that bypasses human approval.

**Finding:** Human authority cannot be bypassed by the repair engine.

---

## 9. ARCHITECTURAL RISKS

### 9.1 Dual State Models

- **Gate-S10** (state-machine.ts): Phase-based, rich context.
- **Gate-S21** (repair-state-machine.ts): Flat RepairState.

The S22–S25 chain uses only the flat model. The orchestrator-bridge uses the phase-based model. Risk: future integration may require mapping or unification.

### 9.2 No Integration Point for S22–S25

- `runBoundedRepairLoop`, `deriveRepairRunVerdict`, `mapRepairOperatorHandoff` are exported but not called from main process or IPC.
- The repair engine is a self-contained module; no UI or workflow invokes it.

**Risk:** The S22–S25 chain is implemented but not yet integrated into the application flow.

### 9.3 Trace ID Non-Determinism

- `createRepairTraceId()` uses `Date.now()` and `Math.random()`. Tests can be deterministic by injecting sessionId; production trace IDs are unique but not reproducible.

**Risk:** Low; trace IDs are for correlation, not decisions.

### 9.4 Domain Leakage

- `repair-state` and `repair-state-machine` both define RepairState; `actor-runtime.types` imports from repair-state-machine. Minor duplication.

### 9.5 Future Scalability

- Actor registry is a static Map. Adding actors requires code changes.
- Loop policy is centralized; extending stop conditions requires editing `repair-loop-policy.ts`.

---

## 10. S26 READINESS

### 10.1 Planned Gate-S26: External System Boundary Layer

Gate-S26 will introduce an external system boundary layer between the repair engine and GitHub, APIs, and other external systems.

### 10.2 Readiness Assessment

**Ready:**
- S21–S25 provide a clear pipeline: outcome → verdict → handoff.
- `RepairOperatorHandoff` is a transport-agnostic contract suitable for passing to an external boundary.
- No GitHub or GPT calls inside the repair engine; actors are stubs.

**Constraints S26 must follow:**
1. Do not modify the state machine, actor runtime, step executor, loop orchestrator, verdict, or handoff layers.
2. Treat the repair engine as a black box: input = `LoopRunInput`, output = `RepairOperatorHandoff`.
3. S26 receives handoff and is responsible for:
   - Translating to GitHub API calls (if applicable)
   - Translating to UI/notification format
   - Persistence (if required)
   - Telemetry emission
4. S26 must not inject decision logic; it only transports and projects.
5. Human authority remains final; S26 cannot auto-merge or bypass human approval.

### 10.3 Suggested S26 Interface

```
ExternalBoundaryInput = {
  handoff: RepairOperatorHandoff;
  outcome?: RepairRunOutcome;
  transport: 'github' | 'ipc' | 'log';
  options?: Record<string, unknown>;
}

projectToExternalSystem(input: ExternalBoundaryInput): Promise<ProjectionResult>
```

S26 would map `handoff` to the target system format without altering verdict semantics.

---

## APPENDIX A: Repair Engine File Inventory

| File | Gate | Role |
|------|------|------|
| repair-state-machine.ts | S21 | Transitions, allowed next states |
| repair-state.ts | S19 | State constants, isTerminalState |
| repair-event.ts | S19 | Event constants |
| state-transition.ts | S19 | transition() |
| step-actor-dispatcher.ts | S22 | State → actor |
| actor-dispatcher.ts | S19 | State → intent (legacy) |
| actor-runtime.ts | S22 | Actor registry |
| actor-result.ts | S22 | Normalization |
| repair-step-executor.ts | S22 | Single step |
| repair-loop-orchestrator.ts | S23 | Bounded loop |
| repair-loop-session.ts | S23 | Session model |
| repair-loop-policy.ts | S23 | Stop conditions |
| repair-run-outcome.ts | S23 | Outcome type |
| repair-run-verdict.ts | S24 | Verdict type |
| repair-run-verdict-mapper.ts | S24 | deriveRepairRunVerdict |
| operator-handoff.types.ts | S25 | Handoff type |
| operator-handoff-mapper.ts | S25 | mapRepairOperatorHandoff |

---

## APPENDIX B: Test Commands

```bash
# All repair gate tests
npm test -- electron/gates/repair

# Specific layers
npm test -- electron/gates/repair/repair-step-executor
npm test -- electron/gates/repair/repair-loop-orchestrator
npm test -- electron/gates/repair/repair-run-verdict
npm test -- electron/gates/repair/operator-handoff
```
