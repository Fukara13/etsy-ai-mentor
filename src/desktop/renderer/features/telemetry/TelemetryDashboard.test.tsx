/**
 * DC-8: Telemetry Dashboard tests.
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { TelemetryDashboard } from './TelemetryDashboard'

describe('TelemetryDashboard', () => {
  const mockGetTelemetryView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(window as any).desktopApi = {
      read: { getTelemetryView: mockGetTelemetryView },
    }
  })

  afterEach(() => {
    delete (window as any).desktopApi
  })

  it('renders dashboard title', async () => {
    mockGetTelemetryView.mockResolvedValue({
      id: 't1',
      traceId: 't1',
      runCount: 42,
      fromTime: 0,
      toTime: 0,
      metrics: [
        { name: 'total_runs', value: 42, timestamp: 0 },
        { name: 'successful_runs', value: 38, timestamp: 0 },
        { name: 'failed_runs', value: 4, timestamp: 0 },
        { name: 'repair_duration_avg_ms', value: 1240, timestamp: 0 },
      ],
    })

    const { container, findAllByText } = render(<TelemetryDashboard />)
    const titles = await findAllByText('Telemetry Dashboard', { container })
    expect(titles.length).toBeGreaterThanOrEqual(1)
  })

  it('shows 4 panels when data is loaded', async () => {
    mockGetTelemetryView.mockResolvedValue({
      id: 't1',
      traceId: 't1',
      runCount: 42,
      fromTime: 0,
      toTime: 0,
      metrics: [
        { name: 'total_runs', value: 42, timestamp: 0 },
        { name: 'successful_runs', value: 38, timestamp: 0 },
        { name: 'failed_runs', value: 4, timestamp: 0 },
        { name: 'retry_0_runs', value: 28, timestamp: 0 },
        { name: 'retry_1_runs', value: 10, timestamp: 0 },
        { name: 'retry_2_runs', value: 3, timestamp: 0 },
        { name: 'retry_3_runs', value: 1, timestamp: 0 },
        { name: 'failure_test_failure', value: 18, timestamp: 0 },
        { name: 'repair_duration_avg_ms', value: 1240, timestamp: 0 },
        { name: 'repair_duration_min_ms', value: 420, timestamp: 0 },
        { name: 'repair_duration_max_ms', value: 5200, timestamp: 0 },
      ],
    })

    const { container, findAllByText } = render(<TelemetryDashboard />)
    const sysHealth = await findAllByText('System Health', { container })
    const retryStats = await findAllByText('Retry Statistics', { container })
    const failureTypes = await findAllByText('Failure Types', { container })
    const repairTiming = await findAllByText('Repair Timing', { container })
    expect(sysHealth.length).toBeGreaterThanOrEqual(1)
    expect(retryStats.length).toBeGreaterThanOrEqual(1)
    expect(failureTypes.length).toBeGreaterThanOrEqual(1)
    expect(repairTiming.length).toBeGreaterThanOrEqual(1)
  })

  it('shows example metrics when data is loaded', async () => {
    mockGetTelemetryView.mockResolvedValue({
      id: 't1',
      traceId: 't1',
      runCount: 42,
      fromTime: 0,
      toTime: 0,
      metrics: [
        { name: 'total_runs', value: 42, timestamp: 0 },
        { name: 'successful_runs', value: 38, timestamp: 0 },
        { name: 'retry_0_runs', value: 28, timestamp: 0 },
        { name: 'repair_duration_avg_ms', value: 1240, timestamp: 0 },
        { name: 'repair_duration_min_ms', value: 420, timestamp: 0 },
      ],
    })

    const { container, findAllByText } = render(<TelemetryDashboard />)
    const avg = await findAllByText('1.2 s', { container })
    const fast = await findAllByText('420 ms', { container })
    expect(avg.length).toBeGreaterThanOrEqual(1)
    expect(fast.length).toBeGreaterThanOrEqual(1)
  })

  it('shows fallback message when data is null', async () => {
    mockGetTelemetryView.mockResolvedValue(null)

    const { container, findAllByText } = render(<TelemetryDashboard />)
    const els = await findAllByText('Henüz telemetri verisi yok', { container })
    expect(els.length).toBeGreaterThanOrEqual(1)
  })

  it('shows fallback when data has empty metrics', async () => {
    mockGetTelemetryView.mockResolvedValue({
      id: 't1',
      traceId: 't1',
      runCount: 0,
      fromTime: 0,
      toTime: 0,
      metrics: [],
    })

    const { container, findAllByText } = render(<TelemetryDashboard />)
    const els = await findAllByText('Henüz telemetri verisi yok', { container })
    expect(els.length).toBeGreaterThanOrEqual(1)
  })
})
