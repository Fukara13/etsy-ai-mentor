/**
 * HM-5: reviewHero tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRegistry } from '../core/hero.registry'
import { reviewHero } from './review.hero'

describe('reviewHero', () => {
  it('returns valid HeroAdvice shape with expected reasonCodes', async () => {
    const reg = new HeroRegistry()
    reg.register(reviewHero)
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('reviewHero', {
      eventType: 'PR_OPENED',
      input: {},
    })
    const advice = result.metadata?.advice as { reasonCodes: string[] }
    expect(advice.reasonCodes).toContain('PR_REVIEW_REQUESTED')
    expect(result.confidence).toBe(0.9)
  })

  it('returns deterministic fixed values', async () => {
    const reg = new HeroRegistry()
    reg.register(reviewHero)
    const executor = new HeroExecutor(reg)
    const a = await executor.executeByName('reviewHero', {
      eventType: 'PR_OPENED',
      input: {},
    })
    const b = await executor.executeByName('reviewHero', {
      eventType: 'PR_UPDATED',
      input: {},
    })
    expect(a.confidence).toBe(b.confidence)
    expect(a.analysis).toBe(b.analysis)
  })
})
