/**
 * HM-6: Read model for UI and telemetry surfaces.
 * Execution state only; no authority fields.
 */

import type { HeroActionSuggestion } from '../contracts/hero-action-suggestion'
import type { HeroRiskLevel } from '../contracts/hero-risk-level'

export type HeroReadModelStatus = 'completed' | 'no_advice' | 'failed'

export type HeroReadModel = {
  event: string
  heroId: string
  status: HeroReadModelStatus
  summary: string
  analysis: string
  riskLevel: HeroRiskLevel
  suggestedActions: HeroActionSuggestion[]
  confidence: number
  needsHumanReview: boolean
  reasonCodes: string[]
}
