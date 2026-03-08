# DC-1 — Scope Freeze and Deferred Backlog

**Gate:** DC-1 — Desktop Architecture Freeze  
**Scope:** What is included in DC-1; what is deferred to later gates.

---

## DC-1 Included

- Architecture freeze documentation (this document set)
- Module map with clear responsibilities
- Process and IPC boundary definition
- Security boundary and trust model
- Read-only first operating principle
- Placeholder modules: human-decision-console, release-update-foundation
- Explicit rules: core repair logic outside UI, desktop does not replace GitHub, human authority final

**DC-1 does not include:** UI screens, React pages, state machine viewer implementation, telemetry dashboard implementation, GitHub API integration, repo write operations, mutation controls, patch execution, workflow editing, auto-repair buttons, Jules activation, background autonomous behavior.

---

## Deferred to DC-2+

- State machine viewer implementation
- Telemetry dashboard implementation
- Event timeline viewer
- GPT analysis viewer
- Repair strategy / handoff display
- Concrete IPC channel implementation
- Integration with application services for read models
- Human-decision-console implementation (beyond placeholder)

---

## Deferred to Jules Activation Gates (JX)

Jules activation and authority are deferred to JX gates. Jules is a future bounded repair actor inside the repair engine ecosystem, not an uncontrolled desktop-native autonomous agent.

---

## Deferred to Human-Decision Gates

- Human approval/rejection flows for handoffs
- Human-mediated mutation flows (if any)
- Human-decision-console full implementation
- Integration of operator handoff display with decision actions

---

## Deferred to Release/Update Foundation Gates

- Application update checking
- Update notification and download
- Release update infrastructure
- Version management UI

---

## JULES ACTIVATION ROADMAP

Jules is future-bounded and must remain under orchestrated control. The following phases define allowed and forbidden authority for each stage. No phase is implemented in DC-1.

### JX-1 — Jules Observation Mode

| Attribute | Value |
|-----------|-------|
| **Purpose** | Jules observes repair context and produces analysis artifacts only. No execution. No patch generation. |
| **Allowed authority** | Read repair context; emit analysis summaries; produce observation reports |
| **Forbidden authority** | Patch creation; code changes; PR creation; merge; workflow mutation; any execution |

### JX-2 — Jules Patch Draft Mode

| Attribute | Value |
|-----------|-------|
| **Purpose** | Jules produces patch drafts as suggestions. Human must review and approve before any application. |
| **Allowed authority** | Generate patch drafts; emit suggested fixes; present draft to human |
| **Forbidden authority** | Apply patches without human approval; create PRs; merge; push; workflow mutation; auto-apply |

### JX-3 — Jules Actor Integration

| Attribute | Value |
|-----------|-------|
| **Purpose** | Jules is integrated as a bounded actor in the repair engine. Operates within state machine and guardian. |
| **Allowed authority** | Execute as actor within repair loop; produce normalized actor output; follow state machine transitions |
| **Forbidden authority** | Bypass state machine; bypass guardian; execute outside repair loop; autonomous loops; desktop-resident uncontrolled execution |

### JX-4 — Guardian Safety Layer

| Attribute | Value |
|-----------|-------|
| **Purpose** | Guardian evaluates Jules output before any external action. Ensures Jules actions are bounded and reviewable. |
| **Allowed authority** | Evaluate Jules output; block unsafe actions; require human escalation when threshold exceeded |
| **Forbidden authority** | Auto-approve all Jules actions; bypass human for destructive operations; silent override |

### JX-5 — Bounded Auto-Repair Loop

| Attribute | Value |
|-----------|-------|
| **Purpose** | Jules participates in a bounded auto-repair loop with strict retry limits and human escalation. |
| **Allowed authority** | Execute within retry limit; escalate to HUMAN on exhaustion; follow verdict and handoff |
| **Forbidden authority** | Unbounded retries; auto-merge; bypass human on exhaustion; bypass PR; bypass owner approval |

---

## Summary Table

| Category | Gate(s) | Status |
|----------|---------|--------|
| Architecture freeze docs | DC-1 | In scope |
| UI screens, dashboards | DC-2+ | Deferred |
| GitHub API integration | DC-2+ | Deferred |
| Mutation controls | Future human-decision | Deferred |
| Jules activation | JX-1 … JX-5 | Deferred |
| Release/update foundation | Future gate | Deferred |
