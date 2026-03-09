/**
 * HM-5: Maps HeroAdvice to executor HeroResult contract.
 */

import type { HeroRecommendation, HeroResult, HeroRole } from '../core/hero.types'
import type { HeroAdvice } from './hero-advice'

export function adviceToHeroResult(
  heroName: string,
  role: HeroRole,
  advice: HeroAdvice
): HeroResult {
  const recommendations: HeroRecommendation[] = advice.suggestedActions.map(
    (a) => ({ title: a.title, detail: a.description, priority: a.priority })
  )
  return {
    heroName,
    role,
    analysis: advice.analysis,
    recommendations,
    confidence: advice.confidence,
    metadata: { advice },
  }
}
