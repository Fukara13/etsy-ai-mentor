/**
 * OC-12: Tests for readOperatorAdvisoryEvolutionTimeline wiring.
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
import { readOperatorAdvisoryEvolutionTimeline } from './read-operator-advisory-evolution-timeline'

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

describe('readOperatorAdvisoryEvolutionTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls readOperatorAdvisoryView and returns OperatorAdvisoryEvolutionTimeline', () => {
    mockReadAdvisoryView.mockReturnValue(makeView())

    const timeline = readOperatorAdvisoryEvolutionTimeline()

    expect(mockReadAdvisoryView).toHaveBeenCalled()
    expect(timeline).toHaveProperty('hasAdvisory')
    expect(timeline).toHaveProperty('incidentKey')
    expect(timeline).toHaveProperty('currentStage')
    expect(timeline).toHaveProperty('entries')
    expect(timeline).toHaveProperty('summary')
    expect(timeline.incidentKey).toBeNull()
  })

  it('returns projection with hasAdvisory true when view has advisory', () => {
    const view = makeView({ hasAdvisory: true })
    ;(view as OperatorAdvisoryView).advisory = {
      projection: { source: 'hero-runtime', status: 'completed', advisorySummaries: [] },
    }
    mockReadAdvisoryView.mockReturnValue(view)

    const timeline = readOperatorAdvisoryEvolutionTimeline()

    expect(timeline.hasAdvisory).toBe(true)
  })
})
