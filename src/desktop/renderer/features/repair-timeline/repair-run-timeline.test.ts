/**
 * DC-6: Repair Run Timeline mapper tests.
 * Tests mapper logic only; no UI.
 */

import { describe, it, expect } from 'vitest'
import { mapRepairRunToTimeline } from './repair-run-timeline-mapper'
import type { RepairRunView, StateMachineView, FailureTimelineView } from '../../../../shared/read-models'

describe('mapRepairRunToTimeline', () => {
  it('returns deterministic timeline for same inputs', () => {
    const repairRun: RepairRunView = {
      id: 'r1',
      traceId: 't1',
      status: 'completed',
      startedAt: 100,
      completedAt: 200,
      summary: 'Done',
      finalState: 'HUMAN',
      stepCount: 5,
    }
    const stateMachine: StateMachineView = {
      id: 'sm1',
      traceId: 't1',
      currentState: 'HUMAN',
      status: 'completed',
      nodes: [
        { id: 'ANALYZE', label: 'ANALYZE', isCurrent: false, visitedAt: 110 },
        { id: 'COACH', label: 'COACH', isCurrent: false, visitedAt: 120 },
        { id: 'HUMAN', label: 'HUMAN', isCurrent: true, visitedAt: 200 },
      ],
      updatedAt: 200,
    }
    const a = mapRepairRunToTimeline(repairRun, stateMachine, null)
    const b = mapRepairRunToTimeline(repairRun, stateMachine, null)
    expect(a).toEqual(b)
  })

  it('preserves stage order', () => {
    const result = mapRepairRunToTimeline(null, null, null)
    const ids = result.stages.map((s) => s.id)
    expect(ids).toEqual([
      'ci-failure',
      'analyzer',
      'repair-coach',
      'gpt-analysis',
      'repair-strategy',
      'repair-attempt',
      'verdict',
      'operator-handoff',
    ])
  })

  it('maps status correctly for completed run', () => {
    const repairRun: RepairRunView = {
      id: 'r1',
      traceId: 't1',
      status: 'completed',
      startedAt: 100,
      summary: 'Done',
      finalState: 'HUMAN',
    }
    const stateMachine: StateMachineView = {
      id: 'sm1',
      traceId: 't1',
      currentState: 'HUMAN',
      status: 'completed',
      nodes: [
        { id: 'ANALYZE', label: 'ANALYZE', isCurrent: false, visitedAt: 110 },
        { id: 'HUMAN', label: 'HUMAN', isCurrent: true, visitedAt: 200 },
      ],
      updatedAt: 200,
    }
    const result = mapRepairRunToTimeline(repairRun, stateMachine, null)
    const analyzer = result.stages.find((s) => s.id === 'analyzer')
    const handoff = result.stages.find((s) => s.id === 'operator-handoff')
    expect(analyzer?.status).toBe('success')
    expect(handoff?.status).toBe('success')
  })

  it('handles empty read model safely', () => {
    const result = mapRepairRunToTimeline(null, null, null)
    expect(result.runId).toBe('unknown')
    expect(result.stages).toHaveLength(8)
    expect(result.stages.every((s) => s.status === 'pending')).toBe(true)
  })

  it('supports multiple attempts via state machine nodes', () => {
    const stateMachine: StateMachineView = {
      id: 'sm1',
      traceId: 't1',
      currentState: 'CI_RETRY',
      status: 'running',
      nodes: [
        { id: 'ANALYZE', label: 'ANALYZE', isCurrent: false, visitedAt: 100 },
        { id: 'COACH', label: 'COACH', isCurrent: false, visitedAt: 110 },
        { id: 'CI_RETRY', label: 'CI_RETRY', isCurrent: true, visitedAt: 120 },
      ],
      updatedAt: 120,
    }
    const result = mapRepairRunToTimeline(null, stateMachine, null)
    const attemptStage = result.stages.find((s) => s.id === 'repair-attempt')
    expect(attemptStage?.status).toBe('running')
  })
})
