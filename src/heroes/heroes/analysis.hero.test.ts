/**
 * HM-5 / HM-9: analysisHero tests.
 * Event-based behavior; deterministic advice; no new architecture layers.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { analysisHero } from './analysis.hero'
import type { HeroEvent } from '../selection/hero.events'

function runAnalysisHero(event: HeroEvent) {
  const reg = new HeroRegistry()
  reg.register(analysisHero)
  const executor = new HeroExecutor(reg)
  return executor.executeByName('analysisHero', {
    eventType: event,
    input: {},
  })
}

function getAdvice(event: HeroEvent) {
  return runAnalysisHero(event).then((r) => r.metadata?.advice)
}

describe('analysisHero', () => {
  it('exposes the correct hero name', () => {
    expect(analysisHero.name).toBe('analysisHero')
  })

  it('returns advice for CI_FAILURE', async () => {
    const result = await runAnalysisHero('CI_FAILURE')
    const advice = result.metadata?.advice as { riskLevel: string; needsHumanReview: boolean; confidence: number; reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(advice.riskLevel).toBe('high')
    expect(advice.needsHumanReview).toBe(true)
    expect(advice.confidence).toBeGreaterThan(0)
    expect(advice.reasonCodes).toContain('CI_FAILURE_DETECTED')
  })

  it('returns advice for RETRY_EXHAUSTED', async () => {
    const advice = await getAdvice('RETRY_EXHAUSTED') as { riskLevel: string; reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(advice.riskLevel).toBe('high')
    expect(advice.reasonCodes).toContain('RETRY_LIMIT_EXHAUSTED')
  })

  it('returns advice for PR_OPENED', async () => {
    const advice = await getAdvice('PR_OPENED') as { riskLevel: string; reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(advice.riskLevel).toBe('medium')
    expect(advice.reasonCodes).toContain('PR_SIGNAL_RECEIVED')
  })

  it('returns advice for PR_UPDATED', async () => {
    const advice = await getAdvice('PR_UPDATED') as { riskLevel: string; reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(advice.riskLevel).toBe('medium')
    expect(advice.reasonCodes).toContain('PR_UPDATED_SIGNAL')
  })

  it('returns advice for REPAIR_ANALYSIS_REQUESTED', async () => {
    const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED') as { riskLevel: string; reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(advice.riskLevel).toBe('medium')
    expect(advice.reasonCodes).toContain('EXPLICIT_ANALYSIS_REQUEST')
  })

  it('always requires human review for supported events', async () => {
    const events: HeroEvent[] = [
      'CI_FAILURE',
      'RETRY_EXHAUSTED',
      'PR_OPENED',
      'PR_UPDATED',
      'REPAIR_ANALYSIS_REQUESTED',
    ]
    for (const event of events) {
      const advice = await getAdvice(event) as { needsHumanReview: boolean }
      expect(advice?.needsHumanReview).toBe(true)
    }
  })

  it('returns a new suggestedActions array on each execution', async () => {
    const result1 = await runAnalysisHero('CI_FAILURE')
    const result2 = await runAnalysisHero('CI_FAILURE')
    const advice1 = result1.metadata?.advice as { suggestedActions: unknown[] }
    const advice2 = result2.metadata?.advice as { suggestedActions: unknown[] }
    expect(advice1).toBeDefined()
    expect(advice2).toBeDefined()
    expect(advice1.suggestedActions).not.toBe(advice2.suggestedActions)
  })

  it('returns a new reasonCodes array on each execution', async () => {
    const result1 = await runAnalysisHero('PR_OPENED')
    const result2 = await runAnalysisHero('PR_OPENED')
    const advice1 = result1.metadata?.advice as { reasonCodes: unknown[] }
    const advice2 = result2.metadata?.advice as { reasonCodes: unknown[] }
    expect(advice1).toBeDefined()
    expect(advice2).toBeDefined()
    expect(advice1.reasonCodes).not.toBe(advice2.reasonCodes)
  })

  it('produces deterministic output for the same event', async () => {
    const result1 = await runAnalysisHero('RETRY_EXHAUSTED')
    const result2 = await runAnalysisHero('RETRY_EXHAUSTED')
    expect(result2.analysis).toBe(result1.analysis)
    expect(result2.confidence).toBe(result1.confidence)
    expect((result2.metadata?.advice as { reasonCodes: string[] })?.reasonCodes).toEqual(
      (result1.metadata?.advice as { reasonCodes: string[] })?.reasonCodes
    )
  })

  it('provides at least one suggested action for every supported event', async () => {
    const events: HeroEvent[] = [
      'CI_FAILURE',
      'RETRY_EXHAUSTED',
      'PR_OPENED',
      'PR_UPDATED',
      'REPAIR_ANALYSIS_REQUESTED',
    ]
    for (const event of events) {
      const advice = await getAdvice(event) as { suggestedActions: unknown[] }
      expect(advice?.suggestedActions?.length).toBeGreaterThan(0)
    }
  })

  it('falls back to REPAIR_ANALYSIS_REQUESTED for unknown eventType', async () => {
    const reg = new HeroRegistry()
    reg.register(analysisHero)
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('analysisHero', {
      eventType: 'UNKNOWN_EVENT',
      input: {},
    })
    const advice = result.metadata?.advice as { reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(advice.reasonCodes).toContain('EXPLICIT_ANALYSIS_REQUEST')
  })
})
