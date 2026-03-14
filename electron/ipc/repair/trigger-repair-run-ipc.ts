/**
 * OC-1: IPC handler for operator-triggered repair run.
 */

import { ipcMain } from 'electron'
import { TRIGGER_REPAIR_RUN } from './repair-ipc-command'
import { triggerRepairRun } from '../../desktop/engine-backed-provider'
import type { LoopRunInput } from '../../gates/repair/repair-loop-orchestrator'

export function registerTriggerRepairRunHandler(): void {
  ipcMain.handle(TRIGGER_REPAIR_RUN, async (_event, input: LoopRunInput) => {
    const outcome = triggerRepairRun(input)
    return outcome
  })
}
