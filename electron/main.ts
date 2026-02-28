import { app, BrowserWindow, BrowserView, ipcMain, Menu, type WebContents, type MenuItemConstructorOptions } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDB, getSession, insertSession, insertCapture, getAssetsDir, getCapture, insertAiOutput, getAiOutputByCapture, listSessions, listCapturesBySession, listStores, updateStoreGoal, updateStoreNiche, insertStore, getStore, updateStoreFromDraft, runInTransaction, getSetting, setSetting, updateSessionNote, setSessionCompetitorUrl, getSessionCompetitorUrl, insertCompetitorCapture, updateCompetitorSignals, getLatestCompetitorCapture, insertListingSnapshot, insertProfileDraft, getProfileDraft, updateProfileDraftProposed, updateProfileDraftStatus, listProfileDraftsByStore, insertEvidence, listEvidenceByDraft, listEvidenceByStoreAndField, listTrends, insertTrend, updateTrendStatus, getTrend, getMentorRuntime, upsertMentorRuntime, resetMentorRuntime, getMentorProfile, upsertMentorProfile, resetMentorProfile } from './db'
import { runSeoAudit, runSeoAuditV2 } from './openai'
import { parseListing } from './parser'
import { getDefaultGateState } from './gates/store'
import { loadGateState } from './gates/persistence'
import { createAppServices, type AppServices } from '../src/application/AppServices'
import { GateBlockedError } from '../src/application/types'
import { registerGateHandlers, captureListingSnapshotFromWebContents } from './ipc/gateHandlers'
import { registerSessionHandlers } from './ipc/sessionHandlers'
import { registerDataHandlers } from './ipc/dataHandlers'
import { registerStoreHandlers } from './ipc/storeHandlers'
import { registerDraftHandlers } from './ipc/draftHandlers'
import { registerBrowserHandlers } from './ipc/browserHandlers'
import { registerCaptureHandlers } from './ipc/captureHandlers'
import { registerTrendsHandlers } from './ipc/trendsHandlers'
import { registerMentorHandlers } from './ipc/mentorHandlers'
import { registerMentorFlowHandlers } from './ipc/mentorFlowHandlers'
import { randomUUID } from 'crypto'

let mainWindow: BrowserWindow | null = null
let browserView: BrowserView | null = null
let gate7StoreId: number | null = null
let gate7Active = false
let services: AppServices | null = null
/** Gate state loaded once at boot; used by IPC handlers for gate10 enforcement. */
let bootGateState: ReturnType<typeof loadGateState> | null = null
/** Last Etsy target URL for OAuth return; when storagerelay is seen we redirect here. */
let lastTargetUrl: string | null = null
function setLastTargetUrl(url: string | null) {
  lastTargetUrl = url
}

// --- OAuth popup helpers (no token leakage in logs) ---
const SENSITIVE_QUERY_PARAMS = new Set([
  'part', 'as', 'rapt', 'TL', 'sidt', 'continue', 'oauth', 'dsh', 'client_id', 'client_secret',
  'state', 'code', 'scope', 'redirect_uri', 'access_token', 'refresh_token', 'id_token', 'token',
  'response_type', 'nonce', 'prompt', 'login_hint',
])

function sanitizeUrl(url: string): string {
  try {
    const u = new URL(url)
    const keysToMask = [...u.searchParams.keys()].filter((k) => SENSITIVE_QUERY_PARAMS.has(k.toLowerCase()))
    keysToMask.forEach((k) => u.searchParams.set(k, '***'))
    return u.toString()
  } catch {
    return url.length > 80 ? url.slice(0, 80) + '...' : url
  }
}

function isGoogleOAuth(url: string): boolean {
  if (typeof url !== 'string') return false
  const lower = url.toLowerCase()
  return (
    lower.includes('accounts.google.com') &&
    (lower.includes('o/oauth2') || lower.includes('/signin/oauth') || lower.includes('gsiwebsdk'))
  )
}

function isStorageRelayUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith('storagerelay:')
}

function isEtsyReturn(url: string): boolean {
  if (typeof url !== 'string') return false
  return url.startsWith('https://www.etsy.com/') && url.includes('?id=auth')
}

function getBrowserViewBounds() {
  const sidebarWidth = 380
  const win = mainWindow
  const [w, h] = win ? win.getSize() : [1400, 900]
  return {
    x: 0,
    y: 56,
    width: w - sidebarWidth,
    height: h - 56,
  }
}

