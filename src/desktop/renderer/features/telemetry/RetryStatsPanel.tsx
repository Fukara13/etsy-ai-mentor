/**
 * DC-8: Retry Statistics panel — read-only.
 */

import { Card, SectionHeader, EmptyState } from '../../ui'
import type { RetryStatsViewModel } from '../../../telemetry/telemetry.view-model'

type Props = {
  viewModel: RetryStatsViewModel
  isEmpty: boolean
}

export function RetryStatsPanel({ viewModel, isEmpty }: Props) {
  if (isEmpty) {
    return (
      <Card>
        <SectionHeader title="Retry Statistics" />
        <EmptyState message="Henüz telemetri verisi yok" />
      </Card>
    )
  }
  return (
    <Card>
      <SectionHeader title="Retry Statistics" />
      <div className="telemetry-panel">
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Runs with 0 retry</span>
          <span className="telemetry-panel__value">{viewModel.zeroRetryRuns}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Runs with 1 retry</span>
          <span className="telemetry-panel__value">{viewModel.oneRetryRuns}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Runs with 2 retries</span>
          <span className="telemetry-panel__value">{viewModel.twoRetryRuns}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Runs with 3 retries</span>
          <span className="telemetry-panel__value">{viewModel.threeRetryRuns}</span>
        </div>
      </div>
    </Card>
  )
}
