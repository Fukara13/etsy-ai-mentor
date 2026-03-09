/**
 * HM-5: analysisHero tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRegistry } from '../core/hero.registry'
import { analysisHero } from './analysis.hero'

describe('analysisHero', () => {
  it('returns valid HeroAdvice shape with expected reasonCodes', async () => {
    const reg = new HeroRegistry()
    reg.register(analysisHero)
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('analysisHero', {
      eventType: 'REPAIR_ANALYSIS_REQUESTED',
      input: {},
    })
    const advice = result.metadata?.advice as { reasonCodes: string[] }
    expect(advice.reasonCodes).toContain('REPAIR_ANALYSIS_REQUESTED')
    expect(result.confidence).toBe(0.8)
  })

  it('returns deterministic fixed values', async () => {
    const reg = new HeroRegistry()
    reg.register(analysisHero)
    const executor = new HeroExecutor(reg)
    const a = await executor.executeByName('analysisHero', {
      eventType: 'x',
      input: {},
    })
    const b = await executor.executeByName('analysisHero', {
      eventType: 'y',
      input: {},
    })
    expect(a.analysis).toBe(b.analysis)
    expect(a.confidence).toBe(b.confidence)
  })
})
