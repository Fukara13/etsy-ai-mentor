/**
 * HM-5 / HM-9: Analysis hero. Event-based deterministic analysis; standard HeroAdvice.
 * Specialist hero foundation. No repair execution, no repo mutation.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'
import type { HeroActionSuggestion } from '../contracts/hero-action-suggestion'
import type { HeroRiskLevel } from '../contracts/hero-risk-level'
import type { HeroEvent } from '../selection/hero.events'

type AnalysisTemplateAction = { label: string; description: string }

type AnalysisTemplate = {
  summary: string
  analysis: string
  riskLevel: HeroRiskLevel
  confidence: number
  suggestedActions: AnalysisTemplateAction[]
  reasonCodes: string[]
}

function toActionSuggestion(a: AnalysisTemplateAction): HeroActionSuggestion {
  const actionType = a.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || 'review'
  return {
    actionType,
    title: a.label,
    description: a.description,
    priority: 'medium',
    blockedByHumanApproval: true,
  }
}

function resolveAnalysisTemplate(event: HeroEvent): AnalysisTemplate {
  switch (event) {
    case 'CI_FAILURE':
      return {
        summary: 'CI failure detected and initial technical analysis prepared.',
        analysis:
          'The pipeline indicates a CI-related failure. The most likely categories are build breakage, test breakage, dependency mismatch, or environment inconsistency. Human review is required before any repair action.',
        riskLevel: 'high',
        confidence: 0.82,
        suggestedActions: [
          {
            label: 'Inspect failed CI job logs',
            description:
              'Review the first failing step and identify whether the issue is build, test, dependency, or environment related.',
          },
          {
            label: 'Verify latest code changes',
            description:
              'Check the most recent pull request or commit range associated with the failure.',
          },
          {
            label: 'Classify failure type',
            description:
              'Determine whether this is deterministic, flaky, or environmental before proposing any repair path.',
          },
        ],
        reasonCodes: [
          'CI_FAILURE_DETECTED',
          'HUMAN_REVIEW_REQUIRED',
          'ANALYSIS_ONLY_MODE',
        ],
      }

    case 'RETRY_EXHAUSTED':
      return {
        summary: 'Retry limit exhausted; escalation analysis prepared.',
        analysis:
          'Automated retry attempts did not recover the failure condition. This suggests a persistent issue rather than a transient CI fluctuation. Manual investigation should now take priority.',
        riskLevel: 'high',
        confidence: 0.9,
        suggestedActions: [
          {
            label: 'Escalate for manual review',
            description:
              'Stop further automated retry behavior and route the case to operator review.',
          },
          {
            label: 'Compare failed attempts',
            description:
              'Identify whether all failed attempts share the same root failure signature.',
          },
          {
            label: 'Capture incident notes',
            description:
              'Record the repeated failure pattern for future diagnosis and repair planning.',
          },
        ],
        reasonCodes: [
          'RETRY_LIMIT_EXHAUSTED',
          'PERSISTENT_FAILURE_SIGNAL',
          'MANUAL_INVESTIGATION_REQUIRED',
        ],
      }

    case 'PR_OPENED':
      return {
        summary: 'New pull request detected; initial review analysis prepared.',
        analysis:
          'A new pull request has entered the review surface. The recommended next step is to assess change scope, risk signals, and test posture before any approval decision.',
        riskLevel: 'medium',
        confidence: 0.76,
        suggestedActions: [
          {
            label: 'Review change scope',
            description:
              'Identify impacted modules and estimate the potential blast radius.',
          },
          {
            label: 'Check validation coverage',
            description:
              'Verify whether tests, lint, and build coverage are present and aligned with the change.',
          },
          {
            label: 'Assess merge readiness',
            description:
              'Determine whether the pull request is ready for human review or needs additional evidence.',
          },
        ],
        reasonCodes: [
          'PR_SIGNAL_RECEIVED',
          'REVIEW_ANALYSIS_READY',
          'HUMAN_DECISION_PENDING',
        ],
      }

    case 'PR_UPDATED':
      return {
        summary: 'Pull request update detected; follow-up review analysis prepared.',
        analysis:
          'The pull request was updated after its initial creation. Re-validation is recommended because previous assumptions about risk, coverage, or readiness may have changed.',
        riskLevel: 'medium',
        confidence: 0.78,
        suggestedActions: [
          {
            label: 'Re-check changed files',
            description:
              'Confirm whether the update altered the original risk profile of the pull request.',
          },
          {
            label: 'Re-run review checklist',
            description:
              'Repeat the core human review checks against the updated state.',
          },
          {
            label: 'Verify test alignment',
            description:
              'Ensure the updated change set is still covered by available validation steps.',
          },
        ],
        reasonCodes: [
          'PR_UPDATED_SIGNAL',
          'REVALIDATION_RECOMMENDED',
          'HUMAN_DECISION_PENDING',
        ],
      }

    case 'REPAIR_ANALYSIS_REQUESTED':
      return {
        summary: 'Explicit repair analysis request received.',
        analysis:
          'A repair-oriented technical analysis was requested explicitly. At this stage the role of analysisHero is to frame the problem, classify risk, and propose next human-guided investigative steps without mutating the repository.',
        riskLevel: 'medium',
        confidence: 0.84,
        suggestedActions: [
          {
            label: 'Frame the failure clearly',
            description:
              'Write down the observable failure and the probable technical domain involved.',
          },
          {
            label: 'Separate diagnosis from repair',
            description:
              'Do not jump to patching before the root cause category becomes clearer.',
          },
          {
            label: 'Prepare operator handoff',
            description:
              'Package the analysis into a structured form suitable for human decision-making.',
          },
        ],
        reasonCodes: [
          'EXPLICIT_ANALYSIS_REQUEST',
          'REPAIR_CONTEXT_IDENTIFIED',
          'ANALYSIS_ONLY_MODE',
        ],
      }

    default: {
      const neverEvent = event as never
      throw new Error(`Unsupported analysis hero event: ${neverEvent}`)
    }
  }
}

function createAdvice(event: HeroEvent): HeroAdvice {
  const template = resolveAnalysisTemplate(event)
  return {
    summary: template.summary,
    analysis: template.analysis,
    riskLevel: template.riskLevel,
    suggestedActions: template.suggestedActions.map(toActionSuggestion),
    confidence: template.confidence,
    needsHumanReview: true,
    reasonCodes: [...template.reasonCodes],
  }
}

const SUPPORTED_EVENTS: HeroEvent[] = [
  'CI_FAILURE',
  'RETRY_EXHAUSTED',
  'PR_OPENED',
  'PR_UPDATED',
  'REPAIR_ANALYSIS_REQUESTED',
]

function isHeroEvent(eventType: string): eventType is HeroEvent {
  return (SUPPORTED_EVENTS as string[]).includes(eventType)
}

export const analysisHero: Hero = {
  name: 'analysisHero',
  role: 'repair',
  run: (ctx: HeroContext): HeroResult => {
    const event = isHeroEvent(ctx.eventType) ? ctx.eventType : 'REPAIR_ANALYSIS_REQUESTED'
    const advice = createAdvice(event)
    return adviceToHeroResult('analysisHero', 'repair', advice)
  },
}
