/**
 * OC-13: Tests for createOperatorDecisionTimelineEntries.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import { DECISION_TIMELINE_STAGES } from './operator-decision-timeline-stage'
import { createOperatorDecisionTimelineEntries } from './create-operator-decision-timeline-entries'

function makeView(overrides: Partial<OperatorAdvisoryView> = {}): OperatorAdvisoryView {
  const bridgePath: OperatorBridgePathAdvisory = {
    hasAdvisory: false,
    source: 'runtime-bridge',
    finalStage: null,
    steps: [],
  }
  const base: OperatorAdvisoryView = {
    hasAdvisory: false,
    source: 'operator-advisory-view',
    advisory: null,
    explainability: { bridgePath },
    status: { visibility: 'empty', explainability: 'empty', consistency: 'empty' },
  }
  return { ...base, ...overrides } as OperatorAdvisoryView
}

describe('createOperatorDecisionTimelineEntries', () => {
  it('returns entries in fixed stage order', () => {
    const view = makeView()
    const entries = createOperatorDecisionTimelineEntries('unknown', view)
    const stages = entries.map((e) => e.stage)
    expect(stages).toEqual([...DECISION_TIMELINE_STAGES])
  })

  it('assigns unknown when currentStage is unknown', () => {
    const view = makeView()
    const entries = createOperatorDecisionTimelineEntries('unknown', view)
    expect(entries.every((e) => e.status === 'unknown')).toBe(true)
  })

  it('assigns completed before current, active at current, not-reached after', () => {
    const view = makeView()
    const entries = createOperatorDecisionTimelineEntries('decision-context-ready', view)
    const byStage = Object.fromEntries(entries.map((e) => [e.stage, e.status]))
    expect(byStage['incident-detected']).toBe('completed')
    expect(byStage['advisory-available']).toBe('completed')
    expect(byStage['decision-context-ready']).toBe('active')
    expect(byStage['operator-review-active']).toBe('not-reached')
    expect(byStage['decision-pending']).toBe('not-reached')
    expect(byStage['decision-resolved']).toBe('not-reached')
  })

  it('sets isDecisionPoint for decision-context-ready, operator-review-active, decision-pending', () => {
    const view = makeView()
    const entries = createOperatorDecisionTimelineEntries('advisory-available', view)
    const decisionPoints = entries.filter((e) => e.isDecisionPoint).map((e) => e.stage)
    expect(decisionPoints).toEqual(['decision-context-ready', 'operator-review-active', 'decision-pending'])
  })

  it('sets entry requiresOperatorAction only when that entry is active and decision point', () => {
    const view = makeView()
    const entries = createOperatorDecisionTimelineEntries('decision-context-ready', view)
    const activeEntry = entries.find((e) => e.stage === 'decision-context-ready')
    expect(activeEntry?.status).toBe('active')
    expect(activeEntry?.requiresOperatorAction).toBe(true)
    const notReached = entries.find((e) => e.stage === 'decision-pending')
    expect(notReached?.requiresOperatorAction).toBe(false)
  })

  it('does not skip any stage', () => {
    const view = makeView()
    const entries = createOperatorDecisionTimelineEntries('decision-resolved', view)
    expect(entries.length).toBe(DECISION_TIMELINE_STAGES.length)
    expect(entries.map((e) => e.order)).toEqual([0, 1, 2, 3, 4, 5])
  })
})
