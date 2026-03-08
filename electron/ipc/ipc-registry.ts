/**
 * DC-2: Central IPC handler registration.
 * Extensible pattern for future read-only channels (DC-3+).
 * DC-12: Version and update handlers.
 */

import { registerHealthCheckHandler } from './handlers/health-check'
import { registerBackboneReadHandlers } from './handlers/backbone-read'
import { registerVersionHandler } from './handlers/version-handler'

let registered = false

export function registerIpcHandlers(): void {
  if (registered) return
  registered = true
  registerHealthCheckHandler()
  registerVersionHandler()
  registerBackboneReadHandlers()
}
