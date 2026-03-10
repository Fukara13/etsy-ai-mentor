/**
 * HM-11: Dependency hero foundation.
 * Deterministic, reasoning-only dependency advice. No repo mutation, no execution.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'
import type { HeroRiskLevel } from '../contracts/hero-risk-level'

type DependencyEvent = 'DEPENDENCY_ALERT' | 'REPAIR_ANALYSIS_REQUESTED'

type DependencyTemplate = {
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

function resolveDependencyTemplate(event: DependencyEvent): DependencyTemplate {
  switch (event) {
    case 'DEPENDENCY_ALERT':
      return {
        summary: 'Dependency alert detected; dependency risk analysis prepared.',
        analysis:
          'A dependency-related inconsistency or risk has been signaled. Likely causes include version mismatch between package.json and lockfile, peer dependency conflicts, or package resolution drift between environments. Validate dependency state before attempting fixes.',
        riskLevel: 'medium',
        confidence: 0.82,
        suggestedActions: [
          {
            actionType: 'verify_manifest_and_lockfile',
            title: 'Verify package.json and lockfile consistency',
            description:
              'Confirm that declared dependencies and versions in package.json align with the lockfile and that no unintended upgrades or downgrades have occurred.',
            priority: 'high',
          },
          {
            actionType: 'review_dependency_changes',
            title: 'Review recent dependency/version changes',
            description:
              'Inspect recent commits or pull requests that changed dependencies or versions to see if they correlate with the alert.',
            priority: 'medium',
          },
          {
            actionType: 'inspect_peer_warnings',
            title: 'Inspect peer dependency warnings',
            description:
              'Check install and runtime logs for peer dependency warnings and note any mismatched major versions.',
            priority: 'medium',
          },
          {
            actionType: 'rerun_validation_after_normalization',
            title: 'Re-run validation after dependency normalization',
            description:
              'After aligning manifests and resolving warnings, rerun tests and builds to confirm that the dependency alert is resolved.',
            priority: 'low',
          },
        ],
        reasonCodes: [
          'DEPENDENCY_ALERT_DETECTED',
          'VERSION_ALIGNMENT_REVIEW_RECOMMENDED',
          'LOCKFILE_VALIDATION_RECOMMENDED',
        ],
      }

    case 'REPAIR_ANALYSIS_REQUESTED':
      return {
        summary: 'Dependency-focused repair analysis requested.',
        analysis:
          'Before attempting any code-level repair, the dependency state should be validated. Misaligned versions, stale lockfiles, or partial installs can mimic application bugs and lead to unsafe repairs.',
        riskLevel: 'medium',
        confidence: 0.84,
        suggestedActions: [
          {
            actionType: 'validate_manifest_and_lockfile',
            title: 'Validate package.json and lockfile before repair',
            description:
              'Ensure that package.json and the lockfile describe a consistent dependency graph and that no unintended changes are pending.',
            priority: 'high',
          },
          {
            actionType: 'perform_clean_install_locally',
            title: 'Perform a clean install in a safe local environment',
            description:
              'Run a clean dependency install in a disposable or isolated environment to reproduce the issue without local cache or global state.',
            priority: 'medium',
          },
          {
            actionType: 'review_peer_dependency_state',
            title: 'Review peer dependency state',
            description:
              'Check for peer dependency warnings and consider aligning versions where safe to do so before changing application code.',
            priority: 'medium',
          },
          {
            actionType: 'rerun_validation_after_dependency_checks',
            title: 'Re-run validation after dependency normalization',
            description:
              'After dependency checks and clean install, rerun tests and builds to confirm whether the original failure persists.',
            priority: 'low',
          },
        ],
        reasonCodes: [
          'DEPENDENCY_REPAIR_ANALYSIS_REQUESTED',
          'CLEAN_INSTALL_RECOMMENDED',
          'PEER_DEPENDENCY_REVIEW_RECOMMENDED',
        ],
      }

    default: {
      const neverEvent = event as never
      throw new Error(`Unsupported dependency hero event: ${neverEvent}`)
    }
  }
}

function cloneAdviceFromTemplate(template: DependencyTemplate): HeroAdvice {
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

const SUPPORTED_EVENTS: DependencyEvent[] = ['DEPENDENCY_ALERT', 'REPAIR_ANALYSIS_REQUESTED']

function toDependencyEventOrThrow(eventType: string): DependencyEvent {
  if ((SUPPORTED_EVENTS as string[]).includes(eventType)) {
    return eventType as DependencyEvent
  }
  throw new Error(`Unsupported dependency hero event: ${eventType}`)
}

export const dependencyHero: Hero = {
  name: 'dependencyHero',
  role: 'repair',
  run: (ctx: HeroContext): HeroResult => {
    const event = toDependencyEventOrThrow(ctx.eventType)
    const template = resolveDependencyTemplate(event)
    const advice = cloneAdviceFromTemplate(template)
    return adviceToHeroResult('dependencyHero', 'repair', advice)
  },
}

