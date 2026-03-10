/**
 * HM-7: Decision frame mapper tests.
 */

import { describe, it, expect } from 'vitest'
import { mapHeroReadModelToDecisionFrame } from './decision.frame.mapper'
import type { HeroReadModel } from '../projection/hero.read-model'

function readModel(overrides: Partial<HeroReadModel> = {}): HeroReadModel {
  return {
    event: 'CI_FAILURE',
    heroId: 'ciFailureHero',
    status: 'completed',
    summary: 'Summary text',
    analysis: 'Analysis text',
    riskLevel: 'medium',
    suggestedActions: [],
    confidence: 0.8,
    needsHumanReview: false,
    reasonCodes: [],
    ...overrides,
  }
}

describe('mapHeroReadModelToDecisionFrame', () => {
  it('maps completed → ready', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'completed' }))
    expect(frame.frameStatus).toBe('ready')
  })

  it('maps no_advice → informational', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'no_advice' }))
    expect(frame.frameStatus).toBe('informational')
  })

  it('maps failed → blocked', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'failed' }))
    expect(frame.frameStatus).toBe('blocked')
  })

  it('failed produces decisionIntent "escalate"', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'failed' }))
    expect(frame.decisionIntent).toBe('escalate')
  })

  it('high risk produces decisionIntent "approve_or_reject"', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({ status: 'completed', riskLevel: 'high', needsHumanReview: false })
    )
    expect(frame.decisionIntent).toBe('approve_or_reject')
  })

  it('needsHumanReview true produces decisionIntent "review" when status is not failed and risk is not high', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({ status: 'completed', riskLevel: 'medium', needsHumanReview: true })
    )
    expect(frame.decisionIntent).toBe('review')
  })

  it('no_advice produces decisionIntent "acknowledge"', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'no_advice' }))
    expect(frame.decisionIntent).toBe('acknowledge')
  })

  it('recommendedOptionId is selected correctly', () => {
    const frameAck = mapHeroReadModelToDecisionFrame(readModel({ status: 'no_advice' }))
    expect(frameAck.recommendedOptionId).toBe('acknowledge')

    const frameReview = mapHeroReadModelToDecisionFrame(
      readModel({ status: 'completed', needsHumanReview: true, riskLevel: 'low' })
    )
    expect(frameReview.recommendedOptionId).toBe('review')

    const frameEscalate = mapHeroReadModelToDecisionFrame(readModel({ status: 'failed' }))
    expect(frameEscalate.recommendedOptionId).toBe('escalate')

    const frameApprove = mapHeroReadModelToDecisionFrame(
      readModel({ status: 'completed', riskLevel: 'high' })
    )
    expect(frameApprove.recommendedOptionId).toBe('approve')
  })

  it('reviewReason is set correctly for failed', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'failed' }))
    expect(frame.reviewReason).toBe(
      'Decision frame could not be prepared from the source result.'
    )
  })

  it('reviewReason is set correctly for high risk', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({ status: 'completed', riskLevel: 'high' })
    )
    expect(frame.reviewReason).toBe('High-risk recommendation.')
  })

  it('reviewReason is set correctly for low confidence', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({
        status: 'completed',
        riskLevel: 'low',
        needsHumanReview: false,
        confidence: 0.3,
      })
    )
    expect(frame.reviewReason).toBe('Low-confidence recommendation.')
  })

  it('summary and analysis fall back safely when empty', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({ summary: '', analysis: '' })
    )
    expect(frame.summary).toBe('No summary available.')
    expect(frame.analysis).toBe('No analysis available.')
  })

  it('options array is a new array', () => {
    const rm = readModel({ status: 'completed', needsHumanReview: true })
    const frame = mapHeroReadModelToDecisionFrame(rm)
    const frame2 = mapHeroReadModelToDecisionFrame(rm)
    expect(frame.options).not.toBe(frame2.options)
    expect(frame.options).toEqual(frame2.options)
  })

  it('reasonCodes array is a new array', () => {
    const rm = readModel({ reasonCodes: ['A', 'B'] })
    const frame = mapHeroReadModelToDecisionFrame(rm)
    expect(frame.reasonCodes).toEqual(['A', 'B'])
    expect(frame.reasonCodes).not.toBe(rm.reasonCodes)
  })

  it('evidence array is produced and contains confidence + source status', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel())
    expect(frame.evidence).toBeDefined()
    expect(Array.isArray(frame.evidence)).toBe(true)
    const confidenceEvidence = frame.evidence.find((e) => e.label === 'Confidence')
    const statusEvidence = frame.evidence.find((e) => e.label === 'Source Status')
    expect(confidenceEvidence).toBeDefined()
    expect(confidenceEvidence!.value).toBe('0.8')
    expect(statusEvidence).toBeDefined()
    expect(statusEvidence!.value).toBe('completed')
  })

  it('evidence includes reason codes when present', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({ reasonCodes: ['R1', 'R2'] })
    )
    const reasonCodeEvidences = frame.evidence.filter(
      (e) => e.type === 'reason_code' && e.label === 'Reason Code'
    )
    expect(reasonCodeEvidences).toHaveLength(2)
    expect(reasonCodeEvidences.map((e) => e.value)).toEqual(['R1', 'R2'])
  })

  it('input object is not mutated', () => {
    const rm = readModel({ reasonCodes: ['X'], summary: 'S', analysis: 'A' })
    const originalReasonCodes = rm.reasonCodes
    const originalSummary = rm.summary
    const originalAnalysis = rm.analysis

    mapHeroReadModelToDecisionFrame(rm)

    expect(rm.reasonCodes).toBe(originalReasonCodes)
    expect(rm.summary).toBe(originalSummary)
    expect(rm.analysis).toBe(originalAnalysis)
  })

  it('metadata.sourceStatus is set from readModel.status', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'no_advice' }))
    expect(frame.metadata.sourceStatus).toBe('no_advice')
  })

  it('risk mapping for low', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ riskLevel: 'low' }))
    expect(frame.risk.level).toBe('low')
    expect(frame.risk.label).toBe('Low Risk')
    expect(frame.risk.operatorMessage).toBe(
      'Low-risk recommendation. Human review is still available.'
    )
  })

  it('risk mapping for high', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ riskLevel: 'high' }))
    expect(frame.risk.label).toBe('High Risk')
    expect(frame.risk.operatorMessage).toBe(
      'High-risk recommendation. Manual review is recommended.'
    )
  })

  it('headline for completed + high risk', () => {
    const frame = mapHeroReadModelToDecisionFrame(
      readModel({ status: 'completed', riskLevel: 'high' })
    )
    expect(frame.headline).toBe('High-risk recommendation requires human decision')
  })

  it('headline for failed', () => {
    const frame = mapHeroReadModelToDecisionFrame(readModel({ status: 'failed' }))
    expect(frame.headline).toBe('Decision framing blocked and requires escalation')
  })
})
