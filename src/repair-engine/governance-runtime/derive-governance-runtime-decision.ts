/**
 * RE-11: Derives governance gate result from orchestrator result.
 * Pure binding: maps orchestrator output -> governance context -> gate result.
 * Reuses existing governance modules. No new governance logic.
 */

import type { RepairEngineOrchestratorResult } from '../orchestrator';
import type { GovernanceRuntimeResult } from './governance-runtime-result';
import type { RepairActionContext } from '../../governance/risk';
import { classifyRisk } from '../../governance/risk/classify-risk';
import { classifyZone } from '../../governance/zones/classify-zone';
import { evaluateSecurityPolicy } from '../../governance/security-policy/evaluate-security-policy';
import { deriveGovernanceGate } from '../../governance/policy-integration/derive-governance-gate';

function strategyTypeToAction(verdict: string, recommendedType: string | null): string {
  if (recommendedType === 'test_fix') return 'test';
  if (recommendedType === 'dependency_fix') return 'dependency';
  if (recommendedType === 'configuration_fix') return 'refactor';
  if (verdict === 'manual_investigation') return 'manual';
  return 'refactor';
}

/**
 * Builds RepairActionContext from orchestrator result for governance evaluation.
 */
function orchestratorResultToActionContext(
  result: RepairEngineOrchestratorResult
): RepairActionContext {
  const actionType = strategyTypeToAction(
    result.verdict.verdict,
    result.verdict.recommendedStrategyType
  );
  return Object.freeze({
    actionType,
    targetPath: result.event.subjectId,
    isProduction: false,
    touchesCoreEngine: false,
    touchesSecrets: false,
    isDestructive: false,
    requiresNetwork: false,
    description: result.verdict.evaluation.summary ?? result.event.summary,
  });
}

/**
 * Maps GovernanceGateResult to GovernanceRuntimeResult (same shape).
 */
function gateResultToRuntimeResult(
  gate: ReturnType<typeof deriveGovernanceGate>
): GovernanceRuntimeResult {
  return Object.freeze({
    decision: gate.decision,
    executionAllowed: gate.executionAllowed,
    requiresOperatorReview: gate.requiresOperatorReview,
    requiresEscalation: gate.requiresEscalation,
    sourcePolicyEffect: gate.sourcePolicyEffect,
    sourcePolicyRule: gate.sourcePolicyRule,
  });
}

/**
 * Derives governance runtime decision from orchestrator result.
 * Pure, deterministic, no mutation.
 */
export function deriveGovernanceRuntimeDecision(
  result: RepairEngineOrchestratorResult
): GovernanceRuntimeResult {
  const ctx = orchestratorResultToActionContext(result);
  const risk = classifyRisk(ctx);
  const zone = classifyZone(ctx);
  const policy = evaluateSecurityPolicy({ risk, zone });
  const gate = deriveGovernanceGate(policy);
  return gateResultToRuntimeResult(gate);
}
