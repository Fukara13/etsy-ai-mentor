/**
 * Gate-S24: Repair run verdict mapper — Pure interpretation of run outcome.
 */

import type { RepairRunOutcome } from './repair-run-outcome';
import type { RepairRunVerdict } from './repair-run-verdict';

function verdict(
  status: RepairRunVerdict['status'],
  reasonCode: RepairRunVerdict['reasonCode'],
  requiresHuman: boolean,
  safeToRetry: boolean,
  safeToClose: boolean,
  operatorMessage: string
): RepairRunVerdict {
  return {
    status,
    reasonCode,
    requiresHuman,
    safeToRetry,
    safeToClose,
    operatorMessage,
  };
}

export function deriveRepairRunVerdict(runOutcome: RepairRunOutcome): RepairRunVerdict {
  if (runOutcome.exhaustionReached) {
    return verdict(
      'requires_human',
      'RUN_EXHAUSTED',
      true,
      false,
      true,
      'Repair run exhausted retry limit. Human intervention required.'
    );
  }

  if (runOutcome.requiresHuman && runOutcome.terminationReason === 'cycle_suspicion') {
    return verdict(
      'requires_human',
      'RUN_CYCLE_SUSPECTED',
      true,
      false,
      true,
      'Repair run halted due to suspected cycle. Human intervention required.'
    );
  }

  if (runOutcome.halted && runOutcome.terminationReason === 'blocked') {
    return verdict(
      'blocked',
      'RUN_POLICY_BLOCKED',
      true,
      false,
      true,
      'Repair blocked by policy. Human intervention required.'
    );
  }

  if (runOutcome.requiresHuman) {
    return verdict(
      'requires_human',
      'RUN_TERMINAL_HUMAN',
      true,
      false,
      true,
      'Repair run requires human intervention.'
    );
  }

  if (runOutcome.terminal && !runOutcome.requiresHuman) {
    return verdict(
      'resolved',
      'RUN_RESOLVED',
      false,
      false,
      true,
      'Repair run resolved successfully.'
    );
  }

  if (runOutcome.halted && runOutcome.terminationReason === 'max_steps') {
    return verdict(
      'halted',
      'RUN_MAX_STEPS_REACHED',
      false,
      true,
      false,
      'Repair halted due to max step limit.'
    );
  }

  if (runOutcome.halted) {
    return verdict(
      'halted',
      'RUN_HALTED_BLOCKED',
      false,
      true,
      false,
      'Repair run halted.'
    );
  }

  return verdict(
    'resolved',
    'RUN_RESOLVED',
    false,
    false,
    true,
    'Repair run resolved successfully.'
  );
}
