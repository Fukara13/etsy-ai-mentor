/**
 * HM-12: securityHero tests.
 * Deterministic, security-focused advice; reasoning-only.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { securityHero } from './security.hero'

function runSecurityHero(eventType: string) {
  const registry = new HeroRegistry()
  registry.register(securityHero)
  const executor = new HeroExecutor(registry)
  return executor.executeByName('securityHero', {
    eventType,
    input: {},
  })
}

async function getAdvice(eventType: string) {
  const result = await runSecurityHero(eventType)
  return result.metadata?.advice as {
    summary: string
    analysis: string
    riskLevel: string
    confidence: number
    suggestedActions: {
      actionType: string
      title: string
      description: string
      priority: string
      blockedByHumanApproval: boolean
    }[]
    reasonCodes: string[]
    needsHumanReview: boolean
  }
}

describe('securityHero', () => {
  it('exposes the correct hero name and shape for registry compatibility', () => {
    expect(securityHero.name).toBe('securityHero')
    expect(securityHero.role).toBe('repair')
    expect(typeof securityHero.run).toBe('function')
  })

  it('returns deterministic structured advice for SECURITY_ALERT', async () => {
    const advice = await getAdvice('SECURITY_ALERT')
    expect(advice).toBeDefined()
    expect(advice.summary.toLowerCase()).toContain('security')
    expect(advice.analysis.toLowerCase()).toContain('security')
    expect(advice.riskLevel).toBe('high')
    expect(advice.confidence).toBeCloseTo(0.85, 5)
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(advice.reasonCodes).toEqual(
      expect.arrayContaining([
        'SECURITY_ALERT_DETECTED',
        'SECURITY_REVIEW_RECOMMENDED',
        'HUMAN_VERIFICATION_REQUIRED',
      ])
    )
  })

  it('returns deterministic structured advice for REPAIR_ANALYSIS_REQUESTED', async () => {
    const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
    expect(advice).toBeDefined()
    expect(advice.summary.toLowerCase()).toContain('repair analysis')
    expect(advice.analysis.toLowerCase()).toContain('security')
    expect(advice.riskLevel).toBe('medium')
    expect(advice.confidence).toBeCloseTo(0.75, 5)
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(advice.reasonCodes).toEqual(
      expect.arrayContaining([
        'SECURITY_REPAIR_ANALYSIS_ADVISORY',
        'ADVISORY_ONLY_NOT_EXECUTION_PATH',
        'HUMAN_APPROVAL_REQUIRED',
      ])
    )
  })

  it('marks all suggested actions as blockedByHumanApproval', async () => {
    const events = ['SECURITY_ALERT', 'REPAIR_ANALYSIS_REQUESTED']
    for (const event of events) {
      const advice = await getAdvice(event)
      for (const action of advice.suggestedActions) {
        expect(action.blockedByHumanApproval).toBe(true)
      }
      expect(advice.needsHumanReview).toBe(true)
    }
  })

  it('produces deterministic risk level and confidence for the same event', async () => {
    const first = await getAdvice('SECURITY_ALERT')
    const second = await getAdvice('SECURITY_ALERT')
    expect(first.riskLevel).toBe(second.riskLevel)
    expect(first.confidence).toBeCloseTo(second.confidence, 10)
  })

  it('returns fresh suggestedActions and reasonCodes arrays on each execution', async () => {
    const first = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
    const second = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
    expect(first.suggestedActions).not.toBe(second.suggestedActions)
    expect(first.reasonCodes).not.toBe(second.reasonCodes)
  })

  it('rejects unsupported events consistently with an error', async () => {
    await expect(runSecurityHero('UNKNOWN_EVENT')).rejects.toThrow(
      /Unsupported security hero event/
    )
  })
})
