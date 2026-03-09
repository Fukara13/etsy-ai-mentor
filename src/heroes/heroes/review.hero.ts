/**
 * HM-5: PR review hero. Provides PR review guidance.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'

const ADVICE: HeroAdvice = {
  summary: 'PR requires structured review. Check scope, regression risk, and test evidence.',
  analysis:
    'Validate scope alignment with intent. Assess regression risk. Ensure test evidence covers changed behavior. Inspect code quality and documentation.',
  riskLevel: 'low',
  suggestedActions: [
    {
      actionType: 'review_changed_files',
      title: 'Review changed files',
      description: 'Inspect diff for scope and quality.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'validate_tests',
      title: 'Validate tests',
      description: 'Confirm tests cover changed behavior.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'inspect_scope_alignment',
      title: 'Inspect scope alignment',
      description: 'Verify PR scope matches stated intent.',
      priority: 'medium',
      blockedByHumanApproval: true,
    },
  ],
  confidence: 0.9,
  needsHumanReview: true,
  reasonCodes: ['PR_REVIEW_REQUESTED'],
}

export const reviewHero: Hero = {
  name: 'reviewHero',
  role: 'architect',
  run: (_ctx: HeroContext): HeroResult => {
    return adviceToHeroResult('reviewHero', 'architect', ADVICE)
  },
}
