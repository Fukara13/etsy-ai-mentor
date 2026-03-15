/**
 * OC-7: IPC handler for read-only operator advisory projection.
 * OC-8: Reads through canonical visibility snapshot; preserves IPC contract.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { readOperatorVisibilitySnapshot } from '../operator-visibility'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

export function registerOperatorAdvisoryIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.OPERATOR_GET_ADVISORY_PROJECTION,
    (): Promise<OperatorRuntimeAdvisoryProjection | null> => {
      const snapshot = readOperatorVisibilitySnapshot()
      return Promise.resolve(snapshot.advisoryProjection)
    }
  )
}
