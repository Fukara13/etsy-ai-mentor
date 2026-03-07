/**
 * Gate-S30: Repair Strategy Layer — Canonical types for diagnostic-to-strategy mapping.
 */

export type RepairStrategyType =
  | 'retry_ci'
  | 'dependency_fix'
  | 'test_flaky'
  | 'configuration_issue'
  | 'human_investigation'
  | 'unknown';

export type RepairStrategyConfidence = 'low' | 'medium' | 'high';

export interface RepairStrategyOutput {
  readonly strategyType: RepairStrategyType;
  readonly confidence: RepairStrategyConfidence;
  readonly recommendedActions: readonly string[];
  readonly targetFiles?: readonly string[];
  readonly rationale: string;
  readonly requiresHuman: boolean;
  readonly safeToAutoExecute: false;
}
