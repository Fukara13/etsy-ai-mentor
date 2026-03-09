/**
 * HM-4: Normalized pipeline output.
 */

import type { HeroEvent } from '../selection/hero.events'
import type { HeroExecutionResult } from '../runtime/hero.execution-result'

export type HeroPipelineResult = {
  event: HeroEvent
  selectedHeroId: string
  executionResult: HeroExecutionResult
}
