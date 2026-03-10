/**
 * HM-8: Hero execution plan.
 * Deterministic routing for multi-hero orchestration.
 */

import type { HeroEvent } from '../selection/hero.events'

export type HeroExecutionStrategy = 'sequential'

export type HeroExecutionPlan = {
  event: HeroEvent
  heroIds: string[]
  strategy: HeroExecutionStrategy
}
