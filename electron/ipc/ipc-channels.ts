/**
 * DC-2: IPC channel constants.
 * Query-only channels; no mutation channels in DC-2.
 * DC-12: Update channels — check/install only; human confirms installation.
 */

export const IPC_CHANNELS = {
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
  /** OC-7: Read-only operator advisory projection for desktop renderer. */
  OPERATOR_GET_ADVISORY_PROJECTION: 'operator:get-advisory-projection',
  /** OC-15: Read-only operator incident history surface for desktop renderer. */
  OPERATOR_GET_INCIDENT_HISTORY_SURFACE: 'operator:get-incident-history-surface',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
