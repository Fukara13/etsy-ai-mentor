/**
 * HM-8: Multi-hero orchestrator.
 * Sequential execution. No retries, no fallbacks. Partial failure visible.
 */

import type { HeroEvent } from '../selection/hero.events'
import type { HeroRuntime } from '../runtime/hero.runtime'
import type { HeroPlanResolver } from './hero.plan-resolver'
import type { HeroExecutionContext } from '../runtime/hero.context'
import type {
  HeroOrchestrationResult,
  HeroOrchestrationStatus,
  HeroOrchestrationExecution,
} from './hero.orchestration-result'

export class HeroOrchestrator {
  constructor(
    private readonly planResolver: HeroPlanResolver,
    private readonly runtime: HeroRuntime
  ) {}

  async run(
    event: HeroEvent,
    context: HeroExecutionContext
  ): Promise<HeroOrchestrationResult> {
    const plan = this.planResolver.resolve(event)
    const executions: HeroOrchestrationExecution[] = []
    const completedHeroIds: string[] = []
    const failedHeroIds: string[] = []

    const ctxWithEvent = { ...context, event }

    for (const heroId of plan.heroIds) {
      try {
        const executionResult = await this.runtime.run(heroId, ctxWithEvent)
        executions.push({ heroId, executionResult })
        completedHeroIds.push(heroId)
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : String(err)
        executions.push({ heroId, errorMessage })
        failedHeroIds.push(heroId)
      }
    }

    const status = this.computeStatus(
      plan.heroIds.length,
      completedHeroIds.length,
      failedHeroIds.length
    )

    return {
      event: plan.event,
      plan,
      executions: [...executions],
      completedHeroIds: [...completedHeroIds],
      failedHeroIds: [...failedHeroIds],
      status,
    }
  }

  private computeStatus(
    total: number,
    completed: number,
    failed: number
  ): HeroOrchestrationStatus {
    if (completed === total) return 'completed'
    if (failed === total) return 'failed'
    return 'partial'
  }
}
