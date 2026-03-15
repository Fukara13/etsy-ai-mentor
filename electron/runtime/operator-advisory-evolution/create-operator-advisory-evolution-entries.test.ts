/**
 * OC-12: Tests for createOperatorAdvisoryEvolutionEntries.
 */

import { describe, it, expect } from 'vitest'
import type { OperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorBridgePathAdvisory } from '../operator-bridge-path'
import { ADVISORY_EVOLUTION_STAGES } from './operator-advisory-evolution-stage'
import { createOperatorAdvisoryEvolutionEntries } from './create-operator-advisory-evolution-entries'

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

describe('createOperatorAdvisoryEvolutionEntries', () => {
  it('returns entries in fixed stage order', () => {
    const view = makeView()
    const entries = createOperatorAdvisoryEvolutionEntries(null, view)
    const stages = entries.map((e) => e.stage)
    expect(stages).toEqual([...ADVISORY_EVOLUTION_STAGES])
  })

  it('assigns unknown when currentStage is null', () => {
    const view = makeView()
    const entries = createOperatorAdvisoryEvolutionEntries(null, view)
    expect(entries.every((e) => e.status === 'unknown')).toBe(true)
  })

  it('assigns completed before current, active at current, not-reached after', () => {
    const view = makeView()
    const entries = createOperatorAdvisoryEvolutionEntries('bridge-path-derived', view)
    const byStage = Object.fromEntries(entries.map((e) => [e.stage, e.status]))
    expect(byStage['hero-analysis']).toBe('completed')
    expect(byStage['governance-evaluated']).toBe('completed')
    expect(byStage['bridge-path-derived']).toBe('active')
    expect(byStage['advisory-generated']).toBe('not-reached')
    expect(byStage['operator-view-ready']).toBe('not-reached')
  })

  it('gives deterministic headlines and details', () => {
    const view = makeView()
    const entries = createOperatorAdvisoryEvolutionEntries('hero-analysis', view)
    const hero = entries.find((e) => e.stage === 'hero-analysis')
    expect(hero?.headline).toContain('Hero analysis')
    expect(hero?.detail).toBe('Hero reasoning or summary exists.')
  })

  it('does not skip any stage', () => {
    const view = makeView()
    const entries = createOperatorAdvisoryEvolutionEntries('operator-view-ready', view)
    expect(entries.length).toBe(ADVISORY_EVOLUTION_STAGES.length)
    expect(entries.map((e) => e.order)).toEqual([0, 1, 2, 3, 4])
  })
})
