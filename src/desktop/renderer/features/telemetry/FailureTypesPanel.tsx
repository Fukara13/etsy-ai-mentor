/**
 * DC-8: Failure Types panel — read-only.
 */

import { Card, SectionHeader, EmptyState } from '../../ui'
import type { FailureTypesViewModel } from '../../../telemetry/telemetry.view-model'

type Props = {
  viewModel: FailureTypesViewModel
  isEmpty: boolean
}

function formatFailureType(type: string): string {
  return type.replace(/_/g, ' ')
}

export function FailureTypesPanel({ viewModel, isEmpty }: Props) {
  if (isEmpty) {
    return (
      <Card>
        <SectionHeader title="Failure Types" />
        <EmptyState message="Henüz telemetri verisi yok" />
      </Card>
    )
  }
  return (
    <Card>
      <SectionHeader title="Failure Types" />
      <div className="telemetry-panel">
        <ul className="telemetry-panel__list">
          {viewModel.items.map((item, i) => (
            <li key={i} className="telemetry-panel__list-item">
              <span className="telemetry-panel__failure-type">{formatFailureType(item.type)}</span>
              <span className="telemetry-panel__count">{item.count}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
