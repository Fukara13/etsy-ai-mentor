/**
 * Confidence integration: derives ConfidenceScore from verdict context.
 * TH-1.2: Also attaches canonical error type to verdict context.
 * Pure, deterministic. Uses FR-4 confidence and error classifier models.
 */

import {
  buildConfidenceScore,
  type ConfidenceFactorInput,
  type ConfidenceScore,
} from '../contracts/confidence';
import type { RepairStrategyType } from '../contracts/repair-strategy-type';
import type { RepairVerdictDecision } from '../contracts/repair-verdict-decision';
import { classifyError } from '../contracts/error/error-classifier';
import { ErrorType } from '../contracts/error/error-type';

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

export type VerdictErrorContext = VerdictContext & {
  readonly errorType: ErrorType;
};

export function attachErrorTypeToVerdictContext(
  context: VerdictContext,
  rawErrorMessage: string
): VerdictErrorContext {
  const errorType = classifyError({ message: rawErrorMessage });

  return {
    ...context,
    errorType,
  };
}

