/**
 * Gate-S23: Repair run outcome — Final handoff contract.
 */

import type { RepairState } from './repair-state';

export type TerminationReason =
  | 'terminal_state'
  | 'requires_human'
  | 'blocked'
  | 'halted'
  | 'max_steps'
  | 'cycle_suspicion'
  | 'exhaustion_escalation';

export type RepairRunOutcome = {
  readonly sessionId: string;
  readonly initialState: RepairState;
  readonly finalState: RepairState;
  readonly totalSteps: number;
  readonly visitedPath: readonly RepairState[];
  readonly halted: boolean;
  readonly terminal: boolean;
  readonly requiresHuman: boolean;
  readonly exhaustionReached: boolean;
  readonly terminationReason: TerminationReason;
  readonly lastTransitionEvent: string | null;
  readonly lastActor: string;
  readonly startedAt: string;
  readonly endedAt: string;
};
