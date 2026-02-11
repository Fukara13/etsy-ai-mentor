import { app, BrowserWindow, BrowserView, ipcMain, Menu, type WebContents } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDB, getSession, insertSession, insertCapture, getAssetsDir, getCapture, insertAiOutput, getAiOutputByCapture, listSessions, listCapturesBySession, listStores, updateStoreGoal, getSetting, setSetting, updateSessionNote, setSessionCompetitorUrl, getSessionCompetitorUrl, insertCompetitorCapture, updateCompetitorSignals, getLatestCompetitorCapture, insertListingSnapshot } from './db'
import { runSeoAudit } from './openai'
import { parseListing } from './parser'
import { getDefaultGateState } from './gates/store'

let mainWindow: BrowserWindow | null = null
let browserView: BrowserView | null = null
let gate7StoreId: number | null = null
let gate7Active = false

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
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  })
  mainWindow.setBrowserView(browserView)
  browserView.setBounds(getBrowserViewBounds())
  browserView.setAutoResize({ width: true, height: true })

  const emitUrlChanged = (u: string) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser:urlChanged', u)
    }
  }

  browserView.webContents.on('will-navigate', (_event, u: string) => emitUrlChanged(u))
  browserView.webContents.on('did-navigate', (_event, u: string) => emitUrlChanged(u))
  browserView.webContents.on('did-navigate-in-page', (_event, u: string) => emitUrlChanged(u))

  const contextMenuTemplate: Electron.MenuItemConstructorOptions[] = [
    { role: 'copy' },
    { role: 'cut' },
    { role: 'paste' },
    { role: 'selectAll' },
  ]
  browserView.webContents.on('context-menu', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const menu = Menu.buildFromTemplate(contextMenuTemplate)
      menu.popup({ window: mainWindow })
    }
  })

  browserView.webContents.setWindowOpenHandler((details) => {
    const requestedUrl = details.url
    if (requestedUrl && browserView) {
      browserView.webContents.loadURL(requestedUrl)
    }
    return { action: 'deny' }
  })

  browserView.webContents.on('console-message', (_event, _level, message, _line, sourceId) => {
    const level = _level as number
    if (level >= 4) console.error('[browserView]', message, sourceId ? `(${sourceId})` : '')
  })
  browserView.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    console.error('[browserView] did-fail-load', isMainFrame ? 'main' : 'sub', errorCode, errorDescription, validatedURL)
  })
  browserView.webContents.on('render-process-gone', (_event, details) => {
    console.error('[browserView] render-process-gone', details.reason, details.exitCode ?? '')
  })

  // Gate 7: when user navigates to a listing page, capture neutral facts and notify renderer
  browserView.webContents.on('did-finish-load', async () => {
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

type ListingSnapshot = {
  id: string
  listing_url: string
  title_text: string | null
  description_text: string | null
  tags: string[]
  image_count: number | null
  created_at: number
}

async function captureListingSnapshotFromWebContents(wc: WebContents, storeId: number): Promise<ListingSnapshot | null> {
  const url = wc.getURL()
  if (!url || !url.includes('/listing/')) return null
  const html = await wc.executeJavaScript('document.documentElement.outerHTML') as string
  const parsed = parseListing(html, url)
  let imageCount: number | null = null
  try {
    const count = await wc.executeJavaScript(`
      (function() {
        var nodes = document.querySelectorAll('[data-carousel-pane="image"] img, [data-listing-image], ul[role="list"] li img');
        return nodes ? nodes.length : 0;
      })();
    `) as number
    imageCount = typeof count === 'number' && count >= 0 ? count : null
  } catch {
    // non-fatal
  }
  const id = 'snap_' + Date.now()
  const tagsJson = JSON.stringify(parsed.tags ?? [])
  const createdAt = Math.floor(Date.now() / 1000)
  insertListingSnapshot(
    id,
    storeId,
    'seo_audit',
    url,
    parsed.title ?? null,
    parsed.description ?? null,
    tagsJson,
    imageCount
  )
  return {
    id,
    listing_url: url,
    title_text: parsed.title ?? null,
    description_text: parsed.description ?? null,
    tags: parsed.tags ?? [],
    image_count: imageCount,
    created_at: createdAt,
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,
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

  function sendCaptureFailed(errorMessage: string, err?: unknown) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('capture:failed', { errorMessage })
    }
    console.error('[capture]', errorMessage, err !== undefined ? err : '')
  }

  ipcMain.on('app:view', (_event, view: string) => {
    console.log('[nav] main app:view received', view, 'gate7Active=', gate7Active)
    if (view === 'session' || view === 'gate7') {
      if (!browserView && mainWindow) createBrowserView()
      if (browserView && view === 'gate7') {
        gate7Active = true
        browserView.webContents.loadURL('https://www.etsy.com')
      }
    } else {
      // Do NOT destroy BrowserView when gate7 is active — only gate7:closeBrowser may do that
      if (gate7Active) return
      gate7Active = false
      gate7StoreId = null
      hideBrowserView()
      mainWindow?.focus()
      mainWindow?.webContents?.focus()
    }
  })

  // Gate 7: only way to close BrowserView after listing recognition; called when user clicks "Geri Dön"
  ipcMain.on('gate7:closeBrowser', () => {
    console.log('[nav] main gate7:closeBrowser received')
    gate7Active = false
    gate7StoreId = null
    hideBrowserView()
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus()
      mainWindow.webContents.focus()
    }
  })

  ipcMain.handle('gate7:setContext', (_event, payload: { storeId?: number } | undefined) => {
    gate7StoreId = payload?.storeId ?? null
  })

  ipcMain.on('browser:setBounds', (_event, rect: { x: number; y: number; width: number; height: number }) => {
    if (!browserView) return
    const { x, y, width, height } = rect
    browserView.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) })
    browserView.setAutoResize({ width: true, height: true })
  })

  ipcMain.handle('nav:go', (_event, url: string) => {
    if (!browserView) return
    let u = url.trim()
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      u = 'https://' + u
    }
    browserView!.webContents.loadURL(u)
  })

  ipcMain.handle('getCurrentUrl', () => {
    if (!browserView) return ''
    return browserView.webContents.getURL()
  })

  ipcMain.handle('session:create', (_event, id: string, note?: string) => {
    const gateState = getDefaultGateState()
    if (gateState.gate10 !== 'OPEN' && gateState.gate10 !== 'PASS') {
      console.error('[gates] gate10 not OPEN. Mentor action blocked.')
      return null
    }
    if (!getSession(id)) insertSession(id, note)
    setSessionCompetitorUrl(id, null)
  })

  ipcMain.handle('competitor:set', (_event, payload: { sessionId: string; url: string }) => {
    const { sessionId, url } = payload
    if (!sessionId || !url) return
    setSessionCompetitorUrl(sessionId, url.trim())
  })

  ipcMain.handle('competitor:clear', (_event, sessionId: string) => {
    if (!sessionId) return
    setSessionCompetitorUrl(sessionId, null)
  })

  ipcMain.handle('getCompetitorUrl', (_event, sessionId: string) => {
    if (!sessionId) return null
    return getSessionCompetitorUrl(sessionId)
  })

  ipcMain.handle('getLatestCompetitorSignals', (_event, sessionId: string) => {
    if (!sessionId) return null
    try {
      const row = getLatestCompetitorCapture(sessionId)
      if (!row || !row.signals_json) return null
      const signals = JSON.parse(row.signals_json) as Record<string, unknown>
      return { signals }
    } catch {
      return null
    }
  })

  // Gate 7: neutral listing capture (no evaluation; store context only)
  ipcMain.handle('gate7:captureListing', async (_e, payload: { storeId: number }) => {
    const { storeId } = payload || {}
    if (!storeId || !mainWindow?.webContents || mainWindow.isDestroyed()) {
      return { ok: false, error: 'window not ready' }
    }
    if (!browserView) {
      return { ok: false, error: 'browser not open' }
    }
    const wc = browserView.webContents
    const url = wc.getURL()
    if (!url || !url.includes('/listing/')) {
      return { ok: false, error: 'not_listing' }
    }
    try {
      const snapshot = await captureListingSnapshotFromWebContents(wc, storeId)
      return snapshot ? { ok: true, snapshot } : { ok: false, error: 'capture failed' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { ok: false, error: msg }
    }
  })

  ipcMain.handle('ping', async (_e, p) => {
    console.log('PING_HANDLER', p)
    return { ok: true, pong: true }
  })

  ipcMain.handle('competitor:capture', async (_e, payload: { sessionId: string; url: string }) => {
    console.log('COMP_HANDLER_HIT', payload)
    const { sessionId, url } = payload || {}
    if (!sessionId || !url || !url.includes('/listing/')) {
      return { ok: false, error: 'invalid payload' }
    }
    if (!mainWindow || mainWindow.isDestroyed()) {
      return { ok: false, error: 'window not ready' }
    }
    if (!browserView) {
      return { ok: false, error: 'browser view not attached' }
    }
    const wc = browserView.webContents
    try {
      // A) Navigate to competitor URL
      const currentUrl = wc.getURL()
      if (!currentUrl || currentUrl !== url) {
        await new Promise<void>((resolve, reject) => {
          const onFinish = () => {
            wc.removeListener('did-fail-load', onFail)
            resolve()
          }
          const onFail = (_event: Electron.Event, errorCode: number, errorDescription: string) => {
            wc.removeListener('did-finish-load', onFinish)
            reject(new Error(errorDescription || 'Failed to load competitor URL'))
          }
          wc.once('did-finish-load', onFinish)
          wc.once('did-fail-load', onFail)
          wc.loadURL(url)
        })
      }
      // B) Take screenshot
      let assetsDir: string
      try {
        assetsDir = getAssetsDir()
      } catch (e) {
        console.error('[competitor] could not get assets dir', e)
        return { ok: false, error: 'assets dir failed' }
      }
      const id = 'compcap_' + Date.now()
      const pngPath = path.join(assetsDir, id + '.png')
      try {
        const image = await wc.capturePage()
        const pngBuffer = image.toPNG()
        fs.writeFileSync(pngPath, pngBuffer)
      } catch (e) {
        console.error('[competitor] failed to capture screenshot', e)
        return { ok: false, error: 'screenshot failed' }
      }
      // C) Insert DB row with empty signals_json first
      try {
        insertCompetitorCapture(id, sessionId, url, pngPath, '{}')
        console.log('[competitor] capture saved', { id, sessionId, url, pngPath })
      } catch (e) {
        console.error('[competitor] failed to save competitor capture', e)
        return { ok: false, error: 'db insert failed' }
      }

      // D) Extract signals from DOM (never throw)
      let signals: { title: string | null; price: string | null; photoCount: number | null; rating: string | null; reviewCount: number | null; shippingCue: string | null } = { title: null, price: null, photoCount: null, rating: null, reviewCount: null, shippingCue: null }
      try {
        const raw = await wc.executeJavaScript(`
          (function() {
            try {
              var getText = function(sel) {
                var el = document.querySelector(sel);
                return el ? (el.textContent || '').trim() : null;
              };
              var title = getText('h1[data-buy-box-listing-title]') || getText('h1[itemprop="name"]') || getText('h1');
              var priceEl = document.querySelector('[data-buy-box-region="price"]') || document.querySelector('p[data-buy-box-listing-price]') || document.querySelector('span[itemprop="price"]');
              var price = priceEl ? (priceEl.textContent || '').trim() : null;
              var imgNodes = document.querySelectorAll('[data-carousel-pane="image"] img, [data-listing-image], ul[role="list"] li img');
              var photoCount = imgNodes && imgNodes.length ? imgNodes.length : null;
              var ratingEl = document.querySelector('span[data-buy-box-region="star-rating"] [aria-hidden="true"]') || document.querySelector('span[itemprop="ratingValue"]');
              var rating = ratingEl ? (ratingEl.textContent || '').trim() : null;
              var reviewEl = document.querySelector('a[href*="#reviews"] span') || document.querySelector('span[itemprop="reviewCount"]');
              var reviewCount = reviewEl ? (reviewEl.textContent || '').trim() : null;
              var shipEl = document.querySelector('[data-buy-box-region="delivery"]') || document.querySelector('[data-buy-box-region="shipping"]') || document.querySelector('[data-qa="delivery-message"]');
              var shippingCue = shipEl ? (shipEl.textContent || '').trim() : null;
              return { title: title || null, price: price || null, photoCount: photoCount, rating: rating || null, reviewCount: reviewCount || null, shippingCue: shippingCue || null };
            } catch (e) {
              return { title: null, price: null, photoCount: null, rating: null, reviewCount: null, shippingCue: null };
            }
          })();
        `)
        if (raw && typeof raw === 'object') {
          const rev = raw.reviewCount
          const reviewNum = typeof rev === 'number' ? rev : (typeof rev === 'string' ? parseInt(rev.replace(/\D/g, ''), 10) : NaN)
          signals = {
            title: typeof raw.title === 'string' ? raw.title : null,
            price: typeof raw.price === 'string' ? raw.price : null,
            photoCount: typeof raw.photoCount === 'number' ? raw.photoCount : null,
            rating: typeof raw.rating === 'string' ? raw.rating : null,
            reviewCount: Number.isFinite(reviewNum) ? reviewNum : null,
            shippingCue: typeof raw.shippingCue === 'string' ? raw.shippingCue : null,
          }
        }
      } catch (e) {
        console.warn('[competitor] DOM extraction failed (non-fatal)', e)
      }

      const signalsJson = JSON.stringify(signals)
      try {
        updateCompetitorSignals(id, signalsJson)
      } catch (e) {
        console.warn('[competitor] updateCompetitorSignals failed (non-fatal)', e)
      }

      return { ok: true, id, pngPath, signals }
    } catch (e) {
      console.error('[competitor] capture failed', e)
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('capture:create', async (_event, payload: { sessionId?: string } | string) => {
    const gateState = getDefaultGateState()
    if (gateState.gate10 !== 'OPEN' && gateState.gate10 !== 'PASS') {
      console.error('[gates] gate10 not OPEN. Mentor action blocked.')
      return null
    }
    const providedSessionId = typeof payload === 'object' && payload !== null && typeof payload.sessionId === 'string'
      ? payload.sessionId
      : (typeof payload === 'string' ? payload : '')
    if (!providedSessionId || providedSessionId.trim() === '') {
      sendCaptureFailed('No session. Start a session first.')
      throw new Error('capture:create requires sessionId from renderer')
    }
    try {
      if (!mainWindow || mainWindow.isDestroyed()) {
        sendCaptureFailed('App window not ready.')
        return null
      }
      if (!browserView) {
        sendCaptureFailed('Browser view not attached. Open a session first.')
        return null
      }
      const wc = browserView.webContents
      const url = wc.getURL()
      console.log('[main] capture:create received', { sessionId: providedSessionId, url })
      if (!getSession(providedSessionId)) insertSession(providedSessionId)
      if (!url || url === 'about:blank') {
        sendCaptureFailed('No page loaded. Navigate to a URL first.')
        return null
      }

      const captureId = 'cap_' + Date.now()
      let assetsDir: string
      try {
        assetsDir = getAssetsDir()
      } catch (e) {
        sendCaptureFailed('Could not create assets directory.', e)
        return null
      }
      const htmlPath = path.join(assetsDir, captureId + '.html')
      const pngPath = path.join(assetsDir, captureId + '.png')

      let html: string
      try {
        html = await wc.executeJavaScript('document.documentElement.outerHTML')
        fs.writeFileSync(htmlPath, html, 'utf-8')
      } catch (e) {
        sendCaptureFailed('Failed to get or save page HTML.', e)
        return null
      }

      try {
        const image = await wc.capturePage()
        const png = image.toPNG()
        fs.writeFileSync(pngPath, png)
      } catch (e) {
        sendCaptureFailed('Failed to capture or save screenshot.', e)
        return null
      }

      const isListing = url.includes('/listing/')
      let parseStatus = isListing ? 'ok' : 'failed'
      let parsedJson = '{}'
      if (isListing) {
        try {
          const parsed = parseListing(html, url)
          parsedJson = JSON.stringify(parsed)
        } catch {
          parseStatus = 'failed'
          parsedJson = '{"parseConfidence":0}'
        }
      }

      try {
        insertCapture(captureId, providedSessionId, url, htmlPath, pngPath, parseStatus, parsedJson)
        console.log('[main] capture:create inserted', { captureId, sessionIdSaved: providedSessionId })
      } catch (e) {
        sendCaptureFailed('Failed to save capture to database.', e)
        return null
      }

      mainWindow.webContents.send('capture:created', { captureId, sessionId: providedSessionId, url })
      return { captureId, sessionId: providedSessionId, url }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      sendCaptureFailed('Capture failed: ' + msg, e)
      return null
    }
  })

  ipcMain.handle('listSessions', () => listSessions())
  ipcMain.handle('listStores', () => listStores())
  ipcMain.handle('updateStoreGoal', (_event, id: number, goal: string | null) => {
    updateStoreGoal(id, goal ?? null)
    return { ok: true }
  })
  ipcMain.handle('getSession', (_event, id: string) => getSession(id))
  ipcMain.handle('getSetting', (_event, key: string) => getSetting(key))
  ipcMain.handle('setSetting', (_event, key: string, value: string) => setSetting(key, value))
  ipcMain.handle('updateSessionNote', (_event, sessionId: string, note: string) => {
    insertSession(sessionId)
    updateSessionNote(sessionId, note)
  })
  ipcMain.handle('getCapture', (_event, id: string) => getCapture(id))
  ipcMain.handle('getAiOutput', (_event, captureId: string, type: string) => {
    const row = getAiOutputByCapture(captureId, type)
    if (!row) return null
    try {
      return JSON.parse(row.payload)
    } catch {
      return null
    }
  })
  ipcMain.handle('listCaptures', (_event, sessionId: string) => {
    const rows = listCapturesBySession(sessionId)
    console.log('[main] listCaptures', { sessionId, count: rows.length, ts: Date.now() })
    return rows
  })
  ipcMain.handle('getCaptureImage', (_event, captureId: string) => {
    const capture = getCapture(captureId)
    if (!capture) return null
    try {
      const buf = fs.readFileSync(capture.png_path)
      return 'data:image/png;base64,' + buf.toString('base64')
    } catch {
      return null
    }
  })

  ipcMain.handle('getParsedListing', (_event, captureId: string) => {
    const capture = getCapture(captureId)
    if (!capture) return null
    try {
      const html = fs.readFileSync(capture.html_path, 'utf-8')
      return parseListing(html, capture.url)
    } catch {
      return null
    }
  })

  ipcMain.handle('capture:analyze', async (_event, captureId: string): Promise<{ ok: true; data: unknown } | { ok: false; errorMessage: string }> => {
    const gateState = getDefaultGateState()
    if (gateState.gate10 !== 'OPEN' && gateState.gate10 !== 'PASS') {
      console.error('[gates] gate10 not OPEN. Mentor action blocked.')
      return { ok: false, errorMessage: 'Mentor actions are disabled by gate10.' }
    }
    try {
      const capture = getCapture(captureId)
      if (!capture) {
        return { ok: false, errorMessage: 'Capture not found.' }
      }
      let html: string
      try {
        html = fs.readFileSync(capture.html_path, 'utf-8')
      } catch {
        return { ok: false, errorMessage: 'Failed to read capture data.' }
      }
      const apiKey = getSetting('openai_api_key') || process.env.OPENAI_API_KEY
      if (!apiKey) {
        return { ok: false, errorMessage: 'OpenAI API key not set. Add it in Settings.' }
      }
      let result: Awaited<ReturnType<typeof runSeoAudit>>
      try {
        result = await runSeoAudit(html, capture.url)
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (/network|fetch|ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i.test(msg)) {
          return { ok: false, errorMessage: 'Network error. Check your connection and API key.' }
        }
        return { ok: false, errorMessage: msg || 'Audit request failed.' }
      }
      if (!result) {
        return { ok: false, errorMessage: 'Audit could not be generated. Please try again.' }
      }
      try {
        const outputId = 'ai_' + Date.now()
        insertAiOutput(outputId, captureId, 'seo_audit', JSON.stringify(result))
      } catch {
        return { ok: false, errorMessage: 'Failed to save audit.' }
      }
      return { ok: true, data: result }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, errorMessage: msg || 'Audit failed.' }
    }
  })
}

app.whenReady().then(async () => {
  await initDB()
  const gateState = getDefaultGateState()
  if (gateState.gate9 !== 'PASS') {
    console.error('[gates] gate9 is not PASS. Application will exit.')
    app.quit()
    return
  }
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
