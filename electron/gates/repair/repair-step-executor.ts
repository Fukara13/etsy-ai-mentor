/**
 * Gate-S22: One-step repair executor. No loop, no recursion.
 */

import type { RepairState } from './repair-state';
import type { RepairEvent } from './repair-event';
import type { RepairRuntimeContext } from './actor-runtime.types';
import type { NormalizedActorResult } from './actor-result';
import { transition } from './state-transition';
import { isTerminalRepairState } from './repair-state-machine';
import { getActorForState } from './step-actor-dispatcher';
import { ACTOR_REGISTRY } from './actor-runtime';
import { normalizeActorResult } from './actor-result';

export type StepExecutionResult = {
  readonly previousState: RepairState;
  readonly actor: string;
  readonly normalizedResult: NormalizedActorResult;
  readonly transitionEvent: RepairEvent | null;
  readonly nextState: RepairState;
  readonly halted: boolean;
  readonly requiresHuman: boolean;
  readonly terminal: boolean;
};

function toRepairEvent(s: string | undefined): RepairEvent | null {
  if (!s) return null;
  const valid: RepairEvent[] = [
    'CI_FAILURE_START', 'ANALYSIS_COMPLETED', 'COACH_COMPLETED',
    'JULES_FROZEN_OUTCOME', 'JULES_PATCH_PRODUCED', 'GUARDIAN_COMPLETED',
    'EVALUATOR_PASSED', 'EVALUATOR_FAILED', 'CI_RETRY_COMPLETED',
    'RETRY_LIMIT_REACHED', 'PLAN_REQUIRES_HUMAN', 'HUMAN_ESCALATION',
  ];
  return valid.includes(s as RepairEvent) ? (s as RepairEvent) : null;
}

function safeTransition(
  from: RepairState,
  event: RepairEvent
): RepairState {
  return transition(from, event);
}

export function executeRepairStep(ctx: RepairRuntimeContext): StepExecutionResult {
  const { currentState, retryCount, maxRetries } = ctx;
  const actorName = getActorForState(currentState as RepairState);

  if (actorName === 'None' || isTerminalRepairState(currentState as RepairState)) {
    return {
      previousState: currentState as RepairState,
      actor: actorName,
      normalizedResult: {
        actor: actorName,
        status: 'ok',
        reason: 'Terminal or no-op',
        blocked: false,
        requiresHuman: currentState === 'HUMAN',
        terminal: currentState === 'HUMAN',
      },
      transitionEvent: null,
      nextState: currentState as RepairState,
      halted: true,
      requiresHuman: currentState === 'HUMAN',
      terminal: currentState === 'HUMAN',
    };
  }

  const actorFn = ACTOR_REGISTRY.get(actorName);
  if (!actorFn) {
    return {
      previousState: currentState as RepairState,
      actor: actorName,
      normalizedResult: {
        actor: actorName,
        status: 'blocked',
        reason: 'Unknown actor',
        blocked: true,
        requiresHuman: true,
        terminal: false,
      },
      transitionEvent: null,
      nextState: currentState as RepairState,
      halted: true,
      requiresHuman: true,
      terminal: false,
    };
  }

  const raw = actorFn({
    currentState: currentState as RepairState,
    retryCount,
    maxRetries: maxRetries ?? 3,
    context: ctx.metadata,
  });

  const normalized = normalizeActorResult(raw);
  const event = toRepairEvent(normalized.recommendedEvent ?? raw.event);

  if (normalized.blocked) {
    const fallbackEvent = 'HUMAN_ESCALATION' as RepairEvent;
    const nextState = safeTransition(currentState as RepairState, fallbackEvent);
    return {
      previousState: currentState as RepairState,
      actor: actorName,
      normalizedResult: normalized,
      transitionEvent: fallbackEvent,
      nextState,
      halted: true,
      requiresHuman: true,
      terminal: nextState === 'HUMAN',
    };
  }

  if (!event && normalized.requiresHuman) {
    const fallbackEvent = 'HUMAN_ESCALATION' as RepairEvent;
    const nextState = safeTransition(currentState as RepairState, fallbackEvent);
    return {
      previousState: currentState as RepairState,
      actor: actorName,
      normalizedResult: normalized,
      transitionEvent: fallbackEvent,
      nextState,
      halted: true,
      requiresHuman: true,
      terminal: nextState === 'HUMAN',
    };
  }

  if (!event) {
    return {
      previousState: currentState as RepairState,
      actor: actorName,
      normalizedResult: normalized,
      transitionEvent: null,
      nextState: currentState as RepairState,
      halted: true,
      requiresHuman: false,
      terminal: false,
    };
  }

  const nextState = safeTransition(currentState as RepairState, event);
  return {
    previousState: currentState as RepairState,
    actor: actorName,
    normalizedResult: normalized,
    transitionEvent: event,
    nextState,
    halted: isTerminalRepairState(nextState),
    requiresHuman: nextState === 'HUMAN',
    terminal: nextState === 'HUMAN',
  };
}
