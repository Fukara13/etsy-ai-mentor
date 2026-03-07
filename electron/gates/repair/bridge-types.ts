/**
 * Gate-S12: Orchestrator Bridge — Canonical Event & Bridge Context Types
 * Kanonik olay modeli ve köprü bağlam modeli.
 * All runtime automation enters the repair system through the Orchestrator Bridge.
 */

import type { RepairLoopState, RetryState } from './types';

/** Canonical repair event types the repair engine understands. */
export type CanonicalEventType =
  | 'CI_FAILED'
  | 'ANALYSIS_COMPLETED'
  | 'RETRY_REQUESTED'
  | 'REPAIR_EXHAUSTED'
  | 'HUMAN_HANDOFF';

/** Canonical repair event — normalized input for the state machine. */
export type CanonicalRepairEvent = {
  readonly type: CanonicalEventType;
  readonly source: string;
  readonly timestamp: string;
  readonly prNumber?: number;
  readonly workflowName?: string;
  readonly correlationId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

/** Bridge context — minimum decision inputs for the repair engine. */
export type BridgeContext = {
  readonly prNumber?: number;
  readonly retryCount: number;
  readonly hasGateReviewLabel: boolean;
  readonly isExhausted: boolean;
  readonly julesMode: 'frozen' | 'active' | 'unknown';
  readonly sourceWorkflow?: string;
  readonly lastKnownPhase?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};

/** Action plan item — typed output, no direct side effects. */
export type ActionPlanItem =
  | { readonly action: 'RUN_ANALYZER' }
  | { readonly action: 'POST_STATUS_NOTE'; readonly note?: string }
  | { readonly action: 'HANDOFF_TO_HUMAN'; readonly reason?: string };

/** Bridge result — typed output of the orchestrator bridge. */
export type BridgeResult = {
  readonly ok: boolean;
  readonly normalizedEvent: CanonicalRepairEvent;
  readonly resolvedContext: BridgeContext;
  readonly nextState: RepairLoopState;
  readonly actionPlan: readonly ActionPlanItem[];
  readonly error?: string;
};

/** Lightweight guard structure for future idempotency. Non-invasive. */
export type BridgeIdempotencyGuard = {
  readonly sessionHint?: string;
  readonly handledAt?: string;
};

/** Raw CI failure input — repository-safe minimal adapter contract. */
export type RawCIFailureInput = {
  readonly event: 'ci_failed' | 'ci-failed' | 'CI_FAILED';
  readonly source: string;
  readonly prNumber?: number;
  readonly workflowName?: string;
  readonly correlationId?: string;
};
