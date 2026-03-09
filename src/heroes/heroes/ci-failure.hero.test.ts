/**
 * HM-5: ciFailureHero tests.
 */

import { describe, it, expect } from 'vitest'
import { HeroExecutor } from '../core/hero.executor'
import { HeroRegistry } from '../core/hero.registry'
import { ciFailureHero } from './ci-failure.hero'

describe('ciFailureHero', () => {
  it('returns valid HeroAdvice shape via executor', async () => {
    const reg = new HeroRegistry()
    reg.register(ciFailureHero)
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('ciFailureHero', {
      eventType: 'CI_FAILURE',
      input: {},
    })
    expect(result.analysis).toBeTruthy()
    expect(result.recommendations).toBeInstanceOf(Array)
    expect(result.confidence).toBe(0.85)
    const advice = result.metadata?.advice as {
      summary: string
      analysis: string
      riskLevel: string
      suggestedActions: unknown[]
      confidence: number
      needsHumanReview: boolean
      reasonCodes: string[]
    }
    expect(advice.summary).toBeTruthy()
    expect(advice.riskLevel).toBe('medium')
    expect(advice.needsHumanReview).toBe(true)
    expect(advice.reasonCodes).toContain('CI_FAILURE_DETECTED')
  })

  it('returns deterministic fixed values', async () => {
    const reg = new HeroRegistry()
    reg.register(ciFailureHero)
    const executor = new HeroExecutor(reg)
    const a = await executor.executeByName('ciFailureHero', {
      eventType: 'x',
      input: {},
    })
    const b = await executor.executeByName('ciFailureHero', {
      eventType: 'y',
      input: {},
    })
    expect(a.confidence).toBe(b.confidence)
    expect(a.analysis).toBe(b.analysis)
    expect((a.metadata?.advice as { reasonCodes: string[] }).reasonCodes).toEqual(
      (b.metadata?.advice as { reasonCodes: string[] }).reasonCodes
    )
  })
})
