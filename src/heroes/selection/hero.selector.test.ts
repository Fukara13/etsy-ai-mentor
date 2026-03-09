/**
 * HM-3: HeroSelector tests. Deterministic routing.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroSelector } from './hero.selector'
import type { Hero, HeroContext } from '../core/hero.types'

function createMockHero(name: string, role: Hero['role']): Hero {
  return {
    name,
    role,
    run: (ctx: HeroContext) => ({
      heroName: name,
      role,
      analysis: 'Analysis',
      recommendations: [],
      confidence: 0.8,
    }),
  }
}

function registerRequiredHeroes(reg: HeroRegistry): void {
  reg.register(createMockHero('ciFailureHero', 'repair'))
  reg.register(createMockHero('escalationHero', 'repair'))
  reg.register(createMockHero('reviewHero', 'architect'))
  reg.register(createMockHero('analysisHero', 'repair'))
}

describe('HeroSelector', () => {
  it('CI_FAILURE selects ciFailureHero', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    const result = selector.select('CI_FAILURE')
    expect(result.selectedHeroId).toBe('ciFailureHero')
    expect(result.event).toBe('CI_FAILURE')
  })

  it('RETRY_EXHAUSTED selects escalationHero', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    const result = selector.select('RETRY_EXHAUSTED')
    expect(result.selectedHeroId).toBe('escalationHero')
    expect(result.event).toBe('RETRY_EXHAUSTED')
  })

  it('PR_OPENED selects reviewHero', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    const result = selector.select('PR_OPENED')
    expect(result.selectedHeroId).toBe('reviewHero')
    expect(result.event).toBe('PR_OPENED')
  })

  it('PR_UPDATED selects reviewHero', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    const result = selector.select('PR_UPDATED')
    expect(result.selectedHeroId).toBe('reviewHero')
    expect(result.event).toBe('PR_UPDATED')
  })

  it('REPAIR_ANALYSIS_REQUESTED selects analysisHero', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    const result = selector.select('REPAIR_ANALYSIS_REQUESTED')
    expect(result.selectedHeroId).toBe('analysisHero')
    expect(result.event).toBe('REPAIR_ANALYSIS_REQUESTED')
  })

  it('same event always returns the same selection result', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    const a = selector.select('PR_OPENED')
    const b = selector.select('PR_OPENED')
    expect(a).toEqual(b)
    expect(a.selectedHeroId).toBe('reviewHero')
  })

  it('unknown event throws explicit error', () => {
    const reg = new HeroRegistry()
    registerRequiredHeroes(reg)
    const selector = new HeroSelector(reg)
    expect(() => selector.select('UNKNOWN_EVENT' as 'PR_OPENED')).toThrow(
      /Unknown hero event/
    )
  })

  it('mapped hero missing in registry throws explicit error', () => {
    const reg = new HeroRegistry()
    reg.register(createMockHero('ciFailureHero', 'repair'))
    reg.register(createMockHero('escalationHero', 'repair'))
    reg.register(createMockHero('analysisHero', 'repair'))
    // reviewHero not registered
    const selector = new HeroSelector(reg)
    expect(() => selector.select('PR_OPENED')).toThrow(
      /Selected hero is not registered/
    )
  })
})
