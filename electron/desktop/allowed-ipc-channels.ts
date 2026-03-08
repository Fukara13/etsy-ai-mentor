/**
 * DC-10: Allow-listed IPC channels for Desktop Control Center.
 * Read-only; no mutation channels. Single source of truth for security assertions.
 */

export const DESKTOP_ALLOWED_IPC_CHANNELS = [
  'desktop:health:ping',
  'desktop:read:getRepairRunView',
  'desktop:read:getStateMachineView',
  'desktop:read:getFailureTimelineView',
  'desktop:read:getGPTAnalysisView',
  'desktop:read:getRepairStrategyView',
  'desktop:read:getTelemetryView',
  'desktop:read:getDecisionView',
] as const

export type DesktopAllowedIpcChannel = (typeof DESKTOP_ALLOWED_IPC_CHANNELS)[number]
