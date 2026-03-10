/**
 * HM-7: Pure mapper. HeroReadModel -> DecisionFrame.
 * Deterministic, no side effects, no input mutation.
 */

import type { HeroReadModel } from '../projection/hero.read-model'
import type { DecisionFrame } from './decision.frame'
import type { DecisionFrameStatus } from './decision.frame-status'
import type { DecisionIntent } from './decision.intent'
import type { DecisionOption } from './decision.option'
import type { DecisionEvidence } from './decision.evidence'

function mapStatus(status: HeroReadModel['status']): DecisionFrameStatus {
  switch (status) {
    case 'completed':
      return 'ready'
    case 'no_advice':
      return 'informational'
    case 'failed':
      return 'blocked'
    default:
      return 'informational'
  }
}

function mapRiskLabel(level: string): string {
  switch (level) {
    case 'low':
      return 'Low Risk'
    case 'medium':
      return 'Medium Risk'
    case 'high':
      return 'High Risk'
    default:
      return 'Unknown Risk'
  }
}

function mapOperatorMessage(level: string): string {
  switch (level) {
    case 'low':
      return 'Low-risk recommendation. Human review is still available.'
    case 'medium':
      return 'Moderate risk detected. Review before acting.'
    case 'high':
      return 'High-risk recommendation. Manual review is recommended.'
    default:
      return 'Risk is unclear. Human review is recommended.'
  }
}

function mapDecisionIntent(readModel: HeroReadModel): DecisionIntent {
  if (readModel.status === 'failed') return 'escalate'
  if (readModel.riskLevel === 'high') return 'approve_or_reject'
  if (readModel.needsHumanReview === true) return 'review'
  if (readModel.status === 'no_advice') return 'acknowledge'
  return 'review'
}

function mapHeadline(readModel: HeroReadModel): string {
  if (readModel.status === 'completed' && readModel.riskLevel === 'high') {
    return 'High-risk recommendation requires human decision'
  }
  if (readModel.status === 'completed') {
    return 'Recommendation ready for human review'
  }
  if (readModel.status === 'no_advice') {
    return 'No actionable recommendation available'
  }
  if (readModel.status === 'failed') {
    return 'Decision framing blocked and requires escalation'
  }
  return 'Recommendation ready for human review'
}

function mapReviewReason(readModel: HeroReadModel): string | undefined {
  if (readModel.status === 'failed') {
    return 'Decision frame could not be prepared from the source result.'
  }
  if (readModel.riskLevel === 'high') {
    return 'High-risk recommendation.'
  }
  if (readModel.needsHumanReview === true) {
    return 'Human review required by hero output.'
  }
  if (readModel.confidence < 0.5) {
    return 'Low-confidence recommendation.'
  }
  if (readModel.status === 'no_advice') {
    return 'No actionable advice available.'
  }
  return undefined
}

function buildOptions(intent: DecisionIntent): DecisionOption[] {
  switch (intent) {
    case 'acknowledge':
      return [
        {
          id: 'acknowledge',
          label: 'Acknowledge',
          description: 'Record that the operator reviewed this informational result.',
          actionType: 'acknowledge',
          recommended: true,
          destructive: false,
          disabled: false,
        },
      ]
    case 'review':
      return [
        {
          id: 'review',
          label: 'Review Recommendation',
          description: 'Inspect the recommendation before any downstream action.',
          actionType: 'review',
          recommended: true,
          destructive: false,
          disabled: false,
        },
        {
          id: 'escalate',
          label: 'Escalate',
          description: 'Escalate this case for deeper manual handling.',
          actionType: 'escalate',
          recommended: false,
          destructive: false,
          disabled: false,
        },
      ]
    case 'approve_or_reject':
      return [
        {
          id: 'approve',
          label: 'Approve Recommendation',
          description: 'Approve the recommendation for downstream human-controlled handling.',
          actionType: 'approve_or_reject',
          recommended: true,
          destructive: false,
          disabled: false,
        },
        {
          id: 'reject',
          label: 'Reject Recommendation',
          description: 'Reject the recommendation and stop downstream handling.',
          actionType: 'approve_or_reject',
          recommended: false,
          destructive: true,
          disabled: false,
        },
        {
          id: 'escalate',
          label: 'Escalate',
          description: 'Escalate this high-risk case for deeper manual review.',
          actionType: 'escalate',
          recommended: false,
          destructive: false,
          disabled: false,
        },
      ]
    case 'escalate':
      return [
        {
          id: 'escalate',
          label: 'Escalate',
          description: 'This case requires deeper manual intervention.',
          actionType: 'escalate',
          recommended: true,
          destructive: false,
          disabled: false,
        },
      ]
    default:
      return [
        {
          id: 'review',
          label: 'Review Recommendation',
          description: 'Inspect the recommendation before any downstream action.',
          actionType: 'review',
          recommended: true,
          destructive: false,
          disabled: false,
        },
        {
          id: 'escalate',
          label: 'Escalate',
          description: 'Escalate this case for deeper manual handling.',
          actionType: 'escalate',
          recommended: false,
          destructive: false,
          disabled: false,
        },
      ]
  }
}

function buildEvidence(readModel: HeroReadModel): DecisionEvidence[] {
  const evidence: DecisionEvidence[] = []
  for (const code of readModel.reasonCodes) {
    evidence.push({ type: 'reason_code', label: 'Reason Code', value: code })
  }
  evidence.push({
    type: 'signal',
    label: 'Confidence',
    value: String(readModel.confidence),
  })
  evidence.push({
    type: 'signal',
    label: 'Source Status',
    value: readModel.status,
  })
  return evidence
}

function pickRecommendedOptionId(options: DecisionOption[]): string | undefined {
  const recommended = options.find((o) => o.recommended === true)
  return recommended?.id
}

export function mapHeroReadModelToDecisionFrame(
  readModel: HeroReadModel
): DecisionFrame {
  const frameStatus = mapStatus(readModel.status)
  const decisionIntent = mapDecisionIntent(readModel)
  const options = buildOptions(decisionIntent)
  const recommendedOptionId = pickRecommendedOptionId(options)

  const summary =
    readModel.summary != null && readModel.summary.trim() !== ''
      ? readModel.summary
      : 'No summary available.'
  const analysis =
    readModel.analysis != null && readModel.analysis.trim() !== ''
      ? readModel.analysis
      : 'No analysis available.'

  return {
    event: readModel.event,
    heroId: readModel.heroId,
    frameStatus,
    headline: mapHeadline(readModel),
    summary,
    analysis,
    risk: {
      level: readModel.riskLevel,
      label: mapRiskLabel(readModel.riskLevel),
      operatorMessage: mapOperatorMessage(readModel.riskLevel),
    },
    confidence: readModel.confidence,
    decisionIntent,
    options: [...options],
    recommendedOptionId,
    needsHumanReview: readModel.needsHumanReview,
    reviewReason: mapReviewReason(readModel),
    reasonCodes: [...readModel.reasonCodes],
    evidence: buildEvidence(readModel),
    metadata: {
      sourceStatus: readModel.status,
    },
  }
}
