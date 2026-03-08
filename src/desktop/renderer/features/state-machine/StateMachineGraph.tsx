/**
 * DC-5: Simple visual state graph / flow.
 * Node sequence with active state highlighted.
 */

import { Card, SectionHeader, EmptyState } from '../../ui'
import type { StateNodeView } from '../../../../shared/read-models'

type Props = {
  nodes: StateNodeView[]
}

export function StateMachineGraph({ nodes }: Props) {
  const sorted = [...nodes].filter((n) => n.visitedAt != null).sort((a, b) => (a.visitedAt ?? 0) - (b.visitedAt ?? 0))

  if (sorted.length === 0) {
    return (
      <Card>
        <SectionHeader title="State Flow" />
        <EmptyState message="No state flow data available." />
      </Card>
    )
  }

  return (
    <Card>
      <SectionHeader title="State Flow" />
      <div className="sm-graph">
        {sorted.map((node, i) => (
          <div key={node.id} className="sm-graph__flow">
            <span className={`sm-graph__node ${node.isCurrent ? 'sm-graph__node--active' : ''}`}>{node.label}</span>
            {i < sorted.length - 1 ? <span className="sm-graph__arrow">→</span> : null}
          </div>
        ))}
      </div>
    </Card>
  )
}
