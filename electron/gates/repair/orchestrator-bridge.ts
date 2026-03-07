/**
 * Gate-S12: Orchestrator Bridge — Orkestratör Köprüsü
 * Connects external repair events to the repair state machine.
 * Returns typed action plan; no direct runtime side effects.
 */

import type {
  BridgeContext,
  BridgeResult,
  ActionPlanItem,
  CanonicalRepairEvent,
  ContextResolverInput,
} from './bridge-types';
import type { RawEventInput } from './event-normalizer';
import type { NormalizeOptions } from './event-normalizer';
import { normalizeEvent } from './event-normalizer';
import { resolveContext } from './context-resolver';
import { ciFailToAnalyze } from './state-machine';

export type BridgeInput = {
  readonly rawEvent: RawEventInput;
  readonly contextInput?: ContextResolverInput;
  readonly normalizeOptions?: NormalizeOptions;
};

/**
 * Orchestrator bridge: normalize event, resolve context, dispatch to state machine.
 * Returns typed bridge result with action plan. Does not execute actions.
 */
export function runOrchestratorBridge(input: BridgeInput): BridgeResult {
  const { rawEvent, contextInput = {}, normalizeOptions } = input;

  const normalizeResult = normalizeEvent(rawEvent, normalizeOptions);
  if (!normalizeResult.ok) {
    return buildErrorResult(rawEvent, normalizeResult.error, contextInput);
  }

  const resolveResult = resolveContext(contextInput);
  if (!resolveResult.ok) {
    return buildErrorResult(rawEvent, resolveResult.error, contextInput);
  }

  const event = normalizeResult.event;
  const context = resolveResult.context;

  return dispatchToStateMachine(event, context);
}

function buildErrorResult(
  rawEvent: RawEventInput,
  error: string,
  contextInput: ContextResolverInput
): BridgeResult {
  const fallbackContext = resolveContext(contextInput);
  const resolvedContext = fallbackContext.ok ? fallbackContext.context : createFallbackContext();
  const fallbackEvent = {
    type: 'CI_FAILED' as const,
    source: String((rawEvent as Record<string, unknown>).source ?? 'unknown'),
    timestamp: new Date().toISOString(),
  };
  return {
    ok: false,
    normalizedEvent: fallbackEvent,
    resolvedContext,
    nextState: { phase: 'IDLE' },
    actionPlan: [{ action: 'HANDOFF_TO_HUMAN' as const, reason: error }],
    error,
  };
}

function createFallbackContext(): BridgeContext {
  return {
    retryCount: 0,
    hasGateReviewLabel: false,
    isExhausted: false,
    julesMode: 'unknown',
  };
}

function dispatchToStateMachine(event: { type: string }, context: BridgeContext): BridgeResult {
  if (event.type === 'CI_FAILED') {
    const nextState = ciFailToAnalyze();
    const actionPlan: readonly ActionPlanItem[] = [{ action: 'RUN_ANALYZER' }];
    return {
      ok: true,
      normalizedEvent: event as CanonicalRepairEvent,
      resolvedContext: context,
      nextState,
      actionPlan,
    };
  }

  return {
    ok: false,
    normalizedEvent: event as CanonicalRepairEvent,
    resolvedContext: context,
    nextState: { phase: 'IDLE' },
    actionPlan: [{ action: 'HANDOFF_TO_HUMAN', reason: `Unhandled event type: ${event.type}` }],
    error: `Unhandled event type: ${event.type}`,
  };
}
