/**
 * DC-10: Allow-listed IPC channels for Desktop Control Center.
 * Read-only; no mutation channels. DC-12: check/install only; human confirms.
 */

export const DESKTOP_ALLOWED_IPC_CHANNELS = [
  'desktop:health:ping',
  'desktop:read:getAppVersion',
  'desktop:read:getRepairRunView',
  'desktop:read:getStateMachineView',
  'desktop:read:getFailureTimelineView',
  'desktop:read:getGPTAnalysisView',
  'desktop:read:getRepairStrategyView',
  'desktop:read:getTelemetryView',
  'desktop:read:getDecisionView',
  'desktop:updates:check',
  'desktop:updates:install',
  'desktop:updates:available',
  'desktop:updates:downloaded',
  'desktop:repair:triggerRun',
  /** OC-7: Read-only operator advisory projection. */
  'operator:get-advisory-projection',
  /** OC-15: Read-only operator incident history surface. */
  'operator:get-incident-history-surface',
  /** OC-16: Unified operator timeline panel surface. */
  'operator:get-timeline-panel-surface',
] as const

export type DesktopAllowedIpcChannel = (typeof DESKTOP_ALLOWED_IPC_CHANNELS)[number]
