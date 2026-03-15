/**
 * DC-2: Bounded API surface exposed to renderer.
 * Allowlist only; no raw ipcRenderer; no generic execute.
 * OC-1: Repair trigger exposed via repair.triggerRun.
 */

import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import type { HealthCheckResponse } from '../../shared/desktop-contracts'
import type { RepairRunOutcome } from '../../gates/repair/repair-run-outcome'

/** Minimal input for repair.triggerRun. Main process accepts partial input and applies defaults. */
export type TriggerRepairInput = {
  readonly source?: string
  readonly sessionId?: string
  readonly initialState?: string
  readonly metadata?: Readonly<Record<string, unknown>>
  readonly retryCount?: number
  readonly maxRetries?: number
  readonly maxSteps?: number
}

const desktopApi = {
  system: {
    ping: (): Promise<HealthCheckResponse> =>
      ipcRenderer.invoke(IPC_CHANNELS.HEALTH_PING),
  },
  repair: {
    triggerRun: (input: TriggerRepairInput): Promise<RepairRunOutcome> =>
      ipcRenderer.invoke(IPC_CHANNELS.TRIGGER_REPAIR_RUN, input),
  },
}

export function exposeDesktopApi(): void {
  contextBridge.exposeInMainWorld('desktopApi', desktopApi)
}
