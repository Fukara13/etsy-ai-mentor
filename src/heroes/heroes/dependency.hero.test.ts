/**
 * HM-11: dependencyHero tests.
 * Deterministic, dependency-focused advice; reasoning-only.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { dependencyHero } from './dependency.hero'

function runDependencyHero(eventType: string) {
  const registry = new HeroRegistry()
  registry.register(dependencyHero)
  const executor = new HeroExecutor(registry)
  return executor.executeByName('dependencyHero', {
    eventType,
    input: {},
  })
}

async function getAdvice(eventType: string) {
  const result = await runDependencyHero(eventType)
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

describe('dependencyHero', () => {
  it('is registered with the correct name', () => {
    expect(dependencyHero.name).toBe('dependencyHero')
  })

  it('supports DEPENDENCY_ALERT by returning structured advice', async () => {
    const advice = await getAdvice('DEPENDENCY_ALERT')
    expect(advice).toBeDefined()
    expect(advice.summary.toLowerCase()).toContain('dependency')
    expect(advice.analysis.toLowerCase()).toContain('dependency')
    expect(advice.riskLevel).toBe('medium')
    expect(advice.confidence).toBeCloseTo(0.82, 5)
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(advice.reasonCodes).toEqual(
      expect.arrayContaining([
        'DEPENDENCY_ALERT_DETECTED',
        'VERSION_ALIGNMENT_REVIEW_RECOMMENDED',
        'LOCKFILE_VALIDATION_RECOMMENDED',
      ])
    )
  })

  it('supports REPAIR_ANALYSIS_REQUESTED with dependency-focused repair analysis', async () => {
    const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
    expect(advice).toBeDefined()
    expect(advice.summary.toLowerCase()).toContain('repair analysis')
    expect(advice.analysis.toLowerCase()).toContain('dependency state')
    expect(advice.riskLevel).toBe('medium')
    expect(advice.confidence).toBeGreaterThan(0)
    expect(advice.confidence).toBeLessThanOrEqual(1)
    expect(advice.suggestedActions.length).toBeGreaterThan(0)
    expect(advice.reasonCodes).toEqual(
      expect.arrayContaining([
        'DEPENDENCY_REPAIR_ANALYSIS_REQUESTED',
        'CLEAN_INSTALL_RECOMMENDED',
        'PEER_DEPENDENCY_REVIEW_RECOMMENDED',
      ])
    )
  })

  it('marks all suggested actions as blockedByHumanApproval', async () => {
    const events = ['DEPENDENCY_ALERT', 'REPAIR_ANALYSIS_REQUESTED']
    for (const event of events) {
      const advice = await getAdvice(event)
      for (const action of advice.suggestedActions) {
        expect(action.blockedByHumanApproval).toBe(true)
      }
      expect(advice.needsHumanReview).toBe(true)
    }
  })

  it('produces deterministic risk level and confidence for the same event', async () => {
    const first = await getAdvice('DEPENDENCY_ALERT')
    const second = await getAdvice('DEPENDENCY_ALERT')
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
    await expect(runDependencyHero('UNKNOWN_EVENT')).rejects.toThrow(
      /Unsupported dependency hero event/
    )
  })
})

