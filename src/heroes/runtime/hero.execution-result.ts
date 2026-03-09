/**
 * HM-2: Normalized runtime output.
 * Maps from HeroResult + context event.
 * HM-5: advice carries full HeroAdvice when present.
 */

import type { HeroAdvice } from '../contracts/hero-advice'

export type HeroExecutionResult = {
  heroName: string
  role: string
  contextEvent: string
  analysis: string
  recommendations: string[]
  confidence: number
  advice?: HeroAdvice
}
