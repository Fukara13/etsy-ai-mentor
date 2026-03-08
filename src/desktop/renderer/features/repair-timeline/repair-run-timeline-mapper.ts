/**
 * DC-6: Pure mapper from read models to RepairTimelineView.
 * Deterministic, no side effects, no mutation.
 */

import type { RepairRunView, StateMachineView, FailureTimelineView } from '../../../../shared/read-models'
import type { RepairTimelineView, RepairTimelineStage, TimelineStageStatus } from './repair-run-timeline.types'

const STAGE_ORDER: Array<{ id: string; title: string; engineStates: string[] }> = [
  { id: 'ci-failure', title: 'CI Failure', engineStates: [] },
  { id: 'analyzer', title: 'Analyzer', engineStates: ['ANALYZE'] },
  { id: 'repair-coach', title: 'Repair Coach', engineStates: ['COACH'] },
  { id: 'gpt-analysis', title: 'GPT Analysis', engineStates: ['JULES_PENDING'] },
  { id: 'repair-strategy', title: 'Repair Strategy', engineStates: ['GUARDIAN_CHECK', 'EVALUATOR_CHECK'] },
  { id: 'repair-attempt', title: 'Repair Attempt(s)', engineStates: ['CI_RETRY'] },
  { id: 'verdict', title: 'Verdict', engineStates: ['EXHAUSTED'] },
  { id: 'operator-handoff', title: 'Operator Handoff', engineStates: ['HUMAN'] },
]

function toTimelineStatus(
  viewStatus: string,
  isCurrent: boolean,
  stageId: string,
  currentState: string | null,
): TimelineStageStatus {
  if (viewStatus === 'failed' || viewStatus === 'exhausted') {
    if (stageId === 'verdict' || stageId === 'operator-handoff') return 'failed'
    return 'success'
  }
  if (isCurrent) {
    if (stageId === 'operator-handoff' && currentState === 'HUMAN') return 'success'
    return 'running'
  }
  return 'success'
}

function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString()
}

export function mapRepairRunToTimeline(
  repairRun: RepairRunView | null,
  stateMachine: StateMachineView | null,
  failureTimeline: FailureTimelineView | null,
): RepairTimelineView {
  const runId = repairRun?.id ?? stateMachine?.id ?? failureTimeline?.id ?? 'unknown'
  const visitedStates = new Set(stateMachine?.nodes.map((n) => n.label) ?? [])
  const currentState = stateMachine?.currentState ?? null
  const viewStatus = repairRun?.status ?? stateMachine?.status ?? 'idle'
  const nodeByState = new Map(stateMachine?.nodes.map((n) => [n.label, n]) ?? [])

  const stages: RepairTimelineStage[] = STAGE_ORDER.map((stageDef) => {
    const matchedState = stageDef.engineStates.find((s) => visitedStates.has(s))
    const hasVisited = matchedState != null
    const node = matchedState ? nodeByState.get(matchedState) : undefined
    const isCurrent = currentState != null && stageDef.engineStates.includes(currentState)
    const ciFailureVisited = repairRun != null || (failureTimeline?.events?.length ?? 0) > 0

    const effectiveVisited = stageDef.id === 'ci-failure' ? ciFailureVisited : hasVisited

    let status: TimelineStageStatus = 'pending'
    if (effectiveVisited || isCurrent) {
      status = toTimelineStatus(viewStatus, isCurrent, stageDef.id, currentState)
    }

    let timestamp: string | undefined
    if (stageDef.id === 'ci-failure' && (repairRun?.startedAt != null || failureTimeline?.events?.[0]?.timestamp != null)) {
      const ts = repairRun?.startedAt ?? failureTimeline?.events?.[0]?.timestamp
      if (ts != null) timestamp = formatTimestamp(ts)
    } else if (node?.visitedAt != null) {
      timestamp = formatTimestamp(node.visitedAt)
    }

    return {
      id: stageDef.id,
      title: stageDef.title,
      status,
      timestamp,
    }
  })

  return { runId, stages }
}
