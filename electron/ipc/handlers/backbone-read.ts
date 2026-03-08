/**
 * DC-4: IPC handlers for backbone read service.
 * Read-only; no mutation.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import {
  getRepairRunView,
  getStateMachineView,
  getFailureTimelineView,
  getGPTAnalysisView,
  getRepairStrategyView,
  getTelemetryView,
  getDecisionView,
} from '../../../src/desktop/backbone'

export function registerBackboneReadHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_REPAIR_RUN_VIEW, () => getRepairRunView())
  ipcMain.handle(IPC_CHANNELS.GET_STATE_MACHINE_VIEW, () => getStateMachineView())
  ipcMain.handle(IPC_CHANNELS.GET_FAILURE_TIMELINE_VIEW, () => getFailureTimelineView())
  ipcMain.handle(IPC_CHANNELS.GET_GPT_ANALYSIS_VIEW, () => getGPTAnalysisView())
  ipcMain.handle(IPC_CHANNELS.GET_REPAIR_STRATEGY_VIEW, () => getRepairStrategyView())
  ipcMain.handle(IPC_CHANNELS.GET_TELEMETRY_VIEW, () => getTelemetryView())
  ipcMain.handle(IPC_CHANNELS.GET_DECISION_VIEW, () => getDecisionView())
}
