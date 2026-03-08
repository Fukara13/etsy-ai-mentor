/**
 * DC-6: Repair Run Timeline — vertical timeline of repair pipeline stages.
 * Read-only; no mutation.
 */

import { useState, useEffect } from 'react'
import { Card, SectionHeader, EmptyState } from '../../ui'
import { RepairRunTimelineItem } from './repair-run-timeline-item'
import { mapRepairRunToTimeline } from './repair-run-timeline-mapper'
import type { RepairTimelineView } from './repair-run-timeline.types'

type LoadState = 'loading' | 'loaded' | 'error'

export function RepairRunTimeline() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [timeline, setTimeline] = useState<RepairTimelineView | null>(null)

  useEffect(() => {
    const api = window.desktopApi?.read
    if (!api) {
      setLoadState('error')
      return
    }
    Promise.all([
      api.getRepairRunView(),
      api.getStateMachineView(),
      api.getFailureTimelineView(),
    ])
      .then(([repairRun, stateMachine, failureTimeline]) => {
        const view = mapRepairRunToTimeline(repairRun ?? null, stateMachine ?? null, failureTimeline ?? null)
        setTimeline(view)
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [])

  if (loadState === 'loading') {
    return (
      <Card>
        <SectionHeader title="Repair Run Timeline" />
        <p className="rt-timeline__loading">Loading timeline…</p>
      </Card>
    )
  }

  if (loadState === 'error') {
    return (
      <Card>
        <SectionHeader title="Repair Run Timeline" />
        <EmptyState message="Unable to load repair timeline." />
      </Card>
    )
  }

  if (!timeline || timeline.stages.length === 0) {
    return (
      <Card>
        <SectionHeader title="Repair Run Timeline" />
        <EmptyState message="No repair run data available." />
      </Card>
    )
  }

  return (
    <Card>
      <SectionHeader title="Repair Run Timeline" />
      <div className="rt-timeline">
        {timeline.stages.map((stage) => (
          <RepairRunTimelineItem key={stage.id} stage={stage} />
        ))}
      </div>
    </Card>
  )
}
