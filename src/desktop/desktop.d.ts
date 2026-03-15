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

/** OC-7: Read-only operator advisory projection (hero-runtime). */
interface OperatorRuntimeAdvisoryProjection {
  readonly source: 'hero-runtime'
  readonly status: 'completed' | 'skipped' | 'partial' | 'failed'
  readonly advisorySummaries: readonly Readonly<{
    readonly summary: string
    readonly rationaleExcerpt: string
    readonly confidence?: number
    readonly recommendedNextStep?: string
    readonly supportingSignalSummaries?: readonly string[]
  }>[]
  readonly failureSummary?: string
}

interface DesktopApi {
  system: {
    ping: () => Promise<HealthCheckResponse>
    getVersion: () => Promise<string>
  }
  repair: {
    triggerRun: (input: TriggerRepairInput) => Promise<unknown>
  }
  read: {
    getRepairRunView: () => Promise<unknown>
    getStateMachineView: () => Promise<unknown>
    getFailureTimelineView: () => Promise<unknown>
    getGPTAnalysisView: () => Promise<unknown>
    getRepairStrategyView: () => Promise<unknown>
    getTelemetryView: () => Promise<unknown>
    getDecisionView: () => Promise<unknown>
    getOperatorAdvisoryProjection: () => Promise<OperatorRuntimeAdvisoryProjection | null>
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
