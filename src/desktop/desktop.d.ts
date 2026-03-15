/**
 * DC-2: Preload API typings for Desktop Control Center renderer.
 * DC-12: Version and update API.
 */

interface HealthCheckResponse {
  ok: true
  source: 'main'
}

/** Minimal input for repair.triggerRun. */
interface TriggerRepairInput {
  readonly source?: string
  readonly sessionId?: string
  readonly metadata?: Readonly<Record<string, unknown>>
}

interface DesktopApi {
  system: {
    ping: () => Promise<HealthCheckResponse>
    getVersion: () => Promise<string>
  }
  repair: {
    triggerRun: (input: TriggerRepairInput) => Promise<unknown>
  }
  updates: {
    checkForUpdates: () => Promise<void>
    installUpdate: () => Promise<void>
    onUpdateAvailable: (callback: () => void) => () => void
    onUpdateDownloaded: (callback: () => void) => () => void
  }
}

declare global {
  interface Window {
    desktopApi?: DesktopApi
  }
}

export {}
