# DC-1 — Desktop Architecture Freeze

**Gate:** DC-1 — Desktop Architecture Freeze  
**Scope:** Architecture definition only. No implementation.  
**Date:** 2025-03-08

---

## Purpose

This document defines the architecture freeze for the **Desktop Control Center** expansion line in Etsy AI Mentor. The Desktop Control Center is an operator cockpit that provides visibility and control over the AI-DevOS without becoming the execution owner.

---

## Canonical Architecture Summary

| Component | Role |
|-----------|------|
| **State-Machine AI Repair Engine** | Canonical decision system for repair flow and transitions |
| **GitHub Backbone** | Execution backbone; CI, workflows, PRs, merge authority |
| **Desktop Control Center** | Operator cockpit; read-focused control surface |
| **Human** | Final authority; all mutations require human approval |

**Core relationship:** GitHub Backbone remains the execution system. The Desktop Control Center does not replace it. Desktop sits on top as a read-focused control surface.

---

## GitHub Backbone vs Desktop Control Center

- **GitHub Backbone** = execution system. Workflows, CI runs, PR creation, artifact collection, retry orchestration.
- **Desktop Control Center** = operator cockpit. Visibility into repair state, analysis outputs, telemetry, and operator-facing summaries.
- **We are not moving the system into desktop.** We are making the existing system operable through desktop.
- Desktop observes, queries, and presents. GitHub executes. Human decides.

---

## Desktop as Operator Cockpit, Not Execution Owner

- The Desktop Control Center is a **control surface**, not the system of record for repair decisions.
- The repair engine, verdict layer, and handoff logic remain in their canonical locations (electron/gates/repair).
- The Desktop does not own the state machine, actor registry, or transition logic.
- Operator actions exposed through Desktop are bounded by governance: no merge without PR, no merge without owner approval, auto-merge disabled.

---

## Desktop as Read-Focused Control Surface

- **Read-first operating principle:** Default Desktop capabilities are query and observation.
- Mutation flows (if introduced in future gates) are explicit, reviewable, and require human authority.
- Read models, projections, and summaries are consumed by Desktop. Core decision ownership stays outside Desktop UI.

---

## Explicit Architecture Rules

### Rule 1: Core repair logic remains outside desktop UI

The state machine, transition logic, actor runtime, verdict mapper, and operator handoff mapper are **not** owned by or embedded in the Desktop UI. Desktop consumes outputs (projections, read models, handoffs) via bounded IPC.

### Rule 2: Desktop does not replace GitHub backbone

GitHub remains the execution backbone. Workflows run on GitHub. CI runs on GitHub. PRs and merges are GitHub operations. Desktop does not become an alternative execution path.

### Rule 3: Human authority remains final

All governance applies: no merge without PR, no merge without owner approval, auto-merge disabled, retry limit bounded, rollback always possible. Desktop must not introduce flows that bypass human authority.

---

## Future Placement: Jules

Jules is a future bounded repair actor inside the repair engine ecosystem, not an uncontrolled desktop-native autonomous agent.

- Jules is planned to live within the **repair engine** (actor registry, guardian layer, evaluator), not as a desktop-resident service.
- Jules must not become an uncontrolled desktop-resident autonomous agent.
- Jules activation, authority, and boundaries are deferred to JX gates (see dc1-scope-freeze-and-deferred-backlog.md).

---

## Document Set

- **dc1-desktop-architecture-freeze.md** (this document) — High-level architecture and rules
- **dc1-module-map.md** — Module responsibilities and boundaries
- **dc1-process-and-ipc-boundary.md** — Electron process model and IPC design
- **dc1-security-boundary.md** — Security principles and trust boundaries
- **dc1-scope-freeze-and-deferred-backlog.md** — Scope freeze and deferred backlog
