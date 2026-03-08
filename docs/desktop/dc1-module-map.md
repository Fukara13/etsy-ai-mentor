# DC-1 — Module Map

**Gate:** DC-1 — Desktop Architecture Freeze  
**Scope:** Production-grade desktop module map with clear responsibilities.

---

## Design Principle

Readers consume **projections / summaries / read models**. They do **not** own core decision logic. The repair engine remains the canonical decision system; read models are derived views.

---

## Module Overview

| Module | Responsibility |
|--------|----------------|
| desktop-shell | Host process; window lifecycle; IPC registration |
| renderer-app | UI layer; React app; rendering only |
| preload-bridge | Bounded IPC exposure to renderer |
| application-facade | Orchestration; gate to application services |
| read-models | Read-model aggregator; no decision ownership |
| event-timeline-reader | Consumes event projections |
| state-machine-reader | Consumes state projections |
| gpt-analysis-reader | Consumes GPT analysis projections |
| repair-strategy-reader | Consumes repair strategy projections |
| telemetry-reader | Consumes telemetry projections |
| human-decision-console-placeholder | Placeholder for future human-decision UI |
| release-update-foundation-placeholder | Placeholder for future release/update infrastructure |

---

## Module Specifications

### desktop-shell

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Electron main process; window creation and lifecycle; IPC handler registration; preload script injection |
| **Allowed inputs** | Window lifecycle events; IPC invocations from preload bridge |
| **Allowed outputs** | Window state; IPC responses; preload script |
| **Forbidden** | Core repair logic; state machine transitions; GitHub API calls; mutation decisions |

---

### renderer-app

| Attribute | Value |
|-----------|-------|
| **Responsibility** | React UI; layout; presentation; user interaction (buttons, navigation, display) |
| **Allowed inputs** | Data from preload bridge (read-model queries only) |
| **Allowed outputs** | User intent (queries, navigation); no direct system mutation |
| **Forbidden** | Privileged Node/Electron APIs; direct GitHub access; repair state machine; workflow mutation; patch execution |

---

### preload-bridge

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Expose a bounded, allowlisted set of IPC capabilities to the renderer |
| **Allowed inputs** | Renderer calls via exposed API |
| **Allowed outputs** | Forwarded IPC invocations to main; returned results |
| **Forbidden** | Generic `execute` channel; arbitrary shell bridge; exposing `require`, `process`, or privileged APIs to renderer |

---

### application-facade

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Orchestration layer between IPC and application services (SessionService, CaptureService, GateService, etc.); routes read-model requests to appropriate readers |
| **Allowed inputs** | IPC invocations from main; application service interfaces |
| **Allowed outputs** | Aggregated read-model responses; service call results |
| **Forbidden** | Core repair logic; state machine; direct repo mutation; workflow mutation |

---

### read-models

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Aggregator for read-model queries; dispatches to specialized readers; does not own or compute repair decisions |
| **Allowed inputs** | Query requests (by type, time range, session, etc.) |
| **Allowed outputs** | Projections, summaries, snapshots; read-only data structures |
| **Forbidden** | State machine transitions; verdict derivation; actor execution; mutation |

---

### event-timeline-reader

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Consumes event projections (repair events, CI events, workflow events); presents timeline view |
| **Allowed inputs** | Event projections; trace IDs; time bounds |
| **Allowed outputs** | Timeline data structures; event lists; no mutations |
| **Forbidden** | Event creation; state transitions; repair engine logic |

---

### state-machine-reader

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Consumes state projections (current RepairState, visited states, session snapshot); presents state view |
| **Allowed inputs** | State projections; session identifiers |
| **Allowed outputs** | State display data; transition history; no mutations |
| **Forbidden** | State transitions; actor dispatch; repair engine execution |

---

### gpt-analysis-reader

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Consumes GPT analysis projections; failure analysis, suggested fix, risk, confidence |
| **Allowed inputs** | Analysis projections (e.g., from PR comments, logs) |
| **Allowed outputs** | Display-ready analysis data; no mutations |
| **Forbidden** | GPT invocation; analysis creation; code changes |

---

### repair-strategy-reader

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Consumes repair strategy projections; handoff, verdict, next action, operator message |
| **Allowed inputs** | RepairOperatorHandoff; RepairRunVerdict; outcome summaries |
| **Allowed outputs** | Display-ready strategy data; no mutations |
| **Forbidden** | Verdict derivation; handoff mapping; repair execution |

---

### telemetry-reader

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Consumes telemetry projections; traces, metrics, run counts |
| **Allowed inputs** | Telemetry projections; trace IDs; time bounds |
| **Allowed outputs** | Metrics display data; dashboards; no mutations |
| **Forbidden** | Telemetry emission logic (may consume); mutation; decision logic |

---

### human-decision-console-placeholder

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Placeholder for future human-decision UI; no implementation in DC-1 |
| **Allowed inputs** | (Deferred) Handoff summaries; approval requests |
| **Allowed outputs** | (Deferred) Human approval/rejection signals |
| **Forbidden** | Auto-approval; bypass of human authority; mutation in DC-1 |

---

### release-update-foundation-placeholder

| Attribute | Value |
|-----------|-------|
| **Responsibility** | Placeholder for future release/update infrastructure; no implementation in DC-1 |
| **Allowed inputs** | (Deferred) Update manifests; version checks |
| **Allowed outputs** | (Deferred) Update availability; download triggers |
| **Forbidden** | Auto-update without user consent; silent installation |

---

## Boundary Summary

- **Readers** consume projections. They do not own repair decisions.
- **Application-facade** routes queries; it does not execute repair steps.
- **Renderer** displays data; it does not mutate repos or workflows.
- **Preload-bridge** exposes only allowlisted, query-oriented capabilities.
