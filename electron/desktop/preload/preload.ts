/**
 * DC-2/DC-4: Preload bridge for Desktop Control Center.
 * Read-only; no raw ipcRenderer exposed.
 * DC-12: Version and update API (human confirms install).
 */

import { contextBridge, ipcRenderer } from 'electron'

const CHANNELS = {
  HEALTH_PING: 'desktop:health:ping',
  GET_APP_VERSION: 'desktop:read:getAppVersion',
  GET_REPAIR_RUN_VIEW: 'desktop:read:getRepairRunView',
  GET_STATE_MACHINE_VIEW: 'desktop:read:getStateMachineView',
  GET_FAILURE_TIMELINE_VIEW: 'desktop:read:getFailureTimelineView',
  GET_GPT_ANALYSIS_VIEW: 'desktop:read:getGPTAnalysisView',
  GET_REPAIR_STRATEGY_VIEW: 'desktop:read:getRepairStrategyView',
  GET_TELEMETRY_VIEW: 'desktop:read:getTelemetryView',
  GET_DECISION_VIEW: 'desktop:read:getDecisionView',
  CHECK_FOR_UPDATES: 'desktop:updates:check',
  INSTALL_UPDATE: 'desktop:updates:install',
  UPDATE_AVAILABLE: 'desktop:updates:available',
  UPDATE_DOWNLOADED: 'desktop:updates:downloaded',
  TRIGGER_REPAIR_RUN: 'desktop:repair:triggerRun',
  OPERATOR_GET_ADVISORY_PROJECTION: 'operator:get-advisory-projection',
}

const desktopApi = {
  system: {
    ping: (): Promise<{ ok: true; source: 'main' }> => ipcRenderer.invoke(CHANNELS.HEALTH_PING),
    getVersion: (): Promise<string> => ipcRenderer.invoke(CHANNELS.GET_APP_VERSION),
  },
  updates: {
    checkForUpdates: (): Promise<void> => ipcRenderer.invoke(CHANNELS.CHECK_FOR_UPDATES),
    installUpdate: (): Promise<void> => ipcRenderer.invoke(CHANNELS.INSTALL_UPDATE),
    onUpdateAvailable: (callback: () => void): (() => void) => {
      const fn = () => callback()
      ipcRenderer.on(CHANNELS.UPDATE_AVAILABLE, fn)
      return () => ipcRenderer.removeListener(CHANNELS.UPDATE_AVAILABLE, fn)
    },
    onUpdateDownloaded: (callback: () => void): (() => void) => {
      const fn = () => callback()
      ipcRenderer.on(CHANNELS.UPDATE_DOWNLOADED, fn)
      return () => ipcRenderer.removeListener(CHANNELS.UPDATE_DOWNLOADED, fn)
    },
  },
  repair: {
    triggerRun: (input: { source?: string; sessionId?: string; metadata?: Record<string, unknown> }) =>
      ipcRenderer.invoke(CHANNELS.TRIGGER_REPAIR_RUN, input),
  },
  read: {
    getRepairRunView: () => ipcRenderer.invoke(CHANNELS.GET_REPAIR_RUN_VIEW),
    getStateMachineView: () => ipcRenderer.invoke(CHANNELS.GET_STATE_MACHINE_VIEW),
    getFailureTimelineView: () => ipcRenderer.invoke(CHANNELS.GET_FAILURE_TIMELINE_VIEW),
    getGPTAnalysisView: () => ipcRenderer.invoke(CHANNELS.GET_GPT_ANALYSIS_VIEW),
    getRepairStrategyView: () => ipcRenderer.invoke(CHANNELS.GET_REPAIR_STRATEGY_VIEW),
    getTelemetryView: () => ipcRenderer.invoke(CHANNELS.GET_TELEMETRY_VIEW),
    getDecisionView: () => ipcRenderer.invoke(CHANNELS.GET_DECISION_VIEW),
    getOperatorAdvisoryProjection: () =>
      ipcRenderer.invoke(CHANNELS.OPERATOR_GET_ADVISORY_PROJECTION),
  },
}

contextBridge.exposeInMainWorld('desktopApi', desktopApi)
