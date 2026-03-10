/**
 * HM-12: Security hero foundation.
 * Deterministic, reasoning-only security advice. No repo mutation, no execution.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'
import type { HeroRiskLevel } from '../contracts/hero-risk-level'

type SecurityEvent = 'SECURITY_ALERT' | 'REPAIR_ANALYSIS_REQUESTED'

type SecurityTemplate = {
  summary: string
  analysis: string
  riskLevel: HeroRiskLevel
  confidence: number
  suggestedActions: {
    actionType: string
    title: string
    description: string
    priority: 'low' | 'medium' | 'high'
  }[]
  reasonCodes: string[]
}

function resolveSecurityTemplate(event: SecurityEvent): SecurityTemplate {
  switch (event) {
    case 'SECURITY_ALERT':
      return {
        summary: 'Security alert detected; security risk analysis prepared.',
        analysis:
          'A possible security risk has been signaled. Review recent configuration changes, inspect for secret exposure, verify permission boundaries, and validate dependency changes for security implications before any repair or merge.',
        riskLevel: 'high',
        confidence: 0.85,
        suggestedActions: [
          {
            actionType: 'review_recent_config_changes',
            title: 'Review recent configuration changes',
            description:
              'Inspect recent commits or PRs that modified configuration files for unsafe settings or exposure risk.',
            priority: 'high',
          },
          {
            actionType: 'inspect_secret_exposure_risk',
            title: 'Inspect secret exposure risk',
            description:
              'Check for hardcoded secrets, exposed credentials, or sensitive data in logs or configuration.',
            priority: 'high',
          },
          {
            actionType: 'verify_permission_boundaries',
            title: 'Verify permission boundaries',
            description:
              'Confirm that file, network, or runtime permissions are scoped appropriately and not over-permissive.',
            priority: 'medium',
          },
          {
            actionType: 'inspect_dependency_changes_for_security',
            title: 'Inspect dependency changes for security implications',
            description:
              'Review recent dependency additions or upgrades for known vulnerabilities or untrusted sources.',
            priority: 'medium',
          },
          {
            actionType: 'request_manual_security_review',
            title: 'Request manual security review before repair or merge',
            description:
              'Escalate to a human operator for explicit security review before any repair or merge proceeds.',
            priority: 'high',
          },
        ],
        reasonCodes: [
          'SECURITY_ALERT_DETECTED',
          'SECURITY_REVIEW_RECOMMENDED',
          'HUMAN_VERIFICATION_REQUIRED',
        ],
      }

    case 'REPAIR_ANALYSIS_REQUESTED':
      return {
        summary: 'Security-focused repair analysis requested.',
        analysis:
          'A repair analysis has been requested. Before code-level repair, perform a security review: check for secrets exposure, unsafe permissions, suspicious dependency changes, insecure configuration, and exposure risk.',
        riskLevel: 'medium',
        confidence: 0.75,
        suggestedActions: [
          {
            actionType: 'review_recent_config_changes',
            title: 'Review recent configuration changes',
            description:
              'Inspect configuration changes for insecure defaults or exposure risk before applying repairs.',
            priority: 'medium',
          },
          {
            actionType: 'inspect_secret_exposure_risk',
            title: 'Inspect secret exposure risk',
            description:
              'Ensure no secrets or credentials are exposed in the codebase or logs before repair.',
            priority: 'high',
          },
          {
            actionType: 'verify_permission_boundaries',
            title: 'Verify permission boundaries',
            description:
              'Validate that permission boundaries remain appropriate and are not weakened by the repair scope.',
            priority: 'medium',
          },
          {
            actionType: 'inspect_dependency_changes_for_security',
            title: 'Inspect dependency changes for security implications',
            description:
              'Review dependency changes for security implications before merging or shipping repairs.',
            priority: 'medium',
          },
          {
            actionType: 'request_manual_security_review',
            title: 'Request manual security review before repair or merge',
            description:
              'Obtain explicit human approval before any repair or merge to avoid security regressions.',
            priority: 'high',
          },
        ],
        reasonCodes: [
          'SECURITY_REPAIR_ANALYSIS_ADVISORY',
          'ADVISORY_ONLY_NOT_EXECUTION_PATH',
          'HUMAN_APPROVAL_REQUIRED',
        ],
      }

    default: {
      const neverEvent = event as never
      throw new Error(`Unsupported security hero event: ${neverEvent}`)
    }
  }
}

function cloneAdviceFromTemplate(template: SecurityTemplate): HeroAdvice {
  return {
    summary: template.summary,
    analysis: template.analysis,
    riskLevel: template.riskLevel,
    suggestedActions: template.suggestedActions.map((a) => ({
      actionType: a.actionType,
      title: a.title,
      description: a.description,
      priority: a.priority,
      blockedByHumanApproval: true,
    })),
    confidence: template.confidence,
    needsHumanReview: true,
    reasonCodes: [...template.reasonCodes],
  }
}

const SUPPORTED_EVENTS: SecurityEvent[] = ['SECURITY_ALERT', 'REPAIR_ANALYSIS_REQUESTED']

function toSecurityEventOrThrow(eventType: string): SecurityEvent {
  if ((SUPPORTED_EVENTS as string[]).includes(eventType)) {
    return eventType as SecurityEvent
  }
  throw new Error(`Unsupported security hero event: ${eventType}`)
}

export const securityHero: Hero = {
  name: 'securityHero',
  role: 'repair',
  run: (ctx: HeroContext): HeroResult => {
    const event = toSecurityEventOrThrow(ctx.eventType)
    const template = resolveSecurityTemplate(event)
    const advice = cloneAdviceFromTemplate(template)
    return adviceToHeroResult('securityHero', 'repair', advice)
  },
}
