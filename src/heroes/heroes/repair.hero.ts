/**
 * HM-10: Repair hero foundation.
 * Deterministic, reasoning-only repair advice. No repo mutation, no execution.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'
import type { HeroRiskLevel } from '../contracts/hero-risk-level'
import type { HeroEvent } from '../selection/hero.events'

type RepairTemplate = {
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

function resolveRepairTemplate(event: HeroEvent): RepairTemplate {
  switch (event) {
    case 'CI_FAILURE':
      return {
        summary: 'Repair-focused guidance for CI failure.',
        analysis:
          'The CI pipeline is failing. Focus on isolating the failing tests, validating dependencies, and ensuring environment consistency before attempting any code-level changes.',
        riskLevel: 'medium',
        confidence: 0.8,
        suggestedActions: [
          {
            actionType: 'inspect_failing_tests',
            title: 'Inspect failing test output',
            description:
              'Review the failing test output and logs to identify the exact failure signatures and affected modules.',
            priority: 'high',
          },
          {
            actionType: 'verify_dependencies',
            title: 'Verify dependency versions',
            description:
              'Confirm that dependency versions match lockfiles and CI configuration. Look for version drifts between local and CI.',
            priority: 'medium',
          },
          {
            actionType: 'check_lockfile_consistency',
            title: 'Check lockfile consistency',
            description:
              'Ensure the lockfile is up to date and consistent across local and CI environments before rerunning.',
            priority: 'medium',
          },
          {
            actionType: 'rerun_after_env_validation',
            title: 'Rerun after environment validation',
            description:
              'Only rerun the CI job after validating environment variables, secrets, and required services.',
            priority: 'low',
          },
        ],
        reasonCodes: [
          'CI_FAILURE_REPAIR_FOCUS',
          'TEST_OUTPUT_REVIEW_REQUIRED',
          'DEPENDENCY_VERIFICATION_RECOMMENDED',
        ],
      }

    case 'RETRY_EXHAUSTED':
      return {
        summary: 'Escalated repair guidance after retry exhaustion.',
        analysis:
          'Automated retries have been exhausted without recovery. Treat this as a persistent failure and shift from automation to deliberate, manual repair planning.',
        riskLevel: 'high',
        confidence: 0.9,
        suggestedActions: [
          {
            actionType: 'stop_retry_loop',
            title: 'Stop automated retry loop',
            description:
              'Disable or pause automated retries to avoid masking the underlying failure and consuming resources.',
            priority: 'high',
          },
          {
            actionType: 'inspect_failure_pattern',
            title: 'Inspect repeated failure pattern',
            description:
              'Compare logs across all failed attempts to identify stable failure signatures and rule out flaky behavior.',
            priority: 'high',
          },
          {
            actionType: 'collect_incident_context',
            title: 'Collect incident logs and context',
            description:
              'Gather logs, configuration snapshots, and timeline notes to support manual diagnosis and future repair decisions.',
            priority: 'medium',
          },
          {
            actionType: 'request_manual_review',
            title: 'Request manual repair review',
            description:
              'Escalate to an operator or owner with a concise summary of the failure and collected evidence before any risky changes are made.',
            priority: 'high',
          },
        ],
        reasonCodes: [
          'RETRY_EXHAUSTED_REPAIR_CONTEXT',
          'PERSISTENT_FAILURE_REQUIRES_MANUAL_REPAIR',
          'ESCALATION_FOR_REPAIR_RECOMMENDED',
        ],
      }

    case 'REPAIR_ANALYSIS_REQUESTED':
      return {
        summary: 'General repair planning guidance.',
        analysis:
          'A repair analysis has been requested. Focus on clarifying the problem, validating the surrounding system state, and proposing the safest manual repair path.',
        riskLevel: 'medium',
        confidence: 0.85,
        suggestedActions: [
          {
            actionType: 'identify_root_cause_area',
            title: 'Inspect probable root cause area',
            description:
              'Identify the most likely subsystem, module, or dependency category responsible for the failure before editing code.',
            priority: 'high',
          },
          {
            actionType: 'validate_system_state',
            title: 'Validate dependency, install, build, and test state',
            description:
              'Confirm that dependencies are installed correctly and that build and test commands run as expected in a clean environment.',
            priority: 'medium',
          },
          {
            actionType: 'plan_safest_repair',
            title: 'Choose the safest manual repair path',
            description:
              'Select a minimal, reversible repair plan with a clear rollback strategy rather than attempting broad changes.',
            priority: 'medium',
          },
        ],
        reasonCodes: [
          'REPAIR_PLANNING_REQUESTED',
          'ROOT_CAUSE_AREA_IDENTIFICATION_REQUIRED',
          'SAFE_MANUAL_REPAIR_PATH_RECOMMENDED',
        ],
      }

    default: {
      const neverEvent = event as never
      throw new Error(`Unsupported repair hero event: ${neverEvent}`)
    }
  }
}

function cloneAdviceFromTemplate(template: RepairTemplate): HeroAdvice {
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

const SUPPORTED_EVENTS: HeroEvent[] = ['CI_FAILURE', 'RETRY_EXHAUSTED', 'REPAIR_ANALYSIS_REQUESTED']

function toHeroEventOrFallback(eventType: string): HeroEvent {
  return (SUPPORTED_EVENTS as string[]).includes(eventType)
    ? (eventType as HeroEvent)
    : 'REPAIR_ANALYSIS_REQUESTED'
}

export const repairHero: Hero = {
  name: 'repairHero',
  role: 'repair',
  run: (ctx: HeroContext): HeroResult => {
    const event = toHeroEventOrFallback(ctx.eventType)
    const template = resolveRepairTemplate(event)
    const advice = cloneAdviceFromTemplate(template)
    return adviceToHeroResult('repairHero', 'repair', advice)
  },
}

