/**
 * DC-5: Current state panel.
 */

import { Card, SectionHeader, StatusBadge } from '../../ui'

type Props = {
  currentState: string
  status: string
}

function statusVariant(s: string): 'neutral' | 'success' | 'warning' | 'error' {
  if (s === 'completed') return 'success'
  if (s === 'failed' || s === 'exhausted') return 'error'
  if (s === 'human_required') return 'warning'
  if (s === 'running') return 'neutral'
  return 'neutral'
}

export function StateMachineCurrentState({ currentState, status }: Props) {
  return (
    <Card>
      <SectionHeader title="Current State" />
      <div className="sm-current-state">
        <div className="sm-current-state__state">
          <span className="sm-current-state__label">State</span>
          <StatusBadge label={currentState || '—'} variant={statusVariant(status)} />
        </div>
        <div className="sm-current-state__status">
          <span className="sm-current-state__label">Status</span>
          <StatusBadge label={status} variant={statusVariant(status)} />
        </div>
      </div>
    </Card>
  )
}
