/**
 * DC-5: Transition history panel.
 */

import { Card, SectionHeader, EmptyState } from '../../ui'
import type { StateNodeView } from '../../../../shared/read-models'
import { buildTransitions } from './state-machine-utils'

type Props = {
  nodes: StateNodeView[]
}

export function StateMachineHistory({ nodes }: Props) {
  const transitions = buildTransitions(nodes)

  return (
    <Card>
      <SectionHeader title="Transition History" />
      {transitions.length === 0 ? (
        <EmptyState message="No transition history available." />
      ) : (
        <ul className="sm-history">
          {transitions.map((t, i) => (
            <li key={i} className="sm-history__item">
              {t.from} → {t.to}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
