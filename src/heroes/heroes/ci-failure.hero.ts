/**
 * HM-5: CI failure hero. Interprets CI failure events.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'

const ADVICE: HeroAdvice = {
  summary: 'CI failure requires inspection. Pipeline or test/build failure detected.',
  analysis:
    'Likely pipeline, test, or build failure. Review failing logs, identify failing step, and validate reproducibility in local or staging environment.',
  riskLevel: 'medium',
  suggestedActions: [
    {
      actionType: 'review_logs',
      title: 'Review failing logs',
      description: 'Inspect CI logs to identify the failing step and error message.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'validate_reproducibility',
      title: 'Validate reproducibility',
      description: 'Reproduce the failure locally or in a staging environment.',
      priority: 'medium',
      blockedByHumanApproval: true,
    },
  ],
  confidence: 0.85,
  needsHumanReview: true,
  reasonCodes: ['CI_FAILURE_DETECTED'],
}

export const ciFailureHero: Hero = {
  name: 'ciFailureHero',
  role: 'repair',
  run: (_ctx: HeroContext): HeroResult => {
    return adviceToHeroResult('ciFailureHero', 'repair', ADVICE)
  },
}
