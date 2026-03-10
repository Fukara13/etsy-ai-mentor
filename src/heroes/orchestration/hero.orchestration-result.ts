/**
 * HM-8: Hero orchestration result.
 * Outcome of multi-hero sequential execution.
 */

import type { HeroEvent } from '../selection/hero.events'
import type { HeroExecutionPlan } from './hero.execution-plan'
import type { HeroExecutionResult } from '../runtime/hero.execution-result'

export type HeroOrchestrationStatus = 'completed' | 'partial' | 'failed'

export type HeroOrchestrationExecution = {
  heroId: string
  executionResult?: HeroExecutionResult
  errorMessage?: string
}

export type HeroOrchestrationResult = {
  event: HeroEvent
  plan: HeroExecutionPlan
  executions: HeroOrchestrationExecution[]
  completedHeroIds: string[]
  failedHeroIds: string[]
  status: HeroOrchestrationStatus
}
