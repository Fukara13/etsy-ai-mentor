/**
 * DC-8: Telemetry view mapper tests.
 */

import { describe, it, expect } from 'vitest'
import { mapTelemetryDashboardViewModel } from './telemetry-view.mapper'
import type { TelemetryView } from '../../shared/read-models'

describe('mapTelemetryDashboardViewModel', () => {
  it('maps normal data correctly', () => {
    const input: TelemetryView = {
      id: 't1',
      traceId: 'trace1',
      runCount: 42,
      fromTime: 1709900000,
      toTime: 1709900060,
      metrics: [
        { name: 'total_runs', value: 42, timestamp: 1709900060 },
        { name: 'successful_runs', value: 38, timestamp: 1709900060 },
        { name: 'failed_runs', value: 4, timestamp: 1709900060 },
        { name: 'retry_0_runs', value: 28, timestamp: 1709900060 },
        { name: 'retry_1_runs', value: 10, timestamp: 1709900060 },
        { name: 'retry_2_runs', value: 3, timestamp: 1709900060 },
        { name: 'retry_3_runs', value: 1, timestamp: 1709900060 },
        { name: 'failure_test_failure', value: 18, timestamp: 1709900060 },
        { name: 'failure_build_failure', value: 12, timestamp: 1709900060 },
        { name: 'failure_lint_failure', value: 8, timestamp: 1709900060 },
        { name: 'failure_unknown_failure', value: 4, timestamp: 1709900060 },
        { name: 'repair_duration_avg_ms', value: 1240, timestamp: 1709900060 },
        { name: 'repair_duration_min_ms', value: 420, timestamp: 1709900060 },
        { name: 'repair_duration_max_ms', value: 5200, timestamp: 1709900060 },
      ],
    }
    const out = mapTelemetryDashboardViewModel(input)
    expect(out.status).toBe('ready')
    expect(out.systemHealth.totalRuns).toBe(42)
    expect(out.systemHealth.successfulRuns).toBe(38)
    expect(out.systemHealth.failedRuns).toBe(4)
    expect(out.systemHealth.successRateLabel).toBe('90%')
    expect(out.retryStats.zeroRetryRuns).toBe(28)
    expect(out.retryStats.oneRetryRuns).toBe(10)
    expect(out.retryStats.twoRetryRuns).toBe(3)
    expect(out.retryStats.threeRetryRuns).toBe(1)
    expect(out.failureTypes.items).toHaveLength(4)
    expect(out.failureTypes.items[0]).toEqual({ type: 'test_failure', count: 18 })
    expect(out.repairTiming.averageDurationLabel).toBe('1.2 s')
    expect(out.repairTiming.fastestDurationLabel).toBe('420 ms')
    expect(out.repairTiming.slowestDurationLabel).toBe('5.2 s')
  })

  it('computes success rate correctly', () => {
    const input: TelemetryView = {
      id: 't1',
      traceId: 't1',
      runCount: 10,
      fromTime: 0,
      toTime: 0,
      metrics: [
        { name: 'total_runs', value: 10, timestamp: 0 },
        { name: 'successful_runs', value: 7, timestamp: 0 },
        { name: 'failed_runs', value: 3, timestamp: 0 },
      ],
    }
    const out = mapTelemetryDashboardViewModel(input)
    expect(out.systemHealth.successRateLabel).toBe('70%')
  })

  it('returns safe fallback when input is null', () => {
    const out = mapTelemetryDashboardViewModel(null)
    expect(out.status).toBe('empty')
    expect(out.systemHealth.totalRuns).toBe(0)
    expect(out.systemHealth.successRateLabel).toBe('—')
    expect(out.retryStats.zeroRetryRuns).toBe(0)
    expect(out.failureTypes.items).toEqual([])
    expect(out.repairTiming.averageDurationLabel).toBe('—')
  })

  it('returns safe fallback when metrics is empty', () => {
    const input: TelemetryView = {
      id: 't1',
      traceId: 't1',
      runCount: 0,
      fromTime: 0,
      toTime: 0,
      metrics: [],
    }
    const out = mapTelemetryDashboardViewModel(input)
    expect(out.status).toBe('empty')
    expect(out.systemHealth.totalRuns).toBe(0)
  })

  it('formats duration labels correctly', () => {
    const input: TelemetryView = {
      id: 't1',
      traceId: 't1',
      runCount: 1,
      fromTime: 0,
      toTime: 0,
      metrics: [
        { name: 'repair_duration_avg_ms', value: 500, timestamp: 0 },
        { name: 'repair_duration_min_ms', value: 120, timestamp: 0 },
        { name: 'repair_duration_max_ms', value: 2100, timestamp: 0 },
      ],
    }
    const out = mapTelemetryDashboardViewModel(input)
    expect(out.repairTiming.averageDurationLabel).toBe('500 ms')
    expect(out.repairTiming.fastestDurationLabel).toBe('120 ms')
    expect(out.repairTiming.slowestDurationLabel).toBe('2.1 s')
  })

  it('preserves failure type order and count', () => {
    const input: TelemetryView = {
      id: 't1',
      traceId: 't1',
      runCount: 1,
      fromTime: 0,
      toTime: 0,
      metrics: [
        { name: 'failure_lint_failure', value: 5, timestamp: 0 },
        { name: 'failure_test_failure', value: 3, timestamp: 0 },
      ],
    }
    const out = mapTelemetryDashboardViewModel(input)
    expect(out.failureTypes.items).toEqual([
      { type: 'test_failure', count: 3 },
      { type: 'build_failure', count: 0 },
      { type: 'lint_failure', count: 5 },
      { type: 'unknown_failure', count: 0 },
    ])
  })
})
