/**
 * Gate-S25: Operator handoff — Canonical domain types.
 */

import type { RepairRunVerdictStatus, RepairRunVerdictReasonCode } from './repair-run-verdict';
import type { RepairState } from './repair-state';

export type HandoffIntent = 'inform' | 'review' | 'intervene' | 'stop';

export type NextAction =
  | 'close_safe'
  | 'retry_safe'
  | 'review_required'
  | 'manual_repair_required'
  | 'blocked_no_action';

export interface RepairOperatorHandoff {
  readonly status: RepairRunVerdictStatus;
  readonly reasonCode: RepairRunVerdictReasonCode;
  readonly finalState: RepairState;
  readonly requiresHuman: boolean;
  readonly safeToRetry: boolean;
  readonly safeToClose: boolean;
  readonly handoffIntent: HandoffIntent;
  readonly operatorMessage: string;
  readonly summary: string;
  readonly nextAction: NextAction;
}
