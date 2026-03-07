/**
 * Gate-S24: Repair run verdict — Interpretation result from bounded repair loop.
 */

export type RepairRunVerdictStatus =
  | 'resolved'
  | 'requires_human'
  | 'halted'
  | 'blocked';

export type RepairRunVerdictReasonCode =
  | 'RUN_RESOLVED'
  | 'RUN_EXHAUSTED'
  | 'RUN_POLICY_BLOCKED'
  | 'RUN_CYCLE_SUSPECTED'
  | 'RUN_MAX_STEPS_REACHED'
  | 'RUN_TERMINAL_HUMAN'
  | 'RUN_HALTED_BLOCKED';

export interface RepairRunVerdict {
  readonly status: RepairRunVerdictStatus;
  readonly reasonCode: RepairRunVerdictReasonCode;
  readonly requiresHuman: boolean;
  readonly safeToRetry: boolean;
  readonly safeToClose: boolean;
  readonly operatorMessage: string;
}
