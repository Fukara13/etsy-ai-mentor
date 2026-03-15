/**
 * OC-7: IPC handler for read-only operator advisory projection.
 * Returns current projection from runtime store or null; no side effects.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { getCurrentOperatorAdvisoryProjection } from '../operator-advisory-runtime'
import type { OperatorRuntimeAdvisoryProjection } from '../runtime-advisory-projection'

export function registerOperatorAdvisoryIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.OPERATOR_GET_ADVISORY_PROJECTION,
    (): Promise<OperatorRuntimeAdvisoryProjection | null> => {
      const projection = getCurrentOperatorAdvisoryProjection()
      return Promise.resolve(projection)
    }
  )
}
