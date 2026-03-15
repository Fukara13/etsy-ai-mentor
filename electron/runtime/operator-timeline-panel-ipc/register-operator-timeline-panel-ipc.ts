/**
 * OC-16: IPC handler for unified operator timeline panel surface.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../ipc/ipc-channels'
import { readOperatorTimelinePanelSurface } from '../operator-timeline-panel'
import type { OperatorTimelinePanelSurface } from '../operator-timeline-panel'

export function registerOperatorTimelinePanelIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.OPERATOR_GET_TIMELINE_PANEL_SURFACE,
    (): Promise<OperatorTimelinePanelSurface> =>
      Promise.resolve(readOperatorTimelinePanelSurface())
  )
}

