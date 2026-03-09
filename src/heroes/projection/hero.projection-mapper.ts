/**
 * HM-6: Pure projection. Pipeline result -> read model.
 */

import type { HeroPipelineResult } from '../pipeline/hero.pipeline-result'
import type { HeroReadModel } from './hero.read-model'

function noAdviceReadModel(
  event: string,
  heroId: string
): HeroReadModel {
  return {
    event,
    heroId,
    status: 'no_advice',
    summary: '',
    analysis: '',
    riskLevel: 'medium',
    suggestedActions: [],
    confidence: 0,
    needsHumanReview: true,
    reasonCodes: [],
  }
}

export function mapHeroPipelineResultToReadModel(
  result: HeroPipelineResult
): HeroReadModel {
  const { event, selectedHeroId, executionResult } = result
  const advice = executionResult.advice

  if (!advice) {
    return noAdviceReadModel(event, selectedHeroId)
  }

  return {
    event,
    heroId: selectedHeroId,
    status: 'completed',
    summary: advice.summary,
    analysis: advice.analysis,
    riskLevel: advice.riskLevel,
    suggestedActions: [...advice.suggestedActions],
    confidence: advice.confidence,
    needsHumanReview: advice.needsHumanReview,
    reasonCodes: [...advice.reasonCodes],
  }
}
