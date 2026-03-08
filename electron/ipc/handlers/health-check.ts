/**
 * DC-2: Health-check IPC handler.
 * Minimal query-only handler for bridge connectivity verification.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import type { HealthCheckResponse } from '../../shared/desktop-contracts'

export function registerHealthCheckHandler(): void {
  ipcMain.handle(IPC_CHANNELS.HEALTH_PING, (): HealthCheckResponse => {
    return { ok: true, source: 'main' }
  })
}
