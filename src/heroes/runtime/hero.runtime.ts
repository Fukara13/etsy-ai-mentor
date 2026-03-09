/**
 * HM-2: Thin runtime layer over registry and executor.
 * No pipeline, council, or multi-hero orchestration.
 */

import type { HeroContext } from '../core/hero.types'
import type { HeroRegistry } from '../core/hero.registry'
import type { HeroExecutor } from '../core/hero.executor'
import type { HeroExecutionContext } from './hero.context'
import type { HeroExecutionResult } from './hero.execution-result'

function toCoreContext(ctx: HeroExecutionContext): HeroContext {
  return {
    eventType: ctx.event,
    input: ctx,
    metadata: ctx.metadata,
  }
}

function toExecutionResult(
  result: Awaited<ReturnType<HeroExecutor['executeByName']>>,
  contextEvent: string
): HeroExecutionResult {
  return {
    heroName: result.heroName,
    role: result.role,
    contextEvent,
    analysis: result.analysis,
    recommendations: result.recommendations.map((r) => r.title),
    confidence: result.confidence,
  }
}

export class HeroRuntime {
  constructor(
    private readonly registry: HeroRegistry,
    private readonly executor: HeroExecutor
  ) {}

  async run(
    heroName: string,
    context: HeroExecutionContext
  ): Promise<HeroExecutionResult> {
    const coreContext = toCoreContext(context)
    const result = await this.executor.executeByName(heroName, coreContext)
    return toExecutionResult(result, context.event)
  }
}
