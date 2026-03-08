/**
 * DC-5: State Machine Viewer utils tests.
 */

import { describe, it, expect } from 'vitest'
import { buildTransitions } from './state-machine-utils'
import type { StateNodeView } from '../../../../shared/read-models'

describe('buildTransitions', () => {
  it('returns empty array when no nodes', () => {
    expect(buildTransitions([])).toEqual([])
  })

  it('returns empty array when one node', () => {
    const nodes: StateNodeView[] = [{ id: 'A', label: 'A', isCurrent: true, visitedAt: 100 }]
    expect(buildTransitions(nodes)).toEqual([])
  })

  it('builds ordered transitions from nodes', () => {
    const nodes: StateNodeView[] = [
      { id: 'IDLE', label: 'IDLE', isCurrent: false, visitedAt: 100 },
      { id: 'ANALYZE', label: 'ANALYZE', isCurrent: false, visitedAt: 110 },
      { id: 'HUMAN', label: 'HUMAN', isCurrent: true, visitedAt: 200 },
    ]
    expect(buildTransitions(nodes)).toEqual([
      { from: 'IDLE', to: 'ANALYZE' },
      { from: 'ANALYZE', to: 'HUMAN' },
    ])
  })

  it('sorts by visitedAt before building transitions', () => {
    const nodes: StateNodeView[] = [
      { id: 'B', label: 'B', isCurrent: false, visitedAt: 200 },
      { id: 'A', label: 'A', isCurrent: false, visitedAt: 100 },
    ]
    expect(buildTransitions(nodes)).toEqual([{ from: 'A', to: 'B' }])
  })

  it('excludes nodes without visitedAt', () => {
    const nodes: StateNodeView[] = [
      { id: 'A', label: 'A', isCurrent: false, visitedAt: 100 },
      { id: 'B', label: 'B', isCurrent: true },
    ]
    expect(buildTransitions(nodes)).toEqual([])
  })
})
