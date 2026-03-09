/**
 * HM-4: Single orchestration entry point. Selection → runtime.
 */

import type { HeroSelector } from '../selection/hero.selector'
import type { HeroRuntime } from '../runtime/hero.runtime'
import type { HeroEvent } from '../selection/hero.events'
import type { HeroExecutionContext } from '../runtime/hero.context'
import type { HeroPipelineResult } from './hero.pipeline-result'

export class HeroPipeline {
  constructor(
    private readonly selector: HeroSelector,
    private readonly runtime: HeroRuntime
  ) {}

  async run(
    event: HeroEvent,
    context: HeroExecutionContext
  ): Promise<HeroPipelineResult> {
    const selection = this.selector.select(event)
    const ctx: HeroExecutionContext = { ...context, event }
    const executionResult = await this.runtime.run(
      selection.selectedHeroId,
      ctx
    )
    return {
      event,
      selectedHeroId: selection.selectedHeroId,
      executionResult,
    }
  }
}
