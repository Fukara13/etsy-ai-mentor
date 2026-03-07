/**
 * Gate-S15: Repair Strategy — Deterministic strategy selector.
 * Gate-S30: Repair Strategy Layer — Re-exports diagnostic-to-strategy mapping.
 */

import type { FailureClass } from './failure-classifier';

export type RepairStrategy =
  | 'retry'
  | 'patch_candidate'
  | 'human_escalation'
  | 'noop';

/** Gate-S30: Map analysis to repair strategy output. */
export { mapRepairStrategy } from './repair-strategy-mapper';
export type { MapRepairStrategyInput } from './repair-strategy-mapper';
export type {
  RepairStrategyOutput,
  RepairStrategyType,
  RepairStrategyConfidence,
} from './repair-strategy.types';

/** Map failure class to repair strategy. */
export function selectRepairStrategy(failureClass: FailureClass): RepairStrategy {
  switch (failureClass) {
    case 'test_flake':
      return 'retry';
    case 'lint_error':
    case 'compile_error':
    case 'dependency_error':
      return 'patch_candidate';
    case 'policy_risk':
    case 'unknown':
      return 'human_escalation';
    default: {
      const _exhaustive: never = failureClass;
      return 'human_escalation';
    }
  }
}
