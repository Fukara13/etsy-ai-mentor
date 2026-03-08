/**
 * DC-4 / DC-10.2 / DC-10.3: IPC handlers for backbone read service.
 * Read-only; no mutation.
 * All views engine-backed: RepairRun, StateMachine, FailureTimeline, RepairStrategy,
 * Decision, GPTAnalysis, Telemetry.
 */

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../ipc-channels'
import {
  getEngineRepairRunView,
  getEngineStateMachineView,
  getEngineFailureTimelineView,
  getEngineRepairStrategyView,
  getEngineDecisionView,
  getEngineGPTAnalysisView,
  getEngineTelemetryView,
} from '../../desktop/engine-backed-provider'

export function registerBackboneReadHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_REPAIR_RUN_VIEW, () => Promise.resolve(getEngineRepairRunView()))
  ipcMain.handle(IPC_CHANNELS.GET_STATE_MACHINE_VIEW, () => Promise.resolve(getEngineStateMachineView()))
  ipcMain.handle(IPC_CHANNELS.GET_FAILURE_TIMELINE_VIEW, () => Promise.resolve(getEngineFailureTimelineView()))
  ipcMain.handle(IPC_CHANNELS.GET_REPAIR_STRATEGY_VIEW, () => Promise.resolve(getEngineRepairStrategyView()))
  ipcMain.handle(IPC_CHANNELS.GET_DECISION_VIEW, () => Promise.resolve(getEngineDecisionView()))
  ipcMain.handle(IPC_CHANNELS.GET_GPT_ANALYSIS_VIEW, () => Promise.resolve(getEngineGPTAnalysisView()))
  ipcMain.handle(IPC_CHANNELS.GET_TELEMETRY_VIEW, () => Promise.resolve(getEngineTelemetryView()))
}
