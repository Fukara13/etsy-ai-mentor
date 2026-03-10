/**
 * HM-13: refactorHero tests.
 * Deterministic, refactor-focused advice; reasoning-only.
 */

import { describe, it, expect } from 'vitest'
import { HeroRegistry } from '../core/hero.registry'
import { HeroExecutor } from '../core/hero.executor'
import { refactorHero } from './refactor.hero'
import { registerAllHeroes } from './index'

function runRefactorHero(eventType: string) {
  const registry = new HeroRegistry()
  registry.register(refactorHero)
  const executor = new HeroExecutor(registry)
  return executor.executeByName('refactorHero', {
    eventType,
    input: {},
  })
}

async function getAdvice(eventType: string) {
  const result = await runRefactorHero(eventType)
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

describe('refactorHero', () => {
  it('exposes the correct hero name and shape for registry compatibility', () => {
    expect(refactorHero.name).toBe('refactorHero')
    expect(refactorHero.role).toBe('repair')
    expect(typeof refactorHero.run).toBe('function')
  })

  describe('REPAIR_ANALYSIS_REQUESTED', () => {
    it('returns structured advice successfully', async () => {
      const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
      expect(advice).toBeDefined()
      expect(advice.summary.toLowerCase()).toContain('refactor')
      expect(advice.analysis.toLowerCase()).toContain('refactor')
      expect(advice.suggestedActions.length).toBeGreaterThan(0)
    })

    it('has riskLevel medium and confidence 0.78', async () => {
      const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
      expect(advice.riskLevel).toBe('medium')
      expect(advice.confidence).toBeCloseTo(0.78, 5)
    })

    it('includes expected reason codes', async () => {
      const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
      expect(advice.reasonCodes).toEqual(
        expect.arrayContaining([
          'REFACTOR_ANALYSIS_ADVISORY',
          'MAINTAINABILITY_REVIEW_RECOMMENDED',
          'STRUCTURE_SIMPLIFICATION_CANDIDATE',
          'HUMAN_APPROVAL_REQUIRED',
        ])
      )
    })

    it('marks all suggested actions as blockedByHumanApproval and needsHumanReview', async () => {
      const advice = await getAdvice('REPAIR_ANALYSIS_REQUESTED')
      for (const action of advice.suggestedActions) {
        expect(action.blockedByHumanApproval).toBe(true)
      }
      expect(advice.needsHumanReview).toBe(true)
    })
  })

  describe('PR_UPDATED', () => {
    it('returns structured advice successfully', async () => {
      const advice = await getAdvice('PR_UPDATED')
      expect(advice).toBeDefined()
      expect(advice.summary.toLowerCase()).toContain('pr')
      expect(advice.analysis.toLowerCase()).toContain('maintainability')
      expect(advice.suggestedActions.length).toBeGreaterThan(0)
    })

    it('has riskLevel low and confidence 0.72', async () => {
      const advice = await getAdvice('PR_UPDATED')
      expect(advice.riskLevel).toBe('low')
      expect(advice.confidence).toBeCloseTo(0.72, 5)
    })

    it('includes expected reason codes', async () => {
      const advice = await getAdvice('PR_UPDATED')
      expect(advice.reasonCodes).toEqual(
        expect.arrayContaining([
          'PR_REFACTOR_REVIEW_ADVISORY',
          'CHANGE_SURFACE_REVIEW_RECOMMENDED',
          'MAINTAINABILITY_GUARD_RECOMMENDED',
          'HUMAN_APPROVAL_REQUIRED',
        ])
      )
    })

    it('marks all suggested actions as blockedByHumanApproval and needsHumanReview', async () => {
      const advice = await getAdvice('PR_UPDATED')
      for (const action of advice.suggestedActions) {
        expect(action.blockedByHumanApproval).toBe(true)
      }
      expect(advice.needsHumanReview).toBe(true)
    })
  })

  it('rejects unsupported events with Unsupported refactor hero event message', async () => {
    await expect(runRefactorHero('UNKNOWN_EVENT')).rejects.toThrow(
      /Unsupported refactor hero event: UNKNOWN_EVENT/
    )
  })

  it('is registered and exported in index with registerAllHeroes', () => {
    const registry = new HeroRegistry()
    registerAllHeroes(registry)
    const hero = registry.getByName('refactorHero')
    expect(hero).toBeDefined()
    expect(hero?.name).toBe('refactorHero')
  })
})
