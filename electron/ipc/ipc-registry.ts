/**
 * DC-2: Central IPC handler registration.
 * Extensible pattern for future read-only channels (DC-3+).
 */

import { registerHealthCheckHandler } from './handlers/health-check'
import { registerBackboneReadHandlers } from './handlers/backbone-read'

let registered = false

export function registerIpcHandlers(): void {
  if (registered) return
  registered = true
  registerHealthCheckHandler()
  registerBackboneReadHandlers()
}
