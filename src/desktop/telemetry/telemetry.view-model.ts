/**
 * DC-8: Telemetry dashboard view models.
 * Read-only; no mutation authority.
 */

export type SystemHealthViewModel = {
  totalRuns: number
  successfulRuns: number
  failedRuns: number
  successRateLabel: string
}

export type RetryStatsViewModel = {
  zeroRetryRuns: number
  oneRetryRuns: number
  twoRetryRuns: number
  threeRetryRuns: number
}

export type FailureTypeItem = {
  type: string
  count: number
}

export type FailureTypesViewModel = {
  items: FailureTypeItem[]
}

export type RepairTimingViewModel = {
  averageDurationLabel: string
  fastestDurationLabel: string
  slowestDurationLabel: string
}

export type TelemetryDashboardViewModel = {
  systemHealth: SystemHealthViewModel
  retryStats: RetryStatsViewModel
  failureTypes: FailureTypesViewModel
  repairTiming: RepairTimingViewModel
  status: 'ready' | 'empty'
}
