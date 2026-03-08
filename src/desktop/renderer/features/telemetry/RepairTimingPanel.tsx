/**
 * DC-8: Repair Timing panel — read-only.
 */

import { Card, SectionHeader, EmptyState } from '../../ui'
import type { RepairTimingViewModel } from '../../../telemetry/telemetry.view-model'

type Props = {
  viewModel: RepairTimingViewModel
  isEmpty: boolean
}

export function RepairTimingPanel({ viewModel, isEmpty }: Props) {
  if (isEmpty) {
    return (
      <Card>
        <SectionHeader title="Repair Timing" />
        <EmptyState message="Henüz telemetri verisi yok" />
      </Card>
    )
  }
  return (
    <Card>
      <SectionHeader title="Repair Timing" />
      <div className="telemetry-panel">
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Average repair duration</span>
          <span className="telemetry-panel__value">{viewModel.averageDurationLabel}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Fastest repair</span>
          <span className="telemetry-panel__value">{viewModel.fastestDurationLabel}</span>
        </div>
        <div className="telemetry-panel__row">
          <span className="telemetry-panel__label">Slowest repair</span>
          <span className="telemetry-panel__value">{viewModel.slowestDurationLabel}</span>
        </div>
      </div>
    </Card>
  )
}
