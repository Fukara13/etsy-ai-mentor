/**
 * OC-13: Tests for readOperatorDecisionTimeline wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockReadAdvisoryView = vi.fn()
vi.mock('../operator-advisory-view', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../operator-advisory-view')>()
  return {
    ...actual,
    readOperatorAdvisoryView: (...args: unknown[]) => mockReadAdvisoryView(...args),
  }
})

import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import { readOperatorDecisionTimeline } from './read-operator-decision-timeline'

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

describe('readOperatorDecisionTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls readOperatorAdvisoryView and returns OperatorDecisionTimeline', () => {
    mockReadAdvisoryView.mockReturnValue(makeView())

    const timeline = readOperatorDecisionTimeline()

    expect(mockReadAdvisoryView).toHaveBeenCalled()
    expect(timeline).toHaveProperty('hasDecisionContext')
    expect(timeline).toHaveProperty('incidentKey')
    expect(timeline).toHaveProperty('currentStage')
    expect(timeline).toHaveProperty('entries')
    expect(timeline).toHaveProperty('summary')
    expect(timeline).toHaveProperty('requiresOperatorAction')
    expect(timeline.incidentKey).toBeNull()
  })

  it('returns projection with hasDecisionContext when view has advisory', () => {
    const view = makeView({ hasAdvisory: true })
    ;(view as OperatorAdvisoryView).advisory = {
      projection: { source: 'hero-runtime', status: 'completed', advisorySummaries: [] },
    }
    mockReadAdvisoryView.mockReturnValue(view)

    const timeline = readOperatorDecisionTimeline()

    expect(timeline.hasDecisionContext).toBe(true)
  })
})
