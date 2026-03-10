/**
 * HM-5: Registry wiring for real hero modules.
 */

import type { HeroRegistry } from '../core/hero.registry'
import { ciFailureHero } from './ci-failure.hero'
import { reviewHero } from './review.hero'
import { analysisHero } from './analysis.hero'
import { escalationHero } from './escalation.hero'
import { repairHero } from './repair.hero'
import { dependencyHero } from './dependency.hero'

export function registerAllHeroes(registry: HeroRegistry): void {
  registry.register(ciFailureHero)
  registry.register(reviewHero)
  registry.register(analysisHero)
  registry.register(escalationHero)
  registry.register(repairHero)
  registry.register(dependencyHero)
}

export { ciFailureHero, reviewHero, analysisHero, escalationHero, repairHero, dependencyHero }