function createBrowserView() {
  if (!mainWindow) return
  browserView = new BrowserView({
    webPreferences: {
      partition: 'persist:etsy',
      javascript: true,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  })
  mainWindow.setBrowserView(browserView)
  browserView.setBounds(getBrowserViewBounds())
  browserView.setAutoResize({ width: true, height: true })

  const wc = browserView.webContents

  const emitUrlChanged = (u: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:urlChanged', u)
    }
  }

  const isStorageRelay = (u: string) =>
    typeof u === 'string' && (u.startsWith('storagerelay:') || u.includes('storagerelay:'))
  const getOAuthReturnTarget = () => lastTargetUrl ?? 'https://www.etsy.com/'

  const bounceFromStorageRelay = (u: string, via: string): boolean => {
    if (!isStorageRelay(u)) return false
    const target = getOAuthReturnTarget()
    console.log(`[oauth] storagerelay detected via=${via} -> ${target}`)
    wc.loadURL(target).catch((e) => console.error('[oauth] loadURL failed', e))
    return true
  }

  wc.on('will-navigate', (event: Electron.Event, u: string) => {
    if (bounceFromStorageRelay(u, 'will-navigate')) event.preventDefault()
    else emitUrlChanged(u)
  })
  wc.on('will-redirect', (event: Electron.Event, u: string) => {
    if (bounceFromStorageRelay(u, 'will-redirect')) event.preventDefault()
    else console.log('[wc] will-redirect', u)
  })
  wc.on('did-navigate', (_event: Electron.Event, u: string) => {
    if (bounceFromStorageRelay(u, 'did-navigate')) return
    console.log('[wc] did-navigate', u)
    emitUrlChanged(u)
  })
  wc.on('did-frame-navigate', (_event: Electron.Event, u: string, _httpCode: number, _httpStatusText: string, isMainFrame: boolean) => {
    if (isStorageRelay(u)) bounceFromStorageRelay(u, `did-frame-navigate main=${isMainFrame}`)
  })
  wc.on('did-start-navigation', (_event: Electron.Event, u: string, isInPlace: boolean, isMainFrame: boolean) => {
    if (isStorageRelay(u)) bounceFromStorageRelay(u, `did-start-navigation inPlace=${isInPlace} main=${isMainFrame}`)
  })
  wc.on('did-navigate-in-page', (_event: Electron.Event, u: string) => {
    console.log('[wc] did-navigate-in-page', u)
    emitUrlChanged(u)
  })
  wc.on('did-fail-load', (_event: Electron.Event, code: number, desc: string, url: string) => {
    if (code === -3 && (url || '').startsWith('about:srcdoc')) return // expected in many embedded pages
    console.log('[wc] did-fail-load', code, desc, url)
  })

  // Let Electron create the OAuth popup (action: "allow") so window.opener is preserved and
  // the storagerelay/postMessage handshake works. Manually creating a BrowserWindow (action: "deny")
  // breaks the opener and causes the Etsy login modal spinner to hang after consent.
  wc.on('did-create-window', (popupWin, _details) => {
    const popupWc = popupWin.webContents
    let finished = false
    const onOAuthComplete = () => {
      if (finished) return
      finished = true
      setTimeout(() => {
        try {
          if (popupWin && !popupWin.isDestroyed()) popupWin.close()
        } catch (_e) { /* already closed */ }
      }, 300)
      setTimeout(() => {
        wc.reload()
      }, 600)
    }
    const isOAuthComplete = (u: string) => isStorageRelayUrl(u) || isEtsyReturn(u)
    popupWc.on('will-redirect', (event: Electron.Event, url: string) => {
      if (isOAuthComplete(url)) {
        console.log('[oauth] popup completion (redirect)', sanitizeUrl(url))
        event.preventDefault()
        onOAuthComplete()
      }
    })
    popupWc.on('did-navigate', (_event: Electron.Event, url: string) => {
      if (isOAuthComplete(url)) {
        console.log('[oauth] popup completion (did-navigate)', sanitizeUrl(url))
        onOAuthComplete()
      }
    })
    popupWc.on('did-navigate-in-page', (_event: Electron.Event, url: string) => {
      if (isOAuthComplete(url)) {
        console.log('[oauth] popup completion (in-page)', sanitizeUrl(url))
        onOAuthComplete()
      }
    })
  })

  wc.setWindowOpenHandler(({ url }) => {
    if (isGoogleOAuth(url)) {
      console.log('[oauth] window.open (Google OAuth) allow', sanitizeUrl(url))
      if (!mainWindow || mainWindow.isDestroyed()) return { action: 'deny' }
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: mainWindow,
          modal: true,
          width: 520,
          height: 720,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
        },
      }
    }
    console.log('[oauth] window.open (non-OAuth)', sanitizeUrl(url))
    wc.loadURL(url).catch((e) => console.error('[wc] loadURL failed', e))
    return { action: 'deny' }
  })

  const contextMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    { role: 'copy' },
    { role: 'cut' },
    { role: 'paste' },
    { role: 'selectAll' },
  ]
  wc.on('context-menu', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const menu = Menu.buildFromTemplate(contextMenuTemplate)
      menu.popup({ window: mainWindow })
    }
  })

  wc.on('console-message', (_event, _level, message, _line, sourceId) => {
    const level = _level as number
    if (level >= 4) console.error('[browserView]', message, sourceId ? `(${sourceId})` : '')
  })
  wc.on('render-process-gone', (_event, details) => {
    console.error('[browserView] render-process-gone', details.reason, details.exitCode ?? '')
  })

  // Gate 7: when user navigates to a listing page, capture neutral facts and notify renderer
  wc.on('did-finish-load', async () => {
    if (!gate7Active || gate7StoreId == null || !browserView || !mainWindow?.webContents || mainWindow.isDestroyed()) return
    const wc = browserView.webContents
    const url = wc.getURL()
    if (!url || !url.includes('/listing/')) return
    try {
      const snapshot = await captureListingSnapshotFromWebContents(wc, gate7StoreId)
      if (snapshot) {
        console.log('[nav] main sending gate7:listingCaptured (no view change)')
        mainWindow.webContents.send('gate7:listingCaptured', snapshot)
        gate7StoreId = null
      }
    } catch (e) {
      console.warn('[gate7] auto-capture failed', e)
    }
  })
}

