/**
 * DC-2/DC-10: Window factory for Desktop Control Center.
 * Secure webPreferences; no unnecessary permissions.
 * Hardened: navigation policy, production DevTools, explicit boundaries.
 */

import { app, BrowserWindow } from 'electron'
import path from 'path'
import { isAllowedAppNavigation } from './navigation-policy'

const WINDOW_TITLE = 'Etsy AI Mentor — Desktop Control Center'
const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 768

/** DevTools: only when unpackaged (development). Never in production build. */
const DEVTOOLS_OPEN = !app.isPackaged

export function createMainWindow(preloadPath: string): BrowserWindow {
  const win = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    title: WINDOW_TITLE,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
    show: false,
  })

  setupNavigationPolicy(win)
  if (DEVTOOLS_OPEN) {
    win.webContents.openDevTools({ mode: 'detach' })
  }
  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}

/** DC-10: Block arbitrary navigation and window opening. */
function setupNavigationPolicy(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedAppNavigation(url, app.isPackaged)) {
      event.preventDefault()
    }
  })
}
