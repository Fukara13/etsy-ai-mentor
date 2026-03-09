/**
 * HM-5: Escalation hero. Handles retry exhausted situations.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'

const ADVICE: HeroAdvice = {
  summary: 'Auto-remediation exhausted. Manual intervention required.',
  analysis:
    'Automated retries have been exhausted. Manual diagnosis, rollback review, and owner decision are required. Do not rely on further automated recovery.',
  riskLevel: 'critical',
  suggestedActions: [
    {
      actionType: 'manual_diagnosis',
      title: 'Manual diagnosis',
      description: 'Perform hands-on investigation of failure state.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'rollback_review',
      title: 'Rollback review',
      description: 'Assess rollback options and execute if appropriate.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
    {
      actionType: 'owner_decision',
      title: 'Owner decision',
      description: 'Escalate to repository owner for resolution path.',
      priority: 'high',
      blockedByHumanApproval: true,
    },
  ],
  confidence: 0.95,
  needsHumanReview: true,
  reasonCodes: ['RETRY_EXHAUSTED'],
}

export const escalationHero: Hero = {
  name: 'escalationHero',
  role: 'repair',
  run: (_ctx: HeroContext): HeroResult => {
    return adviceToHeroResult('escalationHero', 'repair', ADVICE)
  },
}
