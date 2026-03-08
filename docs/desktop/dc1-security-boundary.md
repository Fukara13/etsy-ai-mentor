# DC-1 — Security Boundary

**Gate:** DC-1 — Desktop Architecture Freeze  
**Scope:** Desktop security principles, trust boundaries, threat awareness.

---

## Security Principles

### Least privilege

- Each component receives only the permissions necessary for its defined responsibility.
- Renderer has no Node.js, no file system, no direct GitHub access.
- Preload bridge exposes only allowlisted, query-oriented capabilities.

### Read-only first

- Default capability is observation and query. Mutation is not default.
- Any future mutation flow requires explicit design, governance, and human authority.

### Explicit boundary between UI and privileged access

- UI (renderer) and privileged access (main) are separated by the preload bridge.
- No hidden paths from renderer to privileged operations.

### No hidden destructive actions

- No undocumented channels that perform destructive operations.
- No silent merge, silent push, or silent patch application.

### No direct repo mutation from renderer

- Renderer cannot create PRs, merge, push, or modify repository state.
- Repo mutation is a GitHub Backbone concern; future Desktop mutation flows must be explicit and human-mediated.

### No workflow mutation from renderer

- Renderer cannot add, remove, or modify GitHub workflows.
- Workflow changes require human action and PR review.

### No auto-merge

- Governance: no merge without PR, no merge without owner approval, auto-merge disabled.
- Desktop must not introduce auto-merge paths.

### No silent escalation of AI authority

- GPT must never silently gain execution authority.
- AI analyzes. AI suggests. Human decides.
- Any AI-invoked action requires explicit human approval in the flow.

### Future mutation flows: explicit, reviewable, logged, bounded

- All future mutation flows must be: explicit (documented), reviewable (visible to operator), logged (audit trail), bounded (retry limits, rollback possible).

---

## Trust Boundary Diagram (Markdown Bullets)

```
UNTRUSTED ZONE
├── Renderer process (React UI)
│   ├── User input
│   ├── Displayed content
│   └── Queries to preload bridge
│
└── Preload bridge (controlled exposure)
    └── Only allowlisted IPC methods

───────────────────────────────────────── TRUST BOUNDARY ─────────────────────────────────────────

TRUSTED ZONE
├── Main process
│   ├── Application services
│   ├── Read-model readers
│   ├── Database access
│   └── (Future) External API clients
│
├── Repair engine (electron/gates/repair)
│   └── State machine, actors, verdict, handoff
│
└── GitHub Backbone (external)
    └── Workflows, CI, PRs, merge
```

- **Above boundary:** Renderer and preload. Assume renderer content can be influenced by user or injection.
- **Below boundary:** Main process, repair engine, GitHub. These hold privileged access and must validate all inputs from across the boundary.

---

## Threat Awareness

### Renderer compromise

- If renderer is compromised (XSS, injected script), attacker can only invoke allowlisted IPC methods.
- Mitigation: keep allowlist minimal; no generic execute; no shell bridge.

### Preload bridge abuse

- Preload defines what renderer can call. Overly permissive bridge increases risk.
- Mitigation: expose only query-oriented methods; document each; no mutation in DC-1.

### Data exfiltration

- Read-model queries return potentially sensitive data (logs, analysis, traces).
- Mitigation: scope queries; avoid returning secrets or tokens; sanitize for display.

### Privilege escalation

- Renderer must not gain access to Node, `require`, or main process internals.
- Mitigation: `nodeIntegration: false`, `contextIsolation: true`; use `contextBridge` only.

### AI authority escalation

- GPT or Jules must not gain silent execution authority through Desktop.
- Mitigation: no auto-approval; no hidden mutation channels; human in the loop for all mutations.

---

## Unsafe Anti-Patterns to Avoid

| Anti-pattern | Why it is unsafe |
|--------------|------------------|
| `nodeIntegration: true` in renderer | Exposes Node.js to renderer; enables arbitrary code execution |
| Exposing `require` or `process` to renderer | Same as above |
| Generic `execute(cmd)` IPC channel | Allows arbitrary command execution |
| Shell bridge (`spawn`, `exec`) exposed to renderer | Command injection; arbitrary process execution |
| Repo mutation without human approval | Bypasses governance; no PR, no owner approval |
| Auto-merge from Desktop | Violates governance; human authority bypassed |
| Silent AI execution (GPT or Jules) | AI gains execution authority without human decision |
| Unbounded retry from Desktop | Violates retry limit; exhaustion risk |
| Workflow mutation from renderer | Bypasses PR review; workflow integrity at risk |

---

## Summary

- Least privilege, read-only first, explicit boundaries.
- Trust boundary: renderer and preload (untrusted) vs main and repair engine (trusted).
- No mutation from renderer in DC-1; future mutations must be explicit, reviewable, logged, and bounded.
- Human authority remains final. AI analyzes. AI suggests. Human decides.
