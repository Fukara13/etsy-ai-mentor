/**
 * DC-6: Single timeline stage item.
 */

import { StatusBadge } from '../../ui'
import type { RepairTimelineStage, TimelineStageStatus } from './repair-run-timeline.types'

function statusVariant(s: TimelineStageStatus): 'neutral' | 'success' | 'warning' | 'error' {
  if (s === 'success') return 'success'
  if (s === 'failed') return 'error'
  if (s === 'running') return 'warning'
  return 'neutral'
}

function StageIcon({ status }: { status: TimelineStageStatus }) {
  const icon = status === 'success' ? '✓' : status === 'failed' ? '✗' : status === 'running' ? '●' : '○'
  return <span className="rt-timeline__icon">{icon}</span>
}

type Props = {
  stage: RepairTimelineStage
}

export function RepairRunTimelineItem({ stage }: Props) {
  return (
    <div className={`rt-timeline__item rt-timeline__item--${stage.status}`}>
      <StageIcon status={stage.status} />
      <div className="rt-timeline__item-content">
        <span className="rt-timeline__item-title">{stage.title}</span>
        <StatusBadge label={stage.status} variant={statusVariant(stage.status)} />
        {stage.timestamp ? (
          <span className="rt-timeline__item-timestamp">{stage.timestamp}</span>
        ) : null}
      </div>
    </div>
  )
}
