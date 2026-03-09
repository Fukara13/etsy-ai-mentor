/**
 * HM-1: Hero executor. Runs heroes via registry; validates and normalizes results.
 * Side-effect free; no repo mutation, no execution authority.
 */

import type { HeroContext, HeroRecommendation, HeroResult, HeroRole } from './hero.types'
import type { HeroRegistry } from './hero.registry'

const ERR_NOT_FOUND = 'Hero not found'
const ERR_INVALID_ANALYSIS = 'Hero result analysis must be a non-empty string'
const ERR_INVALID_RECOMMENDATIONS = 'Hero result recommendations must be an array'
const ERR_INVALID_CONFIDENCE = 'Hero result confidence must be a number between 0 and 1'

function isRecommendationArray(v: unknown): v is HeroRecommendation[] {
  return Array.isArray(v)
}

function validateResult(
  raw: Partial<HeroResult>,
  canonical: { name: string; role: HeroRole }
): HeroResult {
  const heroName = canonical.name
  const role = canonical.role

  if (raw.analysis === undefined || typeof raw.analysis !== 'string') {
    throw new Error(ERR_INVALID_ANALYSIS)
  }
  const analysis = raw.analysis.trim()
  if (analysis.length === 0) {
    throw new Error(ERR_INVALID_ANALYSIS)
  }

  if (!isRecommendationArray(raw.recommendations)) {
    throw new Error(ERR_INVALID_RECOMMENDATIONS)
  }

  if (typeof raw.confidence !== 'number' || Number.isNaN(raw.confidence)) {
    throw new Error(ERR_INVALID_CONFIDENCE)
  }
  const confidence = raw.confidence
  if (confidence < 0 || confidence > 1) {
    throw new Error(ERR_INVALID_CONFIDENCE)
  }

  return {
    heroName,
    role,
    analysis,
    recommendations: raw.recommendations,
    confidence,
    metadata: raw.metadata,
  }
}

export class HeroExecutor {
  constructor(private readonly registry: HeroRegistry) {}

  async executeByName(name: string, context: HeroContext): Promise<HeroResult> {
    const hero = this.registry.getByName(name)
    if (!hero) {
      throw new Error(`${ERR_NOT_FOUND}: ${name}`)
    }

    const raw = await Promise.resolve(hero.run(context))
    return validateResult(raw, { name: hero.name, role: hero.role })
  }
}
