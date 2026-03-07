/**
 * Gate-S25: Operator handoff mapper — Pure mapping from verdict (+ outcome) to handoff envelope.
 */

import type { RepairRunOutcome } from './repair-run-outcome';
import type { RepairRunVerdict } from './repair-run-verdict';
import type { RepairOperatorHandoff, HandoffIntent, NextAction } from './operator-handoff.types';
import type { RepairRunVerdictReasonCode } from './repair-run-verdict';
import type { RepairState } from './repair-state';

export type MapRepairOperatorHandoffParams = {
  readonly verdict: RepairRunVerdict;
  readonly outcome?: RepairRunOutcome;
};

const DEFAULT_FINAL_STATE: RepairState = 'HUMAN';

function resolveFinalState(outcome: RepairRunOutcome | undefined): RepairState {
  return outcome?.finalState ?? DEFAULT_FINAL_STATE;
}

type Rule = {
  handoffIntent: HandoffIntent;
  nextAction: NextAction;
  summary: string;
  safeToClose?: boolean;
  safeToRetry?: boolean;
  requiresHuman?: boolean;
};

const REASON_CODE_RULES: Record<RepairRunVerdictReasonCode, Rule> = {
  RUN_RESOLVED: {
    handoffIntent: 'inform',
    nextAction: 'close_safe',
    summary: 'Repair resolved.',
  },
  RUN_EXHAUSTED: {
    handoffIntent: 'intervene',
    nextAction: 'manual_repair_required',
    summary: 'Repair exhausted. Human required.',
    safeToClose: false,
  },
  RUN_TERMINAL_HUMAN: {
    handoffIntent: 'intervene',
    nextAction: 'manual_repair_required',
    summary: 'Repair requires human.',
  },
  RUN_POLICY_BLOCKED: {
    handoffIntent: 'stop',
    nextAction: 'blocked_no_action',
    summary: 'Repair blocked by policy.',
    safeToRetry: false,
    safeToClose: false,
  },
  RUN_CYCLE_SUSPECTED: {
    handoffIntent: 'review',
    nextAction: 'review_required',
    summary: 'Repair cycle suspected. Review required.',
  },
  RUN_MAX_STEPS_REACHED: {
    handoffIntent: 'review',
    nextAction: 'review_required',
    summary: 'Repair halted at max steps. Review required.',
  },
  RUN_HALTED_BLOCKED: {
    handoffIntent: 'stop',
    nextAction: 'blocked_no_action',
    summary: 'Repair halted.',
    requiresHuman: true,
  },
};

export function mapRepairOperatorHandoff(
  params: MapRepairOperatorHandoffParams
): RepairOperatorHandoff {
  const { verdict, outcome } = params;
  const rule = REASON_CODE_RULES[verdict.reasonCode];

  return {
    status: verdict.status,
    reasonCode: verdict.reasonCode,
    finalState: resolveFinalState(outcome),
    requiresHuman: rule.requiresHuman ?? verdict.requiresHuman,
    safeToRetry: rule.safeToRetry ?? verdict.safeToRetry,
    safeToClose: rule.safeToClose ?? verdict.safeToClose,
    handoffIntent: rule.handoffIntent,
    operatorMessage: verdict.operatorMessage,
    summary: rule.summary,
    nextAction: rule.nextAction,
  };
}
