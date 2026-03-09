/**
 * HM-6: Projection mapper tests.
 */

import { describe, it, expect } from 'vitest'
import { mapHeroPipelineResultToReadModel } from './hero.projection-mapper'
import type { HeroPipelineResult } from '../pipeline/hero.pipeline-result'

function pipelineResult(overrides: Partial<HeroPipelineResult>): HeroPipelineResult {
  return {
    event: 'CI_FAILURE',
    selectedHeroId: 'ciFailureHero',
    executionResult: {
      heroName: 'ciFailureHero',
      role: 'repair',
      contextEvent: 'CI_FAILURE',
      analysis: 'Analysis text',
      recommendations: ['R1'],
      confidence: 0.85,
    },
    ...overrides,
  }
}

describe('mapHeroPipelineResultToReadModel', () => {
  it('maps fields correctly when advice is present', () => {
    const result = pipelineResult({
      executionResult: {
        heroName: 'ciFailureHero',
        role: 'repair',
        contextEvent: 'CI_FAILURE',
        analysis: 'Analysis',
        recommendations: ['R1'],
        confidence: 0.9,
        advice: {
          summary: 'Summary',
          analysis: 'Analysis',
          riskLevel: 'high',
          suggestedActions: [
            {
              actionType: 'review',
              title: 'Review',
              description: 'Desc',
              priority: 'high',
              blockedByHumanApproval: true,
            },
          ],
          confidence: 0.9,
          needsHumanReview: true,
          reasonCodes: ['CI_FAILURE_DETECTED'],
        },
      },
    })

    const read = mapHeroPipelineResultToReadModel(result)

    expect(read.status).toBe('completed')
    expect(read.event).toBe('CI_FAILURE')
    expect(read.heroId).toBe('ciFailureHero')
    expect(read.summary).toBe('Summary')
    expect(read.analysis).toBe('Analysis')
    expect(read.riskLevel).toBe('high')
    expect(read.confidence).toBe(0.9)
    expect(read.needsHumanReview).toBe(true)
    expect(read.reasonCodes).toEqual(['CI_FAILURE_DETECTED'])
    expect(read.suggestedActions).toHaveLength(1)
    expect(read.suggestedActions[0].title).toBe('Review')
  })

  it('returns status no_advice when advice is missing', () => {
    const result = pipelineResult({
      executionResult: {
        heroName: 'ciFailureHero',
        role: 'repair',
        contextEvent: 'CI_FAILURE',
        analysis: 'Ok',
        recommendations: [],
        confidence: 0.8,
      },
    })

    const read = mapHeroPipelineResultToReadModel(result)

    expect(read.status).toBe('no_advice')
    expect(read.event).toBe('CI_FAILURE')
    expect(read.heroId).toBe('ciFailureHero')
    expect(read.summary).toBe('')
    expect(read.analysis).toBe('')
    expect(read.suggestedActions).toEqual([])
    expect(read.reasonCodes).toEqual([])
  })

  it('preserves event and heroId in all cases', () => {
    const withAdvice = pipelineResult({
      event: 'PR_OPENED',
      selectedHeroId: 'reviewHero',
      executionResult: {
        heroName: 'reviewHero',
        role: 'architect',
        contextEvent: 'PR_OPENED',
        analysis: 'X',
        recommendations: [],
        confidence: 0.5,
        advice: {
          summary: 'S',
          analysis: 'A',
          riskLevel: 'low',
          suggestedActions: [],
          confidence: 0.5,
          needsHumanReview: false,
          reasonCodes: [],
        },
      },
    })
    const withoutAdvice = pipelineResult({
      event: 'RETRY_EXHAUSTED',
      selectedHeroId: 'escalationHero',
      executionResult: {
        heroName: 'escalationHero',
        role: 'repair',
        contextEvent: 'RETRY_EXHAUSTED',
        analysis: '',
        recommendations: [],
        confidence: 0,
      },
    })

    expect(mapHeroPipelineResultToReadModel(withAdvice).event).toBe('PR_OPENED')
    expect(mapHeroPipelineResultToReadModel(withAdvice).heroId).toBe('reviewHero')
    expect(mapHeroPipelineResultToReadModel(withoutAdvice).event).toBe(
      'RETRY_EXHAUSTED'
    )
    expect(mapHeroPipelineResultToReadModel(withoutAdvice).heroId).toBe(
      'escalationHero'
    )
  })

  it('does not mutate input object', () => {
    const result = pipelineResult({
      executionResult: {
        heroName: 'x',
        role: 'repair',
        contextEvent: 'CI_FAILURE',
        analysis: 'A',
        recommendations: [],
        confidence: 0.8,
        advice: {
          summary: 'S',
          analysis: 'A',
          riskLevel: 'medium',
          suggestedActions: [],
          confidence: 0.8,
          needsHumanReview: true,
          reasonCodes: ['X'],
        },
      },
    })
    const originalReasonCodes = result.executionResult.advice!.reasonCodes
    const originalActions = result.executionResult.advice!.suggestedActions

    mapHeroPipelineResultToReadModel(result)

    expect(result.executionResult.advice!.reasonCodes).toBe(originalReasonCodes)
    expect(result.executionResult.advice!.suggestedActions).toBe(originalActions)
  })

  it('same input yields same output', () => {
    const result = pipelineResult({
      executionResult: {
        heroName: 'x',
        role: 'repair',
        contextEvent: 'CI_FAILURE',
        analysis: 'A',
        recommendations: [],
        confidence: 0.7,
        advice: {
          summary: 'S',
          analysis: 'A',
          riskLevel: 'low',
          suggestedActions: [{ actionType: 'a', title: 'T', description: 'D', priority: 'low', blockedByHumanApproval: true }],
          confidence: 0.7,
          needsHumanReview: true,
          reasonCodes: ['R1'],
        },
      },
    })

    const a = mapHeroPipelineResultToReadModel(result)
    const b = mapHeroPipelineResultToReadModel(result)

    expect(a).toEqual(b)
    expect(a.suggestedActions).not.toBe(b.suggestedActions)
    expect(a.reasonCodes).not.toBe(b.reasonCodes)
  })
})
