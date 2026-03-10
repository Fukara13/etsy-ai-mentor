/**
 * HM-8: Hero plan resolver.
 * Deterministic hardcoded routing. Validates against registry.
 */

import type { HeroEvent } from '../selection/hero.events'
import type { HeroRegistry } from '../core/hero.registry'
import type { HeroExecutionPlan } from './hero.execution-plan'

const ROUTING: Record<HeroEvent, string[]> = {
  CI_FAILURE: ['analysisHero', 'repairHero'],
  RETRY_EXHAUSTED: ['analysisHero', 'escalationHero'],
  PR_OPENED: ['reviewHero'],
  PR_UPDATED: ['reviewHero', 'analysisHero'],
  REPAIR_ANALYSIS_REQUESTED: ['analysisHero', 'repairHero'],
}

export class HeroPlanResolver {
  constructor(private readonly registry: HeroRegistry) {}

  resolve(event: HeroEvent): HeroExecutionPlan {
    const heroIds = ROUTING[event]
    if (!heroIds) {
      throw new Error(`Unknown event: ${event}`)
    }
    for (const heroId of heroIds) {
      if (!this.registry.getByName(heroId)) {
        throw new Error(`Planned hero is not registered: ${heroId}`)
      }
    }
    return {
      event,
      heroIds: [...heroIds],
      strategy: 'sequential',
    }
  }
}
