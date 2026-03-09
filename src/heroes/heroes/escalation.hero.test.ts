/**
 * HM-5: escalationHero tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRegistry } from '../core/hero.registry'
import { escalationHero } from './escalation.hero'

describe('escalationHero', () => {
  it('returns valid HeroAdvice shape with expected reasonCodes', async () => {
    const reg = new HeroRegistry()
    reg.register(escalationHero)
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('escalationHero', {
      eventType: 'RETRY_EXHAUSTED',
      input: {},
    })
    const advice = result.metadata?.advice as {
      riskLevel: string
      reasonCodes: string[]
    }
    expect(advice.reasonCodes).toContain('RETRY_EXHAUSTED')
    expect(advice.riskLevel).toBe('critical')
    expect(result.confidence).toBe(0.95)
  })

  it('returns deterministic fixed values', async () => {
    const reg = new HeroRegistry()
    reg.register(escalationHero)
    const executor = new HeroExecutor(reg)
    const a = await executor.executeByName('escalationHero', {
      eventType: 'x',
      input: {},
    })
    const b = await executor.executeByName('escalationHero', {
      eventType: 'y',
      input: {},
    })
    expect(a.analysis).toBe(b.analysis)
    expect(a.confidence).toBe(b.confidence)
  })
})
