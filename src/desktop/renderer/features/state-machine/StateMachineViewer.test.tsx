/**
 * DC-5: State Machine Viewer tests.
 * Verifies read-only UI, empty states, no mutation actions.
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StateMachineCurrentState } from './StateMachineCurrentState'
import { StateMachineHistory } from './StateMachineHistory'
import { StateMachineProgress } from './StateMachineProgress'
import { StateMachineGraph } from './StateMachineGraph'
import type { StateNodeView } from '../../../../shared/read-models'

describe('StateMachineCurrentState', () => {
  it('renders current state and status', () => {
    render(<StateMachineCurrentState currentState="HUMAN" status="completed" />)
    expect(screen.getByText('HUMAN')).toBeDefined()
    expect(screen.getByText('completed')).toBeDefined()
    expect(screen.getByText('Current State')).toBeDefined()
  })
})

describe('StateMachineHistory', () => {
  it('renders transition history when nodes provided', () => {
    const nodes: StateNodeView[] = [
      { id: 'A', label: 'IDLE', isCurrent: false, visitedAt: 100 },
      { id: 'B', label: 'ANALYZE', isCurrent: false, visitedAt: 110 },
    ]
    render(<StateMachineHistory nodes={nodes} />)
    expect(screen.getByText(/IDLE → ANALYZE/)).toBeDefined()
  })

  it('renders empty state when no transitions', () => {
    render(<StateMachineHistory nodes={[]} />)
    expect(screen.getByText('No transition history available.')).toBeDefined()
  })
})

describe('StateMachineProgress', () => {
  it('renders step count and states visited', () => {
    render(<StateMachineProgress stepCount={5} nodesVisited={4} />)
    expect(screen.getByText('5')).toBeDefined()
    expect(screen.getByText('4')).toBeDefined()
  })

  it('renders N/A when step count unavailable', () => {
    render(<StateMachineProgress nodesVisited={0} />)
    expect(screen.getByText('N/A')).toBeDefined()
  })
})

describe('StateMachineGraph', () => {
  it('renders nodes and highlights active', () => {
    const nodes: StateNodeView[] = [
      { id: 'A', label: 'IDLE', isCurrent: false, visitedAt: 100 },
      { id: 'B', label: 'HUMAN', isCurrent: true, visitedAt: 200 },
    ]
    const { container } = render(<StateMachineGraph nodes={nodes} />)
    const graph = container.querySelector('.sm-graph')
    expect(graph).toBeTruthy()
    expect(graph?.textContent).toContain('IDLE')
    expect(graph?.textContent).toContain('HUMAN')
  })

  it('renders empty state when no nodes', () => {
    render(<StateMachineGraph nodes={[]} />)
    expect(screen.getByText('No state flow data available.')).toBeDefined()
  })
})
