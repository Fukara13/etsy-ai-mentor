## Application Layer (Gate B — Application Layer Separation)

This document describes the **Application Layer** introduced as part of **Gate B: Application Layer Separation**.

The goal of this layer is to:

- Keep **IPC handlers in `electron/main.ts` thin**, delegating business/application logic to reusable services.
- Centralize cross-cutting rules such as **gate enforcement**, **session lifecycle**, and **capture analysis**.
- Prepare the system for a more modular, SaaS-ready architecture without changing external behavior.

---

### Location & Structure

- Application layer (services and orchestration) lives under:
  - `src/application/AppServices.ts`
  - `src/application/types.ts`
  - `src/application/services/SessionService.ts`
  - `src/application/services/CaptureService.ts`
  - `src/application/services/StoreService.ts`
  - `src/application/services/SettingsService.ts`
  - `src/application/services/GateService.ts`

- Infrastructure concerns remain in:
  - `electron/db.ts` (SQLite + filesystem persistence)
  - `electron/openai.ts` (LLM integration)
  - `electron/parser.ts` (listing HTML parsing)
  - `electron/gates/*` (gate registry, default state, persistence)

The Electron main process (`electron/main.ts`) **creates and owns** the application services and calls them from IPC handlers.

---

### Core Services

#### 1. SessionService

File: `src/application/services/SessionService.ts`

Responsibilities:

- Create and initialize mentor sessions.
- List sessions for the dashboard.
- Fetch a single session.
- Update session notes.

Key methods:

- `createSession(input): Promise<Session | null>`
- `listSessions(): Promise<Session[]>`
- `getSession(id): Promise<Session | null>`
- `updateSessionNote(id, note): Promise<void>`

Gate Integration:

- Uses `GateService.requireGate('gate10')` in `createSession` to enforce gate10 before allowing mentor-related actions, mirroring previous behavior.

---

#### 2. CaptureService

File: `src/application/services/CaptureService.ts`

Responsibilities:

- Orchestrate **page capture** from BrowserView (HTML + screenshot) and persist into the DB.
- List and fetch captures for a session.
- Run **SEO analysis** via OpenAI and persist AI outputs.
- Serve derived artifacts (parsed listing, capture image) back to the renderer.

Key methods:

- `createCapture(input): Promise<{ captureId; sessionId; url } | null>`
- `listCaptures(sessionId): Promise<Capture[]>`
- `getCapture(id): Promise<Capture | null>`
- `analyzeCapture(id): Promise<{ ok: true; data } | { ok: false; errorMessage }>`
- `getCaptureImage(id): Promise<string | null>`
- `getParsedListing(id): Promise<ParsedListing | null>`

Gate Integration:

- Uses `GateService.requireGate('gate10')` in:
  - `createCapture`
  - `analyzeCapture`

Infrastructure Dependencies:

- Accesses DB operations via injected `db` dependency (no direct imports from `electron/db.ts`).
- Uses injected `io` (filesystem helpers) and `browser` (BrowserWindow/BrowserView access) to perform side effects.
- Uses injected `openai` and `parser` abstractions for SEO analysis and HTML parsing.

---

#### 3. StoreService

File: `src/application/services/StoreService.ts`

Responsibilities:

- Expose store-related operations in a cohesive API:
  - `listStores(): Promise<Store[]>`
  - `updateStoreGoal(storeId, goal): Promise<void>`

Infrastructure:

- Delegates to DB via `listStores` and `updateStoreGoal`.

---

#### 4. SettingsService

File: `src/application/services/SettingsService.ts`

Responsibilities:

- Abstract access to settings stored in the DB:
  - `getSetting(key): Promise<any>`
  - `setSetting(key, value): Promise<void>`

Notes:

- For now, values are treated as strings (to match existing DB behavior).
- Future gates can introduce typed/validated settings.

---

#### 5. GateService

File: `src/application/services/GateService.ts`

Responsibilities:

- Provide a single **application-level abstraction** over gate state.

Key methods:

- `getGateState(): Promise<GateState>`
- `requireGate(gateId): Promise<void>` — throws `GateBlockedError` if gate is not `OPEN` or `PASS`.
- `setGateStatus(gateId, status): Promise<void>` — currently a thin wrapper; persistence wiring can be extended later.

Implementation Details:

- Uses a `getCurrentGateState` function injected from Electron main.
- For now, IPC-level enforcement mirrors existing behavior by reading from `getDefaultGateState()` via this abstraction.

---

### AppServices Factory

File: `src/application/AppServices.ts`

`createAppServices(deps)` is the **composition root** for the application layer.

Responsibilities:

- Wire all services together with their infrastructure dependencies.
- Return a single `services` object with service instances:
  - `session: SessionService`
  - `capture: CaptureService`
  - `store: StoreService`
  - `settings: SettingsService`
  - `gate: GateService`

In `electron/main.ts`, this factory is called after `initDB()` and gate boot checks:

- Dependencies passed from main:
  - `gate`: `getCurrentGateState` (based on `getDefaultGateState()` for IPC-level enforcement).
  - `db`: wrappers around functions from `electron/db.ts`.
  - `io`: wrappers around `fs` and `getAssetsDir()`.
  - `browser`: small helpers to access `BrowserWindow`, `BrowserView`, and to send `capture:failed` events.
  - `openai`: `runSeoAudit`.
  - `parser`: `parseListing`.

---

### IPC Handlers and Application Layer

The following IPC handlers in `electron/main.ts` now delegate to application services instead of containing business logic inline:

- `session:create` → `SessionService.createSession`
- `listSessions` → `SessionService.listSessions`
- `getSession` → `SessionService.getSession`
- `updateSessionNote` → `SessionService.updateSessionNote`
- `capture:create` → `CaptureService.createCapture`
- `listCaptures` → `CaptureService.listCaptures` (plus logging at handler level)
- `getCapture` → `CaptureService.getCapture`
- `capture:analyze` → `CaptureService.analyzeCapture`
- `getCaptureImage` → `CaptureService.getCaptureImage`
- `getParsedListing` → `CaptureService.getParsedListing`
- `listStores` → `StoreService.listStores`
- `updateStoreGoal` → `StoreService.updateStoreGoal`
- `getSetting` → `SettingsService.getSetting`
- `setSetting` → `SettingsService.setSetting`

External IPC behavior (channels, payload shapes, and return values) is preserved; only the **location of the application logic** has changed.

---

### Typed Errors

File: `src/application/types.ts`

Defines shared app-layer error types:

- `AppError` — `{ code, message, details? }`
- `GateBlockedError` — extends `Error`, implements `AppError` with `code: "GATE_BLOCKED"`.
- `NotFoundError` — extends `Error`, implements `AppError` with `code: "NOT_FOUND"`.

These are intended for richer error handling between the application layer and UI in future gates.

---

### Summary

- The **Application Layer** introduces **class-based services** to centralize business logic.
- **Electron IPC handlers** are now thin and delegate to this layer.
- **Gate enforcement** for mentor-related actions goes through `GateService.requireGate('gate10')`, preserving existing semantics while making the rule explicit and testable.
- The architecture remains **SaaS-ready** by separating concerns:
  - UI (React renderer)
  - Application services (this layer)
  - Infrastructure (Electron + DB + OpenAI + parser)

