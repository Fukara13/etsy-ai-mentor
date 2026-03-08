/**
 * DC-2: IPC channel constants.
 * Query-only channels; no mutation channels in DC-2.
 */

export const IPC_CHANNELS = {
  HEALTH_PING: 'desktop:health:ping',
  GET_REPAIR_RUN_VIEW: 'desktop:read:getRepairRunView',
  GET_STATE_MACHINE_VIEW: 'desktop:read:getStateMachineView',
  GET_FAILURE_TIMELINE_VIEW: 'desktop:read:getFailureTimelineView',
  GET_GPT_ANALYSIS_VIEW: 'desktop:read:getGPTAnalysisView',
  GET_REPAIR_STRATEGY_VIEW: 'desktop:read:getRepairStrategyView',
  GET_TELEMETRY_VIEW: 'desktop:read:getTelemetryView',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
