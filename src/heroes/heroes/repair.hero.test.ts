/**
 * HM-10: repairHero tests.
 * Deterministic, repair-focused advice; no new architecture layers.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { repairHero } from './repair.hero'
import type { HeroEvent } from '../selection/hero.events'

function runRepairHero(event: HeroEvent) {
  const reg = new HeroRegistry()
  reg.register(repairHero)
  const executor = new HeroExecutor(reg)
  return executor.executeByName('repairHero', {
    eventType: event,
    input: {},
  })
}

function getAdvice(event: HeroEvent) {
  return runRepairHero(event).then((r) => r.metadata?.advice)
}

describe('repairHero', () => {
  it('exposes the correct hero name', () => {
    expect(repairHero.name).toBe('repairHero')
  })

  it('CI_FAILURE returns deterministic repair advice', async () => {
    const result = await runRepairHero('CI_FAILURE')
    expect(result.analysis).toBeTruthy()
    expect(result.recommendations).toBeInstanceOf(Array)
    const advice = result.metadata?.advice as {
      analysis: string
      riskLevel: string
      suggestedActions: unknown[]
      confidence: number
      reasonCodes: string[]
      needsHumanReview: boolean
    }
    expect(advice).toBeDefined()
    expect(advice.analysis).toContain('CI pipeline is failing')
    expect(advice.riskLevel === 'medium' || advice.riskLevel === 'high').toBe(true)
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(advice.confidence).toBeGreaterThan(0)
    expect(advice.confidence).toBeLessThanOrEqual(1)
    expect(advice.needsHumanReview).toBe(true)
  })

  it('RETRY_EXHAUSTED returns escalation-style repair advice', async () => {
    const advice = (await getAdvice('RETRY_EXHAUSTED')) as {
      analysis: string
      riskLevel: string
      suggestedActions: { title: string; description: string }[]
      reasonCodes: string[]
    }
    expect(advice).toBeDefined()
    expect(advice.analysis).toContain('Automated retries have been exhausted')
    expect(['high', 'critical']).toContain(advice.riskLevel)
    expect(advice.suggestedActions.some((a) => a.title.toLowerCase().includes('manual'))).toBe(
      true
    )
    expect(
      advice.suggestedActions.some((a) => a.title.toLowerCase().includes('retry'))
    ).toBe(true)
    expect(advice.reasonCodes.length).toBeGreaterThan(0)
  })

  it('REPAIR_ANALYSIS_REQUESTED returns generic repair planning advice', async () => {
    const advice = (await getAdvice('REPAIR_ANALYSIS_REQUESTED')) as {
      analysis: string
      suggestedActions: { title: string; description: string }[]
      riskLevel: string
    }
    expect(advice).toBeDefined()
    expect(advice.analysis).toContain('A repair analysis has been requested')
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(
      advice.suggestedActions.some((a) =>
        a.title.toLowerCase().includes('root cause')
      )
    ).toBe(true)
    expect(advice.riskLevel).toBe('medium')
  })

  it('produces deterministic output for the same event', async () => {
    const a = await runRepairHero('CI_FAILURE')
    const b = await runRepairHero('CI_FAILURE')
    const aAdvice = a.metadata?.advice as { analysis: string; confidence: number; reasonCodes: string[] }
    const bAdvice = b.metadata?.advice as { analysis: string; confidence: number; reasonCodes: string[] }
    expect(a.analysis).toBe(b.analysis)
    expect(aAdvice.confidence).toBe(bAdvice.confidence)
    expect(aAdvice.reasonCodes).toEqual(bAdvice.reasonCodes)
  })

  it('returns a new suggestedActions and reasonCodes array on each execution', async () => {
    const first = await runRepairHero('REPAIR_ANALYSIS_REQUESTED')
    const second = await runRepairHero('REPAIR_ANALYSIS_REQUESTED')
    const aAdvice = first.metadata?.advice as {
      suggestedActions: unknown[]
      reasonCodes: unknown[]
    }
    const bAdvice = second.metadata?.advice as {
      suggestedActions: unknown[]
      reasonCodes: unknown[]
    }
    expect(aAdvice.suggestedActions).not.toBe(bAdvice.suggestedActions)
    expect(aAdvice.reasonCodes).not.toBe(bAdvice.reasonCodes)
  })

  it('falls back to REPAIR_ANALYSIS_REQUESTED for unknown eventType', async () => {
    const reg = new HeroRegistry()
    reg.register(repairHero)
    const executor = new HeroExecutor(reg)
    const result = await executor.executeByName('repairHero', {
      eventType: 'UNKNOWN_EVENT',
      input: {},
    })
    const advice = result.metadata?.advice as { reasonCodes: string[] }
    expect(advice).toBeDefined()
    expect(
      advice.reasonCodes.includes('REPAIR_PLANNING_REQUESTED') ||
        advice.reasonCodes.includes('SAFE_MANUAL_REPAIR_PATH_RECOMMENDED')
    ).toBe(true)
  })
})

