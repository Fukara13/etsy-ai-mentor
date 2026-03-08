/**
 * DC-2: Preload API typings for Desktop Control Center renderer.
 */

interface HealthCheckResponse {
  ok: true
  source: 'main'
}

interface DesktopApi {
  system: {
    ping: () => Promise<HealthCheckResponse>
  }
}

declare global {
  interface Window {
    desktopApi?: DesktopApi
  }
}

export {}
