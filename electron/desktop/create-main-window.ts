/**
 * DC-2: Window factory for Desktop Control Center.
 * Secure webPreferences; no unnecessary permissions.
 */

import { BrowserWindow } from 'electron'
import path from 'path'

const WINDOW_TITLE = 'Etsy AI Mentor — Desktop Control Center'
const DEFAULT_WIDTH = 1024
const DEFAULT_HEIGHT = 768

/** DevTools only in development; disable in production. */
const DEVTOOLS_OPEN = !process.env.NODE_ENV || process.env.NODE_ENV === 'development'

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
    },
    show: false,
  })

  if (DEVTOOLS_OPEN) {
    win.webContents.openDevTools({ mode: 'detach' })
  }

  win.once('ready-to-show', () => {
    win.show()
  })

  return win
}
