# DC-1 — Process and IPC Boundary

**Gate:** DC-1 — Desktop Architecture Freeze  
**Scope:** Electron process model and IPC bridge design.

---

## Electron Process Model

### Main Process

- Hosts the Desktop Control Center application.
- Owns window lifecycle, system tray, native menus.
- Registers IPC handlers and exposes them via the preload bridge.
- Holds application services (SessionService, CaptureService, GateService) and read-model readers.
- Has access to Node.js, file system, and privileged APIs. Renderer must never receive direct privileged access.

### Renderer Process

- Runs the React UI (renderer-app).
- Sandboxed; must not receive `require`, `process`, or direct Node/Electron privileged APIs.
- Communicates with main process **only** through the preload bridge.
- Renders views; displays read models; emits user intent (queries, navigation). Does not perform privileged operations.

### Preload / IPC Bridge

- Injected script running in renderer context with controlled exposure to main.
- Exposes a **bounded, intentional API** to the renderer via `contextBridge`.
- Translates renderer calls into IPC invocations; receives responses and returns them.
- Acts as the sole boundary between untrusted renderer and privileged main process.

---

## Why Renderer Must Not Receive Direct Privileged Access

- The renderer loads remote or locally-hosted content and runs user-facing UI. It is the highest attack surface.
- Granting `require`, `process`, or Node APIs to the renderer would allow arbitrary code execution, file system access, and shell invocation.
- Separation ensures: UI rendering and user interaction stay in renderer; privileged system access stays in main.

---

## Why Bridge Must Expose Only Bounded, Intentional Capabilities

- The preload bridge defines the **allowlist** of what the renderer can do. No capability exists by default.
- Each exposed method should map to a specific, documented IPC channel with a narrow contract.
- Future dangerous operations (repo mutation, workflow edit, patch execution) must never be exposed by default. They require explicit design, governance, and a future gate.

---

## Read-Only First IPC Design Principle

- **Default:** IPC channels are query-only. They return data; they do not mutate state.
- **Mutation:** Any future mutation channel requires explicit definition, governance review, and human authority in the flow.
- **DC-1:** No repo mutation channel, no workflow mutation channel, no patch execution channel.

---

## Separation: UI Rendering vs Privileged System Access

- **UI rendering** = layout, styling, user interaction, display of data. Lives in renderer.
- **Privileged system access** = database, file system, GitHub API, repair engine invocation, gate enforcement. Lives in main.
- The bridge is the only path between them. Data flows: main → (serialized) → renderer. User intent flows: renderer → (IPC) → main.

---

## Initial IPC Philosophy

### Query-only channels preferred

- `read:event-timeline`, `read:state-machine`, `read:gpt-analysis`, `read:repair-strategy`, `read:telemetry` — return projections.
- No side effects. No state changes.

### Explicit allowlist mindset

- Only channels that are explicitly registered and exposed via the bridge exist.
- No catch-all or generic channel.

### No generic execute channel

- No `execute` or `run` channel that accepts arbitrary commands.
- Prevents accidental or malicious execution of unintended operations.

### No arbitrary shell bridge

- No `spawn`, `exec`, or shell invocation exposed to the renderer.
- Prevents command injection and arbitrary process execution.

### No repo mutation channel in DC-1

- No channel for creating PRs, merging, pushing, or modifying repo state.
- Repo mutation remains a GitHub Backbone concern; future gates may introduce bounded, human-mediated flows.

---

## Process Boundary Diagram (Markdown)

```
┌─────────────────────────────────────────────────────────────────┐
│ MAIN PROCESS                                                     │
│ ┌─────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│ │ desktop-    │  │ application-     │  │ read-model readers   │ │
│ │ shell       │  │ facade           │  │ (event, state, gpt,  │ │
│ │             │  │                  │  │  repair, telemetry)  │ │
│ └──────┬──────┘  └────────┬─────────┘  └──────────┬───────────┘ │
│        │                  │                       │              │
│        └──────────────────┼───────────────────────┘              │
│                           │ IPC handlers                         │
│                           ▼                                      │
│                    ┌─────────────┐                               │
│                    │ Preload     │ ◄── Bounded, allowlisted API   │
│                    │ Bridge      │                               │
│                    └──────┬──────┘                               │
└───────────────────────────┼──────────────────────────────────────┘
                            │ contextBridge
                            │ (serialized data only)
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ RENDERER PROCESS                                                   │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ renderer-app (React)                                           │ │
│ │ - Display read models                                          │ │
│ │ - Emit queries                                                 │ │
│ │ - No privileged access                                         │ │
│ └───────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────┘
```
