/**
 * DC-2/DC-4: Preload bridge for Desktop Control Center.
 * Read-only; no raw ipcRenderer exposed.
 */

import { contextBridge, ipcRenderer } from 'electron'

const CHANNELS = {
  HEALTH_PING: 'desktop:health:ping',
  GET_REPAIR_RUN_VIEW: 'desktop:read:getRepairRunView',
  GET_STATE_MACHINE_VIEW: 'desktop:read:getStateMachineView',
  GET_FAILURE_TIMELINE_VIEW: 'desktop:read:getFailureTimelineView',
  GET_GPT_ANALYSIS_VIEW: 'desktop:read:getGPTAnalysisView',
  GET_REPAIR_STRATEGY_VIEW: 'desktop:read:getRepairStrategyView',
  GET_TELEMETRY_VIEW: 'desktop:read:getTelemetryView',
  GET_DECISION_VIEW: 'desktop:read:getDecisionView',
}

const desktopApi = {
  system: {
    ping: (): Promise<{ ok: true; source: 'main' }> => ipcRenderer.invoke(CHANNELS.HEALTH_PING),
  },
  read: {
    getRepairRunView: () => ipcRenderer.invoke(CHANNELS.GET_REPAIR_RUN_VIEW),
    getStateMachineView: () => ipcRenderer.invoke(CHANNELS.GET_STATE_MACHINE_VIEW),
    getFailureTimelineView: () => ipcRenderer.invoke(CHANNELS.GET_FAILURE_TIMELINE_VIEW),
    getGPTAnalysisView: () => ipcRenderer.invoke(CHANNELS.GET_GPT_ANALYSIS_VIEW),
    getRepairStrategyView: () => ipcRenderer.invoke(CHANNELS.GET_REPAIR_STRATEGY_VIEW),
    getTelemetryView: () => ipcRenderer.invoke(CHANNELS.GET_TELEMETRY_VIEW),
    getDecisionView: () => ipcRenderer.invoke(CHANNELS.GET_DECISION_VIEW),
  },
}

contextBridge.exposeInMainWorld('desktopApi', desktopApi)
