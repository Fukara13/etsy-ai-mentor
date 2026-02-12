import type { Capture, Session } from '../../types'
import type { ParsedListing } from '../../lib/schemas'
import type { GateService } from './GateService'

type CaptureServiceDeps = {
  gateService: GateService
  db: {
    getSession: (id: string) => Session | null
    insertSession: (id: string, note?: string) => void
    insertCapture: (
      id: string,
      sessionId: string,
      url: string,
      htmlPath: string,
      pngPath: string,
      parseStatus: string,
      parsedJson: string,
    ) => void
    listCapturesBySession: (sessionId: string) => Capture[]
    getCapture: (id: string) => Capture | null
    insertAiOutput: (id: string, captureId: string, type: string, payload: string) => void
    getAiOutputByCapture: (captureId: string, type: string) => { payload: string } | null
    getSetting: (key: string) => string | undefined
  }
  io: {
    getAssetsDir: () => string
    readFile: (path: string, encoding: BufferEncoding) => string
    readFileBinary: (path: string) => Uint8Array | null
    writeFile: (path: string, data: string | Uint8Array) => void
  }
  browser: {
    getMainWindow: () => { isDestroyed(): boolean } | null
    getBrowserView: () => { webContents: { getURL(): string; executeJavaScript<T>(code: string): Promise<T>; capturePage(): Promise<{ toPNG(): Uint8Array }> } } | null
    sendCaptureFailed: (message: string, err?: unknown) => void
  }
  openai: {
    runSeoAudit: (html: string, url: string) => Promise<unknown>
  }
  parser: {
    parseListing: (html: string, url: string) => ParsedListing
  }
}

type AnalyzeResultOk = { ok: true; data: unknown }
type AnalyzeResultErr = { ok: false; errorMessage: string }

export class CaptureService {
  constructor(private readonly deps: CaptureServiceDeps) {}

  async createCapture(input: { sessionId: string }): Promise<{ captureId: string; sessionId: string; url: string } | null> {
    await this.deps.gateService.requireGate('gate10')

    const sessionId = input.sessionId?.trim()
    if (!sessionId) {
      this.deps.browser.sendCaptureFailed('No session. Start a session first.')
      throw new Error('capture:create requires sessionId from renderer')
    }

    const mainWindow = this.deps.browser.getMainWindow()
    if (!mainWindow || mainWindow.isDestroyed()) {
      this.deps.browser.sendCaptureFailed('App window not ready.')
      return null
    }

    const browserView = this.deps.browser.getBrowserView()
    if (!browserView) {
      this.deps.browser.sendCaptureFailed('Browser view not attached. Open a session first.')
      return null
    }

    const wc = browserView.webContents
    const url = wc.getURL()
    if (!this.deps.db.getSession(sessionId)) {
      this.deps.db.insertSession(sessionId)
    }
    if (!url || url === 'about:blank') {
      this.deps.browser.sendCaptureFailed('No page loaded. Navigate to a URL first.')
      return null
    }

    const captureId = 'cap_' + Date.now()

    let assetsDir: string
    try {
      assetsDir = this.deps.io.getAssetsDir()
    } catch (e) {
      this.deps.browser.sendCaptureFailed('Could not create assets directory.', e)
      return null
    }

    const htmlPath = this.joinPath(assetsDir, captureId + '.html')
    const pngPath = this.joinPath(assetsDir, captureId + '.png')

    let html: string
    try {
      html = await wc.executeJavaScript('document.documentElement.outerHTML')
      this.deps.io.writeFile(htmlPath, html)
    } catch (e) {
      this.deps.browser.sendCaptureFailed('Failed to get or save page HTML.', e)
      return null
    }

    try {
      const image = await wc.capturePage()
      const png = image.toPNG()
      this.deps.io.writeFile(pngPath, png)
    } catch (e) {
      this.deps.browser.sendCaptureFailed('Failed to capture or save screenshot.', e)
      return null
    }

    const isListing = url.includes('/listing/')
    let parseStatus = isListing ? 'ok' : 'failed'
    let parsedJson = '{}'
    if (isListing) {
      try {
        const parsed = this.deps.parser.parseListing(html, url)
        parsedJson = JSON.stringify(parsed)
      } catch {
        parseStatus = 'failed'
        parsedJson = '{"parseConfidence":0}'
      }
    }

    try {
      this.deps.db.insertCapture(captureId, sessionId, url, htmlPath, pngPath, parseStatus, parsedJson)
    } catch (e) {
      this.deps.browser.sendCaptureFailed('Failed to save capture to database.', e)
      return null
    }

    return { captureId, sessionId, url }
  }

  async listCaptures(sessionId: string): Promise<Capture[]> {
    const rows = this.deps.db.listCapturesBySession(sessionId)
    // Preserve existing logging behavior at call-site instead of here
    return rows
  }

  async getCapture(id: string): Promise<Capture | null> {
    return this.deps.db.getCapture(id)
  }

  async analyzeCapture(id: string): Promise<AnalyzeResultOk | AnalyzeResultErr> {
    await this.deps.gateService.requireGate('gate10')

    try {
      const capture = this.deps.db.getCapture(id)
      if (!capture) {
        return { ok: false, errorMessage: 'Capture not found.' }
      }

      let html: string
      try {
        html = this.deps.io.readFile(capture.html_path, 'utf-8')
      } catch {
        return { ok: false, errorMessage: 'Failed to read capture data.' }
      }

      const apiKey = this.deps.db.getSetting('openai_api_key') || process.env.OPENAI_API_KEY
      if (!apiKey) {
        return { ok: false, errorMessage: 'OpenAI API key not set. Add it in Settings.' }
      }

      let result: Awaited<ReturnType<CaptureServiceDeps['openai']['runSeoAudit']>>
      try {
        result = await this.deps.openai.runSeoAudit(html, capture.url)
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
        this.deps.db.insertAiOutput(outputId, id, 'seo_audit', JSON.stringify(result))
      } catch {
        return { ok: false, errorMessage: 'Failed to save audit.' }
      }

      return { ok: true, data: result }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, errorMessage: msg || 'Audit failed.' }
    }
  }

  async getCaptureImage(id: string): Promise<string | null> {
    const capture = this.deps.db.getCapture(id)
    if (!capture) return null
    try {
      const buf = this.deps.io.readFileBinary(capture.png_path)
      if (!buf) return null
      return 'data:image/png;base64,' + Buffer.from(buf).toString('base64')
    } catch {
      return null
    }
  }

  async getParsedListing(id: string): Promise<ParsedListing | null> {
    const capture = this.deps.db.getCapture(id)
    if (!capture) return null
    try {
      const html = this.deps.io.readFile(capture.html_path, 'utf-8')
      return this.deps.parser.parseListing(html, capture.url)
    } catch {
      return null
    }
  }

  private joinPath(...segments: string[]): string {
    // `path` is not injected directly to keep this layer path-implementation agnostic.
    // The IO layer is responsible for providing full paths.
    return segments.join('/')
  }
}