// ListingSnapshot type and captureListingSnapshotFromWebContents moved to ipc/gateHandlers.ts

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.resolve(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      devTools: !app.isPackaged,
    },
  })

  // In development, always load Vite dev server; in production, load built index.html
  const devUrl = 'http://localhost:5173'
  if (!app.isPackaged) {
    mainWindow.loadURL(devUrl)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Pipe renderer console errors to main process terminal
  mainWindow.webContents.on('console-message', (_event, _level, message, _line, sourceId) => {
    const level = _level as number
    if (level >= 4) {
      console.error('[renderer]', message, sourceId ? `(${sourceId})` : '')
    }
  })

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (errorCode === -3 && (validatedURL || '').startsWith('about:srcdoc')) return // expected in many embedded pages
    console.error('[main] did-fail-load', isMainFrame ? 'main' : 'sub', errorCode, errorDescription, validatedURL)
    if (!app.isPackaged && isMainFrame && validatedURL && validatedURL.includes('localhost:5173')) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        const html = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><title>Etsy Mentor</title></head>
          <body style="margin:0;min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:#1a1a1a;color:#e0e0e0;font-family:system-ui,sans-serif;">
            <p style="margin:0;text-align:center;">Renderer çalışmıyor. Terminal 1'de <code>npm run dev:renderer</code> çalıştır.</p>
            <button onclick="window.location.href='http://localhost:5173'" style="background:#0d7377;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:1rem;">Yenile</button>
          </body>
        </html>
      `
        mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
      }
    }
  })

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    console.error('[main] render-process-gone', details.reason, details.exitCode ?? '')
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    browserView = null
  })

  // DevTools: open only for main window and only when it has loaded the app URL (not data: fallback)
  if (!app.isPackaged) {
    mainWindow.webContents.once('did-finish-load', () => {
      const url = mainWindow?.webContents.getURL() ?? ''
      if (url.startsWith('http://localhost:') || url.startsWith('https://localhost:')) {
        console.log('[devtools] opening for mainWindow id=', mainWindow?.id, 'url=', url.slice(0, 60))
        mainWindow?.webContents.openDevTools({ mode: 'detach' })
      }
    })
  }

  const contextMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    { role: 'copy' },
    { role: 'cut' },
    { role: 'paste' },
    { role: 'selectAll' },
  ]
  mainWindow.webContents.on('context-menu', (_event, _params) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const menu = Menu.buildFromTemplate(contextMenuTemplate)
      menu.popup({ window: mainWindow })
    }
  })

  // BrowserView only when in session view (renderer sends app:view)
}

function hideBrowserView() {
  if (mainWindow && browserView) {
    mainWindow.setBrowserView(null)
    browserView = null
  }
}

let ipcHandlersRegistered = false

function registerIpcHandlers() {
  if (ipcHandlersRegistered) return
  ipcHandlersRegistered = true

  if (!mainWindow) return

  // Shared state for Gate 7
  const gateState = {
    get gate7Active() { return gate7Active },
    set gate7Active(v) { gate7Active = v },
    get gate7StoreId() { return gate7StoreId },
    set gate7StoreId(v) { gate7StoreId = v }
  }

  const browserViewRef = {
    get current() { return browserView }
  }

  registerGateHandlers(mainWindow, browserViewRef, gateState, hideBrowserView, services)
  registerSessionHandlers(mainWindow, browserViewRef, services, bootGateState, gateState, createBrowserView, hideBrowserView, setLastTargetUrl)
  registerDataHandlers(services)
  registerStoreHandlers(services)
  registerDraftHandlers(services)
  registerBrowserHandlers(mainWindow, browserViewRef, createBrowserView, (storeId) => getStore(storeId)?.url ?? null, setLastTargetUrl)
  registerCaptureHandlers(browserViewRef, services)
  const trendsDb = {
    listTrends: (storeId: number | null, limit: number) => listTrends(storeId, limit),
    insertTrend: (row: Parameters<typeof insertTrend>[0]) => insertTrend(row),
    updateTrendStatus,
    getTrend: (id: string) => getTrend(id) ?? undefined,
  }
  registerTrendsHandlers(services, trendsDb)
  registerMentorHandlers(mainWindow, services)
  registerMentorFlowHandlers(
    services,
    mainWindow,
    browserViewRef,
    createBrowserView,
    (storeId) => getStore(storeId)?.url ?? null,
    setLastTargetUrl,
    { getMentorRuntime, upsertMentorRuntime },
    trendsDb
  )
}

app.whenReady().then(async () => {
  await initDB()
  const gateState = loadGateState()
  bootGateState = gateState
  if (gateState.gate9 !== 'PASS') {
    console.error('[gates] gate9 is not PASS. Application will exit.')
    app.quit()
    return
  }

  // Initialize application services (application layer)
  services = createAppServices({
    gate: {
      getCurrentGateState: () => {
        // Mirror existing runtime behavior for IPC-level gate enforcement
        const current = getDefaultGateState()
        return current as any
      },
    },
    db: {
      getSession: (id: string) => getSession(id) ?? null,
      insertSession,
      listSessions,
      updateSessionNote,
      setSessionCompetitorUrl,
      listStores,
      getStore: (id: number) => getStore(id) ?? null,
      updateStoreGoal,
      updateStoreNiche,
      insertStore,
      updateStoreFromDraft,
      insertProfileDraft,
      getProfileDraft,
      updateProfileDraftProposed,
      updateProfileDraftStatus,
      listProfileDraftsByStore,
      insertEvidence,
      listEvidenceByDraft,
      listEvidenceByStoreAndField,
      runInTransaction,
      getMentorRuntime,
      upsertMentorRuntime,
      resetMentorRuntime,
      getMentorProfile,
      upsertMentorProfile,
      resetMentorProfile,
      listTrends: (storeId: number | null, limit: number) => listTrends(storeId, limit),
      insertCapture,
      listCapturesBySession,
      getCapture: (id: string) => getCapture(id) ?? null,
      insertAiOutput,
      getAiOutputByCapture: (captureId: string, type: string) => {
        const row = getAiOutputByCapture(captureId, type)
        return row ?? null
      },
      getSetting,
      setSetting,
    },
    generateId: () => randomUUID(),
    io: {
      getAssetsDir,
      readFile: (p: string, encoding: BufferEncoding) => fs.readFileSync(p, encoding),
      readFileBinary: (p: string) => {
        try {
          return fs.readFileSync(p)
        } catch {
          return null
        }
      },
      writeFile: (p: string, data: string | Uint8Array) => {
        fs.writeFileSync(p, data)
      },
    },
    browser: {
      getMainWindow: () => mainWindow,
      getBrowserView: () => browserView,
      sendCaptureFailed: (message: string, err?: unknown) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('capture:failed', { errorMessage: message })
        }
        console.error('[capture]', message, err !== undefined ? err : '')
      },
    },
    openai: {
      runSeoAudit,
      runSeoAuditV2,
    },
    parser: {
      parseListing,
    },
  })

  createWindow()

  console.log('[gates] boot state:', gateState)

  const editMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    ...(!app.isPackaged
      ? [{ label: 'View', submenu: [{ role: 'toggleDevTools' as const }] }]
      : []),
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(editMenuTemplate))

  registerIpcHandlers()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
