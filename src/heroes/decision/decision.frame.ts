/**
 * HM-7: Decision frame.
 * Human-centered decision surface input.
 */

import type { DecisionFrameStatus } from './decision.frame-status'
import type { DecisionIntent } from './decision.intent'
import type { DecisionOption } from './decision.option'
import type { DecisionEvidence } from './decision.evidence'

export type DecisionFrame = {
  event: string
  heroId: string
  frameStatus: DecisionFrameStatus
  headline: string
  summary: string
  analysis: string
  risk: {
    level: string
    label: string
    operatorMessage: string
  }
  confidence: number
  decisionIntent: DecisionIntent
  options: DecisionOption[]
  recommendedOptionId?: string
  needsHumanReview: boolean
  reviewReason?: string
  reasonCodes: string[]
  evidence: DecisionEvidence[]
  metadata: {
    sourceStatus: string
  }
}
