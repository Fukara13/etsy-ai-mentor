/**
 * DC-12: Update service — main process.
 * Responsibilities: checkForUpdates, notify renderer when update available/downloaded.
 * Human must confirm installation; no auto-install.
 * Update channels: stable, beta, dev (infrastructure only; no UI selection yet).
 */

import { ipcMain, type BrowserWindow } from 'electron'
import { autoUpdater } from 'electron-updater'
import { IPC_CHANNELS } from '../ipc/ipc-channels'

export type UpdateChannel = 'stable' | 'beta' | 'dev'

const DEFAULT_CHANNEL: UpdateChannel = 'stable'

function getUpdateChannel(): UpdateChannel {
  const ch = process.env.UPDATE_CHANNEL
  if (ch === 'stable' || ch === 'beta' || ch === 'dev') return ch
  return DEFAULT_CHANNEL
}

export function createUpdateService(getMainWindow: () => BrowserWindow | null): void {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.channel = getUpdateChannel()

  autoUpdater.on('update-available', () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.UPDATE_AVAILABLE)
    }
  })

  autoUpdater.on('update-downloaded', () => {
    const win = getMainWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(IPC_CHANNELS.UPDATE_DOWNLOADED)
    }
  })

  ipcMain.handle(IPC_CHANNELS.CHECK_FOR_UPDATES, async (): Promise<void> => {
    await autoUpdater.checkForUpdates()
  })

  ipcMain.handle(IPC_CHANNELS.INSTALL_UPDATE, (): void => {
    autoUpdater.quitAndInstall()
  })
}
