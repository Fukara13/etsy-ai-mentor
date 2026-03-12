/**
 * Confidence integration: derives ConfidenceScore from verdict context.
 * Pure, deterministic. Uses FR-4 confidence model.
 */

import {
  buildConfidenceScore,
  type ConfidenceFactorInput,
  type ConfidenceScore,
} from '../contracts/confidence';
import type { RepairStrategyType } from '../contracts/repair-strategy-type';
import type { RepairVerdictDecision } from '../contracts/repair-verdict-decision';

export type VerdictContext = {
  readonly verdict: RepairVerdictDecision;
  readonly strategyCount: number;
  readonly hasManualInvestigation: boolean;
  readonly dominantStrategyType: RepairStrategyType | null;
};

function buildFactors(ctx: VerdictContext): ConfidenceFactorInput[] {
  const executionContractPresent = ctx.strategyCount > 0;
  const knownErrorClassification = true;
  const eventLogAvailable = false;
  const signalConsistency = ctx.strategyCount === 1;

  return [
    {
      factor: 'execution_contract_present',
      satisfied: executionContractPresent,
      rationale: executionContractPresent
        ? 'Strategy candidates available'
        : 'No strategy candidates',
    },
    {
      factor: 'known_error_classification',
      satisfied: knownErrorClassification,
      rationale: 'Verdict outcome determined',
    },
    {
      factor: 'event_log_available',
      satisfied: eventLogAvailable,
      rationale: 'Event log not in verdict scope',
    },
    {
      factor: 'signal_consistency',
      satisfied: signalConsistency,
      rationale: signalConsistency
        ? 'Single strategy path'
        : 'Multiple or ambiguous signals',
    },
  ];
}

export function deriveConfidenceForVerdictContext(ctx: VerdictContext): ConfidenceScore {
  const factors = buildFactors(ctx);
  return buildConfidenceScore(factors);
}
