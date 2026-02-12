/// <reference types="vite/client" />

interface ElectronAPI {
  sendAppView: (view: string) => void
  browserSetBounds: (rect: { x: number; y: number; width: number; height: number }) => void
  navGo: (url: string) => Promise<void>
  getCurrentUrl: () => Promise<string>
  onUrlChanged: (cb: (url: string) => void) => (() => void) | undefined
  createSession: (id: string, note?: string) => Promise<void>
  captureCreate: (payload: { sessionId: string }) => Promise<{ captureId: string; sessionId: string; url: string } | null>
  onCaptureCreated: (cb: (data: { captureId: string; sessionId: string; url: string }) => void) => () => void
  onCaptureFailed: (cb: (errorMessage: string) => void) => (() => void) | undefined
  onGateBlocked: (cb: (payload: { code: string; message: string }) => void) => (() => void) | undefined
  analyzeCapture: (captureId: string) => Promise<{ ok: true; data: unknown } | { ok: false; errorMessage: string; code?: string }>
  listSessions: () => Promise<{ id: string; note: string | null; created_at: number }[]>
  listStores: () => Promise<{ id: number; name: string; url: string | null; niche_theme: string | null; niche_emotion: string | null; niche_buyer: string | null; level: string; risk_profile: string | null; active_goal: string | null }[]>
  updateStoreGoal: (id: number, goal: string | null) => Promise<void>
  getSession: (id: string) => Promise<{ id: string; note: string | null; created_at: number } | undefined>
  getSetting: (key: string) => Promise<string | undefined>
  setSetting: (key: string, value: string) => Promise<void>
  getCapture: (id: string) => Promise<{ id: string; session_id: string; url: string; html_path: string; png_path: string; created_at: number } | undefined>
  getAiOutput: (captureId: string, type: string) => Promise<unknown>
  listCaptures: (sessionId: string) => Promise<{ id: string; session_id: string; url: string; html_path: string; png_path: string; created_at: number }[]>
  getCaptureImage: (captureId: string) => Promise<string | null>
  getParsedListing: (captureId: string) => Promise<unknown>
  updateSessionNote: (sessionId: string, note: string) => Promise<void>
  setCompetitor: (payload: { sessionId: string; url: string }) => Promise<void>
  clearCompetitor: (sessionId: string) => Promise<void>
  getCompetitorUrl: (sessionId: string) => Promise<string | null>
  competitorCapture: (payload: { sessionId: string; url: string }) => Promise<{ ok: boolean; error?: string } | null>
  getLatestCompetitorSignals: (sessionId: string) => Promise<{ signals: Record<string, unknown> } | null>
  gate7CaptureListing: (storeId: number) => Promise<
    | { ok: true; snapshot: { id: string; listing_url: string; title_text: string | null; description_text: string | null; tags: string[]; image_count: number | null; created_at: number } }
    | { ok: false; error: string }
  >
  gate7SetContext: (payload: { storeId: number }) => Promise<void>
  onGate7ListingCaptured: (cb: (snapshot: { id: string; listing_url: string; title_text: string | null; description_text: string | null; tags: string[]; image_count: number | null; created_at: number }) => void) => () => void
  gate7CloseBrowser: () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    api?: {
      captureAnalyze: (captureId: string) => Promise<{ ok: true; data: unknown } | { ok: false; errorMessage: string }>
      getClipboardText: () => string
    }
  }
}

export {}
