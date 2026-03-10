import type { Session } from '../types'
import type { Capture, Store } from '../types'
import type { GateState } from './types'
import { SessionService } from './services/SessionService'
import { CaptureService } from './services/CaptureService'
import { StoreService } from './services/StoreService'
import { SettingsService } from './services/SettingsService'
import { GateService } from './services/GateService'

// Dependencies required from the Electron / infrastructure layer.
// Intentionally kept broad for now; we can tighten these types in later gates.
export type AppServicesDeps = {
  gate: {
    getCurrentGateState: () => GateState
    setGateState?: (next: GateState) => void
  }
  db: {
    // Sessions
    getSession: (id: string) => Session | null
    insertSession: (id: string, note?: string) => void
    listSessions: () => Session[]
    updateSessionNote: (id: string, note: string) => void
    setSessionCompetitorUrl?: (sessionId: string, url: string | null) => void

    // Stores
    listStores: () => Store[]
    updateStoreGoal: (id: number, goal: string | null) => void

    // Captures
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

    // Settings
    getSetting: (key: string) => string | undefined
    setSetting: (key: string, value: string) => void
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
    parseListing: (html: string, url: string) => unknown
  }
}

export type AppServices = {
  session: SessionService
  capture: CaptureService
  store: StoreService
  settings: SettingsService
  gate: GateService
}

export function createAppServices(deps: AppServicesDeps): AppServices {
  const gate = new GateService({
    getCurrentGateState: deps.gate.getCurrentGateState,
    setGateState: deps.gate.setGateState,
  })

  const session = new SessionService({
    gateService: gate,
    db: {
      getSession: deps.db.getSession,
      insertSession: deps.db.insertSession,
      listSessions: deps.db.listSessions,
      updateSessionNote: deps.db.updateSessionNote,
      setSessionCompetitorUrl: deps.db.setSessionCompetitorUrl,
    },
  })

  const store = new StoreService({
    db: {
      listStores: deps.db.listStores,
      updateStoreGoal: deps.db.updateStoreGoal,
    },
  })

  const settings = new SettingsService({
    db: {
      getSetting: deps.db.getSetting,
      setSetting: deps.db.setSetting,
    },
  })

  const capture = new CaptureService({
    gateService: gate,
    db: {
      getSession: deps.db.getSession,
      insertSession: deps.db.insertSession,
      insertCapture: deps.db.insertCapture,
      listCapturesBySession: deps.db.listCapturesBySession,
      getCapture: deps.db.getCapture,
      insertAiOutput: deps.db.insertAiOutput,
      getAiOutputByCapture: deps.db.getAiOutputByCapture,
      getSetting: deps.db.getSetting,
    },
    io: deps.io,
    browser: deps.browser,
    openai: deps.openai,
    parser: {
      // Cast here to avoid pulling zod types into the application layer
      parseListing: deps.parser.parseListing as (html: string, url: string) => any,
    },
  })

  return {
    session,
    capture,
    store,
    settings,
    gate,
  }
}

