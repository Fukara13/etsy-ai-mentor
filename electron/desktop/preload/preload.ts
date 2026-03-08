/**
 * DC-2: Preload bridge for Desktop Control Center.
 * Self-contained; exposes only bounded, allowlisted desktopApi via contextBridge.
 * No raw ipcRenderer exposed.
 */

import { contextBridge, ipcRenderer } from 'electron'

const HEALTH_PING_CHANNEL = 'desktop:health:ping'

const desktopApi = {
  system: {
    ping: (): Promise<{ ok: true; source: 'main' }> =>
      ipcRenderer.invoke(HEALTH_PING_CHANNEL),
  },
}

contextBridge.exposeInMainWorld('desktopApi', desktopApi)
