/**
 * DC-2: Desktop Control Center — main process entry.
 * Secure shell only; no GitHub, CI, repair engine, GPT, or external systems.
 * DC-12: Update service (packaged only).
 */

import { app } from 'electron'
import path from 'path'
import { createMainWindow } from './create-main-window'
import { registerIpcHandlers } from '../ipc/ipc-registry'
import { createUpdateService } from './update-service'

let mainWindow: Electron.BrowserWindow | null = null

const DEV_URL = 'http://localhost:5173'
const DESKTOP_HTML = '/index-desktop.html'

function getPreloadPath(): string {
  return path.join(__dirname, 'preload', 'preload.js')
}

function loadRenderer(win: Electron.BrowserWindow): void {
  if (!app.isPackaged) {
    win.loadURL(DEV_URL + DESKTOP_HTML)
  } else {
    win.loadFile(path.join(__dirname, '..', '..', '..', 'dist', 'index-desktop.html'))
  }
}

function createWindow(): void {
  const preloadPath = getPreloadPath()
  mainWindow = createMainWindow(preloadPath)
  loadRenderer(mainWindow)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
  if (app.isPackaged) {
    createUpdateService(() => mainWindow)
  }

  app.on('activate', () => {
    if (mainWindow === null) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
