/**
 * DC-8: Telemetry Dashboard — read-only.
 * No mutation, no execution controls.
 */

import { useState, useEffect } from 'react'
import { mapTelemetryDashboardViewModel } from '../../../telemetry/telemetry-view.mapper'
import type { TelemetryDashboardViewModel } from '../../../telemetry/telemetry.view-model'
import { SystemHealthPanel } from './SystemHealthPanel'
import { RetryStatsPanel } from './RetryStatsPanel'
import { FailureTypesPanel } from './FailureTypesPanel'
import { RepairTimingPanel } from './RepairTimingPanel'

type LoadState = 'loading' | 'loaded' | 'error'

export function TelemetryDashboard() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [viewModel, setViewModel] = useState<TelemetryDashboardViewModel | null>(null)

  useEffect(() => {
    const api = window.desktopApi?.read
    if (!api) {
      setLoadState('error')
      return
    }
    api
      .getTelemetryView()
      .then((data) => {
        setViewModel(mapTelemetryDashboardViewModel(data ?? null))
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [])

  if (loadState === 'loading') {
    return (
      <section className="telemetry-dashboard" aria-label="Telemetry Dashboard">
        <h2 className="telemetry-dashboard__title">Telemetry Dashboard</h2>
        <p className="telemetry-dashboard__loading">Loading telemetry…</p>
      </section>
    )
  }

  if (loadState === 'error') {
    return (
      <section className="telemetry-dashboard" aria-label="Telemetry Dashboard">
        <h2 className="telemetry-dashboard__title">Telemetry Dashboard</h2>
        <p className="telemetry-dashboard__empty">Unable to load telemetry.</p>
      </section>
    )
  }

  const isEmpty = !viewModel || viewModel.status === 'empty'
  const vm = viewModel ?? {
    systemHealth: { totalRuns: 0, successfulRuns: 0, failedRuns: 0, successRateLabel: '—' },
    retryStats: { zeroRetryRuns: 0, oneRetryRuns: 0, twoRetryRuns: 0, threeRetryRuns: 0 },
    failureTypes: { items: [] },
    repairTiming: { averageDurationLabel: '—', fastestDurationLabel: '—', slowestDurationLabel: '—' },
    status: 'empty' as const,
  }

  return (
    <section className="telemetry-dashboard" aria-label="Telemetry Dashboard">
      <h2 className="telemetry-dashboard__title">Telemetry Dashboard</h2>
      <div className="telemetry-dashboard__grid">
        <SystemHealthPanel viewModel={vm.systemHealth} isEmpty={isEmpty} />
        <RetryStatsPanel viewModel={vm.retryStats} isEmpty={isEmpty} />
        <FailureTypesPanel viewModel={vm.failureTypes} isEmpty={isEmpty} />
        <RepairTimingPanel viewModel={vm.repairTiming} isEmpty={isEmpty} />
      </div>
    </section>
  )
}
