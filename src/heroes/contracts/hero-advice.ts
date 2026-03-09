/**
 * HM-5: Shared hero advice contract.
 */

import type { HeroRiskLevel } from './hero-risk-level'
import type { HeroActionSuggestion } from './hero-action-suggestion'

export type HeroAdvice = {
  summary: string
  analysis: string
  riskLevel: HeroRiskLevel
  suggestedActions: HeroActionSuggestion[]
  confidence: number
  needsHumanReview: boolean
  reasonCodes: string[]
}
