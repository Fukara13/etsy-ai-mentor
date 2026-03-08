/**
 * DC-2: Bounded API surface exposed to renderer.
 * Allowlist only; no raw ipcRenderer; no generic execute.
 */

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import type { HealthCheckResponse } from '../../shared/desktop-contracts'

const desktopApi = {
  system: {
    ping: (): Promise<HealthCheckResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PING),
  },
}

export function exposeDesktopApi(): void {
  contextBridge.exposeInMainWorld('desktopApi', desktopApi)
}
