/**
 * OC-15: IPC handler for read-only operator incident history surface.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { readIncidentHistorySurface } from '../operator-incident-history'
import type { OperatorIncidentHistorySurface } from '../operator-incident-history'

export function registerOperatorIncidentHistoryIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.OPERATOR_GET_INCIDENT_HISTORY_SURFACE,
    (): Promise<OperatorIncidentHistorySurface> =>
      Promise.resolve(readIncidentHistorySurface())
  )
}

