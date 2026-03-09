/**
 * HM-5: Repair analysis hero. Frames repair analysis requests.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'

const ADVICE: HeroAdvice = {
  summary: 'Deeper repair analysis required. Investigate root cause and safe options.',
  analysis:
    'Investigate root cause, constraints, and safe fix options. Plan bounded fix with rollback awareness. Consider impact on dependent systems.',
  riskLevel: 'medium',
  suggestedActions: [
    {
      actionType: 'root_cause_analysis',
      title: 'Root cause analysis',
      description: 'Identify underlying cause before applying fixes.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'bounded_fix_planning',
      title: 'Bounded fix planning',
      description: 'Plan minimal, scoped fix with clear rollback path.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'rollback_awareness',
      title: 'Rollback awareness',
      description: 'Ensure rollback steps are documented and testable.',
      priority: 'medium',
      blockedByHumanApproval: true,
    },
  ],
  confidence: 0.8,
  needsHumanReview: true,
  reasonCodes: ['REPAIR_ANALYSIS_REQUESTED'],
}

export const analysisHero: Hero = {
  name: 'analysisHero',
  role: 'repair',
  run: (_ctx: HeroContext): HeroResult => {
    return adviceToHeroResult('analysisHero', 'repair', ADVICE)
  },
}
