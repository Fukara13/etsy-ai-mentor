/**
 * RE-11: Post-orchestrator governance binding. Does NOT modify orchestrator.
 * Pure: takes orchestrator result, attaches governance, returns combined result.
 */

import type { RepairEngineOrchestratorResult } from '../orchestrator';
import type { GovernanceRuntimeResult } from './governance-runtime-result';
import { deriveGovernanceRuntimeDecision } from './derive-governance-runtime-decision';

export type GovernanceBoundOrchestratorResult = RepairEngineOrchestratorResult & {
  readonly governance: GovernanceRuntimeResult;
};

/**
 * Binds governance runtime decision to orchestrator result.
 * Post-orchestrator only. Orchestrator remains unchanged.
 */
export function bindGovernanceRuntime(
  result: RepairEngineOrchestratorResult
): GovernanceBoundOrchestratorResult {
  const governance = deriveGovernanceRuntimeDecision(result);
  return Object.freeze({
    ...result,
    governance,
  });
}
