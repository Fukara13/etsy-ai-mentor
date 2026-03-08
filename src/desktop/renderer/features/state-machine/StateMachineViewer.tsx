/**
 * DC-5: State Machine Viewer — read-only state visualization.
 * Consumes DC-3 read models via desktopApi.read (DC-4 bridge).
 */

import { useState, useEffect } from 'react'
import { StateMachineCurrentState } from './StateMachineCurrentState'
import { StateMachineHistory } from './StateMachineHistory'
import { StateMachineProgress } from './StateMachineProgress'
import { StateMachineGraph } from './StateMachineGraph'
import { EmptyState } from '../../ui'
import type { StateMachineView } from '../../../../shared/read-models'
import type { RepairRunView } from '../../../../shared/read-models'

type LoadState = 'loading' | 'loaded' | 'error'

export function StateMachineViewer() {
  const [loadState, setLoadState] = useState<LoadState>('loading')
  const [stateMachine, setStateMachine] = useState<StateMachineView | null>(null)
  const [repairRun, setRepairRun] = useState<RepairRunView | null>(null)

  useEffect(() => {
    const api = window.desktopApi?.read
    if (!api) {
      setLoadState('error')
      return
    }
    Promise.all([api.getStateMachineView(), api.getRepairRunView()])
      .then(([sm, rr]) => {
        setStateMachine(sm ?? null)
        setRepairRun(rr ?? null)
        setLoadState('loaded')
      })
      .catch(() => setLoadState('error'))
  }, [])

  if (loadState === 'loading') {
    return (
      <div className="sm-viewer sm-viewer--loading">
        <p>Loading state machine…</p>
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="sm-viewer sm-viewer--error">
        <EmptyState message="Unable to load state machine data." />
      </div>
    )
  }

  if (!stateMachine) {
    return (
      <div className="sm-viewer">
        <EmptyState message="No state machine data available." />
      </div>
    )
  }

  return (
    <div className="sm-viewer">
      <div className="sm-viewer__grid">
        <StateMachineCurrentState currentState={stateMachine.currentState} status={stateMachine.status} />
        <StateMachineProgress stepCount={repairRun?.stepCount} nodesVisited={stateMachine.nodes.length} />
      </div>
      <div className="sm-viewer__grid">
        <StateMachineHistory nodes={stateMachine.nodes} />
        <StateMachineGraph nodes={stateMachine.nodes} />
      </div>
    </div>
  )
}
