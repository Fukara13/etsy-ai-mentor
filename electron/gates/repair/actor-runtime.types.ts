/**
 * Gate-S22: Actor runtime types.
 */

import type { RepairState } from './repair-state-machine';

export type ActorName =
  | 'Analyzer'
  | 'RepairCoach'
  | 'JulesPlaceholder'
  | 'Guardian'
  | 'Evaluator'
  | 'RetryController'
  | 'HumanEscalation'
  | 'None';

export type ActorExecuteInput = {
  readonly currentState: RepairState;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly context?: Readonly<Record<string, unknown>>;
};

export type ActorRawOutput = {
  readonly actor: ActorName;
  readonly ok?: boolean;
  readonly event?: string;
  readonly reason?: string;
  readonly blocked?: boolean;
  readonly requiresHuman?: boolean;
  readonly terminal?: boolean;
  readonly passed?: boolean;
  readonly allowed?: boolean;
};

export type RepairRuntimeContext = {
  readonly currentState: RepairState;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly requestedEvent?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
};
