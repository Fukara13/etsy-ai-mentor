/**
 * DC-12: Version IPC handler.
 * Reads version from package.json via app.getVersion().
 */

import { app, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'

export function registerVersionHandler(): void {
  ipcMain.handle(IPC_CHANNELS.GET_APP_VERSION, (): string => {
    return app.getVersion()
  })
}
