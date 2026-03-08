/**
 * DC-2: Preload API typings for Desktop Control Center renderer.
 * DC-12: Version and update API.
 */

interface HealthCheckResponse {
  ok: true
  source: 'main'
}

interface DesktopApi {
  system: {
    ping: () => Promise<HealthCheckResponse>
    getVersion: () => Promise<string>
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
