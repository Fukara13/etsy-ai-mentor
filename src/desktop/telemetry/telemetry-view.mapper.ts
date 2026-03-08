/**
 * DC-8: Map TelemetryView to dashboard view models.
 * Deterministic, no side effects, safe fallbacks.
 */

import type { TelemetryView } from '../../shared/read-models'
import type {
  TelemetryDashboardViewModel,
  SystemHealthViewModel,
  RetryStatsViewModel,
  FailureTypesViewModel,
  RepairTimingViewModel,
} from './telemetry.view-model'

function getMetric(metrics: { name: string; value: number }[], name: string): number {
  const m = metrics.find((x) => x.name === name)
  return m != null ? m.value : 0
}

function formatDurationMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function mapSystemHealth(
  metrics: { name: string; value: number }[],
  runCount: number
): SystemHealthViewModel {
  const totalRuns = getMetric(metrics, 'total_runs') || runCount
  const successfulRuns = getMetric(metrics, 'successful_runs')
  const failedRuns = getMetric(metrics, 'failed_runs')
  const successRate =
    totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0
  return {
    totalRuns,
    successfulRuns,
    failedRuns,
    successRateLabel: totalRuns > 0 ? `${successRate}%` : '—',
  }
}

function mapRetryStats(metrics: { name: string; value: number }[]): RetryStatsViewModel {
  return {
    zeroRetryRuns: getMetric(metrics, 'retry_0_runs'),
    oneRetryRuns: getMetric(metrics, 'retry_1_runs'),
    twoRetryRuns: getMetric(metrics, 'retry_2_runs'),
    threeRetryRuns: getMetric(metrics, 'retry_3_runs'),
  }
}

const FAILURE_TYPE_KEYS = [
  'test_failure',
  'build_failure',
  'lint_failure',
  'unknown_failure',
] as const

function mapFailureTypes(metrics: { name: string; value: number }[]): FailureTypesViewModel {
  const items = FAILURE_TYPE_KEYS.map((type) => ({
    type,
    count: getMetric(metrics, `failure_${type}`),
  }))
  return { items }
}

function mapRepairTiming(metrics: { name: string; value: number }[]): RepairTimingViewModel {
  const avg = getMetric(metrics, 'repair_duration_avg_ms')
  const min = getMetric(metrics, 'repair_duration_min_ms')
  const max = getMetric(metrics, 'repair_duration_max_ms')
  const durationMs = getMetric(metrics, 'duration_ms')
  const fallbackAvg = avg || (durationMs > 0 ? durationMs : 0)
  return {
    averageDurationLabel: formatDurationMs(avg || fallbackAvg),
    fastestDurationLabel: formatDurationMs(min),
    slowestDurationLabel: formatDurationMs(max),
  }
}

export function mapTelemetryDashboardViewModel(input: TelemetryView | null): TelemetryDashboardViewModel {
  if (!input || !input.metrics?.length) {
    return {
      systemHealth: { totalRuns: 0, successfulRuns: 0, failedRuns: 0, successRateLabel: '—' },
      retryStats: { zeroRetryRuns: 0, oneRetryRuns: 0, twoRetryRuns: 0, threeRetryRuns: 0 },
      failureTypes: { items: [] },
      repairTiming: { averageDurationLabel: '—', fastestDurationLabel: '—', slowestDurationLabel: '—' },
      status: 'empty',
    }
  }
  const metrics = input.metrics.map((m) => ({ name: m.name, value: m.value }))
  return {
    systemHealth: mapSystemHealth(metrics, input.runCount ?? 0),
    retryStats: mapRetryStats(metrics),
    failureTypes: mapFailureTypes(metrics),
    repairTiming: mapRepairTiming(metrics),
    status: 'ready',
  }
}
