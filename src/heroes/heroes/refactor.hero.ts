/**
 * HM-13: Refactor hero foundation.
 * Deterministic, reasoning-only refactor advice. No repo mutation, no execution.
 */

import type { Hero, HeroContext, HeroResult } from '../core/hero.types'
import { adviceToHeroResult } from '../contracts/hero-advice-mapper'
import type { HeroAdvice } from '../contracts/hero-advice'
import type { HeroRiskLevel } from '../contracts/hero-risk-level'

type RefactorEvent = 'REPAIR_ANALYSIS_REQUESTED' | 'PR_UPDATED'

type RefactorTemplate = {
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

function resolveRefactorTemplate(event: RefactorEvent): RefactorTemplate {
  switch (event) {
    case 'REPAIR_ANALYSIS_REQUESTED':
      return {
        summary: 'Refactor evaluation requested; maintainability and structure review.',
        analysis:
          'Refactor opportunities and structural risks should be considered before repair. Assess maintainability, duplication risk, responsibility mixing, readability degradation, and the need for safe simplification before further change to avoid compounding technical debt.',
        riskLevel: 'medium',
        confidence: 0.78,
        suggestedActions: [
          {
            actionType: 'check_duplicated_logic',
            title: 'Check for duplicated logic',
            description:
              'Identify repeated logic across modules or functions that could be consolidated to reduce maintenance cost.',
            priority: 'high',
          },
          {
            actionType: 'review_responsibility_separation',
            title: 'Review whether responsibilities are well-separated',
            description:
              'Inspect whether modules and functions have clear, single responsibilities or if concerns are mixed.',
            priority: 'medium',
          },
          {
            actionType: 'evaluate_simplification_before_expansion',
            title: 'Evaluate simplification before risky feature expansion',
            description:
              'Before adding features, assess whether the current structure can be simplified first to avoid compounding complexity.',
            priority: 'medium',
          },
          {
            actionType: 'review_readability_and_module_boundaries',
            title: 'Review readability and module boundaries',
            description:
              'Check that module boundaries are clear and code remains readable for future maintainers.',
            priority: 'medium',
          },
        ],
        reasonCodes: [
          'REFACTOR_ANALYSIS_ADVISORY',
          'MAINTAINABILITY_REVIEW_RECOMMENDED',
          'STRUCTURE_SIMPLIFICATION_CANDIDATE',
          'HUMAN_APPROVAL_REQUIRED',
        ],
      }

    case 'PR_UPDATED':
      return {
        summary: 'PR update warrants refactor-focused review.',
        analysis:
          'Recent changes may increase structural complexity. Growing file or function responsibility and refactor needs should be considered before further feature growth to prevent maintainability risk.',
        riskLevel: 'low',
        confidence: 0.72,
        suggestedActions: [
          {
            actionType: 'check_responsibility_expansion_in_changed_areas',
            title: 'Check for responsibility expansion in changed areas',
            description:
              'Inspect whether the modified areas have gained too many responsibilities or grown beyond their original scope.',
            priority: 'medium',
          },
          {
            actionType: 'check_similar_logic_elsewhere',
            title: 'Check whether similar logic is duplicated elsewhere',
            description:
              'Identify if the changed logic is repeated in other parts of the codebase and could be consolidated.',
            priority: 'medium',
          },
          {
            actionType: 'flag_small_refactor_opportunities',
            title: 'Flag small refactor opportunities before they become costly',
            description:
              'Mark minor refactor opportunities now to avoid larger refactors later as the codebase evolves.',
            priority: 'low',
          },
          {
            actionType: 'review_module_boundaries_preserved',
            title: 'Review whether module boundaries are preserved',
            description:
              'Confirm that module boundaries and separation of concerns are maintained with the new changes.',
            priority: 'medium',
          },
        ],
        reasonCodes: [
          'PR_REFACTOR_REVIEW_ADVISORY',
          'CHANGE_SURFACE_REVIEW_RECOMMENDED',
          'MAINTAINABILITY_GUARD_RECOMMENDED',
          'HUMAN_APPROVAL_REQUIRED',
        ],
      }

    default: {
      const neverEvent = event as never
      throw new Error(`Unsupported refactor hero event: ${neverEvent}`)
    }
  }
}

function cloneAdviceFromTemplate(template: RefactorTemplate): HeroAdvice {
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

const SUPPORTED_EVENTS: RefactorEvent[] = ['REPAIR_ANALYSIS_REQUESTED', 'PR_UPDATED']

function toRefactorEventOrThrow(eventType: string): RefactorEvent {
  if ((SUPPORTED_EVENTS as string[]).includes(eventType)) {
    return eventType as RefactorEvent
  }
  throw new Error(`Unsupported refactor hero event: ${eventType}`)
}

export const refactorHero: Hero = {
  name: 'refactorHero',
  role: 'repair',
  run: (ctx: HeroContext): HeroResult => {
    const event = toRefactorEventOrThrow(ctx.eventType)
    const template = resolveRefactorTemplate(event)
    const advice = cloneAdviceFromTemplate(template)
    return adviceToHeroResult('refactorHero', 'repair', advice)
  },
}
