/**
 * DC-8: System Health panel — read-only.
 */

import { Card, SectionHeader, EmptyState } from '../../ui'
import type { SystemHealthViewModel } from '../../../telemetry/telemetry.view-model'

type Props = {
  viewModel: SystemHealthViewModel
  isEmpty: boolean
}

export function SystemHealthPanel({ viewModel, isEmpty }: Props) {
  if (isEmpty) {
    return (
      <Card>
        <SectionHeader title="System Health" />
        <EmptyState message="Henüz telemetri verisi yok" />
      </Card>
    )
  }
  return (
    <Card>
      <SectionHeader title="System Health" />
      <div className="telemetry-panel">
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Total runs</span>
          <span className="telemetry-panel__value">{viewModel.totalRuns}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Successful runs</span>
          <span className="telemetry-panel__value">{viewModel.successfulRuns}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Failed runs</span>
          <span className="telemetry-panel__value">{viewModel.failedRuns}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Success rate</span>
          <span className="telemetry-panel__value">{viewModel.successRateLabel}</span>
        </div>
      </div>
    </Card>
  )
}
