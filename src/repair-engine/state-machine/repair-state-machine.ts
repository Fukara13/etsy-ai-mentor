/**
 * RE-1: Pure repair state machine.
 * Deterministic, no I/O. Evaluates transitions and produces verdicts.
 */

import type { RepairLifecycleState } from '../contracts/repair-lifecycle-state'
import type { RepairVerdict } from '../contracts/repair-verdict'
import { REPAIR_LEGAL_TRANSITIONS } from '../contracts/repair-transition'
import type { RepairEngineEvaluation } from '../contracts/repair-engine-evaluation'
import { shouldEscalateRepairAttempt } from '../escalation/repair-escalation-policy'

export class RepairStateMachine {
  /**
   * Checks whether the transition is in the legal transitions list.
   */
  isLegalTransition(from: RepairLifecycleState, to: RepairLifecycleState): boolean {
    return REPAIR_LEGAL_TRANSITIONS.some((t) => t.from === from && t.to === to)
  }

  /**
   * Returns all legal next states from a given state.
   * Returns a fresh array; no mutation.
   */
  getAllowedNextStates(from: RepairLifecycleState): RepairLifecycleState[] {
    const next = REPAIR_LEGAL_TRANSITIONS.filter((t) => t.from === from).map((t) => t.to)
    return [...next]
  }

  /**
   * Evaluates a requested transition.
   * Pure, synchronous. Escalation overrides verdict when triggered.
   */
  evaluate(params: {
    currentState: RepairLifecycleState
    nextState: RepairLifecycleState
    attemptCount?: number
  }): RepairEngineEvaluation {
    const { currentState, nextState } = params
    const attemptCount = params.attemptCount ?? 0
    const isLegal = this.isLegalTransition(currentState, nextState)
    const escalationTriggered = shouldEscalateRepairAttempt(attemptCount)

    // Rule 3–4: Escalation takes precedence. Verdict = escalated, do not rewrite nextState.
    if (escalationTriggered) {
      return {
        currentState,
        nextState,
        isLegalTransition: isLegal,
        verdict: 'escalated',
        escalationTriggered: true,
        reasonCodes: ['RETRY_LIMIT_REACHED', 'MANUAL_INTERVENTION_REQUIRED'],
      }
    }

    // Rule 5: Illegal transition => blocked
    if (!isLegal) {
      return {
        currentState,
        nextState,
        isLegalTransition: false,
        verdict: 'blocked',
        escalationTriggered: false,
        reasonCodes: ['ILLEGAL_TRANSITION'],
      }
    }

    // Rules 6–10: Legal transition, no escalation. Verdict by nextState.
    const { verdict, reasonCodes } = this.verdictForLegalTransition(nextState)
    return {
      currentState,
      nextState,
      isLegalTransition: true,
      verdict,
      escalationTriggered: false,
      reasonCodes: [...reasonCodes],
    }
  }

  private verdictForLegalTransition(
    nextState: RepairLifecycleState
  ): { verdict: RepairVerdict; reasonCodes: string[] } {
    switch (nextState) {
      case 'FAILURE_DETECTED':
      case 'ANALYZING':
        return { verdict: 'informational', reasonCodes: ['STATE_PROGRESS_ALLOWED'] }
      case 'STRATEGY_READY':
        return {
          verdict: 'needs_review',
          reasonCodes: ['STRATEGY_AVAILABLE', 'HUMAN_REVIEW_APPROACHING'],
        }
      case 'AWAITING_HUMAN_REVIEW':
        return {
          verdict: 'safe_with_human_approval',
          reasonCodes: ['HUMAN_DECISION_REQUIRED'],
        }
      case 'APPROVED':
      case 'REJECTED':
      case 'CLOSED':
        return { verdict: 'needs_review', reasonCodes: ['STATE_PROGRESS_ALLOWED'] }
      case 'ESCALATED':
        return {
          verdict: 'escalated',
          reasonCodes: ['ESCALATION_STATE_ENTERED'],
        }
      default:
        return { verdict: 'needs_review', reasonCodes: ['STATE_PROGRESS_ALLOWED'] }
    }
  }
}
