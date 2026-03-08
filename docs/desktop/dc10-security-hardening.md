# DC-10 — Desktop Security Hardening

**Gate:** DC-10 — Desktop Security Hardening  
**Scope:** Electron security posture, trust boundaries, IPC allow-list, development vs production.

---

## Security Assumptions

- **Renderer is untrusted.** Assume renderer content can be influenced by user input or injection.
- **Preload is the only bridge.** No raw `ipcRenderer`, `require`, or `process` exposed to renderer.
- **Desktop is read-only.** No mutation authority from UI. No repo write, workflow trigger, or patch execution.
- **Human authority is final.** AI analyzes and suggests. Human decides. No auto-approve, auto-merge.

---

## Enforced Boundaries

### webPreferences

| Setting | Value | Purpose |
|---------|-------|---------|
| `contextIsolation` | `true` | Isolate preload from renderer; no shared context |
| `nodeIntegration` | `false` | No Node.js in renderer |
| `sandbox` | `true` | Sandbox renderer process |
| `webSecurity` | `true` | Enforce same-origin, HTTPS, etc. |
| `allowRunningInsecureContent` | `false` | Block mixed content |

### Navigation Policy (DC-10)

- **`setWindowOpenHandler`:** Always returns `{ action: 'deny' }`. No `window.open` or target=_blank escape.
- **`will-navigate`:** Allow only:
  - **Development (unpackaged):** `http://localhost:5173`
  - **Production (packaged):** `file://` (bundled HTML)

### Preload Exposure

- **Single exposure:** `contextBridge.exposeInMainWorld('desktopApi', ...)`
- **No generic invoke:** Each method maps to a fixed IPC channel. No `invoke(channel, payload)`.
- **Read-only API:** `desktopApi.system.ping` + `desktopApi.read.*` (getRepairRunView, getStateMachineView, etc.)
- **No shell/exec/spawn:** No process execution, filesystem, or arbitrary IPC.

### IPC Allow-List

All IPC channels are explicit and allow-listed. See `electron/desktop/allowed-ipc-channels.ts`.

- `desktop:health:ping`
- `desktop:read:getRepairRunView`
- `desktop:read:getStateMachineView`
- `desktop:read:getFailureTimelineView`
- `desktop:read:getGPTAnalysisView`
- `desktop:read:getRepairStrategyView`
- `desktop:read:getTelemetryView`
- `desktop:read:getDecisionView`

No write, mutate, execute, trigger, merge, or patch channels.

---

## Intentionally Not Allowed

| Capability | Status |
|------------|--------|
| Repository mutation | Not exposed |
| Workflow trigger | Not exposed |
| Shell / process execution | Not exposed |
| File system write | Not exposed |
| Arbitrary IPC invoke | Not exposed |
| DevTools in production | Disabled |
| Arbitrary navigation | Blocked |

---

## Development vs Production Posture

| Aspect | Development (unpackaged) | Production (packaged) |
|--------|--------------------------|------------------------|
| DevTools | Opened (detached) | Not opened |
| Load URL | `http://localhost:5173/index-desktop.html` | `file://.../dist/index-desktop.html` |
| Navigation | `http://localhost:5173` allowed | `file://` only |
| Hot reload | Vite dev server | N/A (static build) |

---

## Deferred / Out of Scope (DC-10)

- Decision persistence
- Workflow-triggering actions
- Repo write flows
- GitHub mutation paths
- Auto-approve / auto-merge
- Autonomous patching
- Embedded IDE behavior
- CSP headers (future consideration)
- Certificate pinning (future consideration)

---

## References

- DC-1 Security Boundary: `docs/desktop/dc1-security-boundary.md`
- DC-1 Process and IPC Boundary: `docs/desktop/dc1-process-and-ipc-boundary.md`
- IPC channels: `electron/ipc/ipc-channels.ts`
- Preload: `electron/desktop/preload/preload.ts`
- Window factory: `electron/desktop/create-main-window.ts`
