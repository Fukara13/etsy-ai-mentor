/**
 * TH-1.5: Deterministic confidence grounding from trunk signals.
 * Maps execution result, error code, strategy outcome, and event log to ConfidenceScore.
 */

import {
  buildConfidenceScore,
  type ConfidenceFactorInput,
  type ConfidenceScore,
} from '../contracts/confidence';
import type { ExecutionResult } from '../contracts/execution/execution-result';
import type { RepairEngineErrorCode } from '../contracts/errors/repair-engine-error-code';
import type { EventLogEntry } from '../contracts/event-log/event-log-entry';

export type StrategyOutcome = 'SUCCEEDED' | 'PARTIALLY_SUCCEEDED' | 'FAILED';

export interface ConfidenceSignalsInput {
  readonly executionResult?: ExecutionResult;
  readonly errorCode?: RepairEngineErrorCode;
  readonly eventLog?: { readonly entries: readonly EventLogEntry[] };
  readonly strategyOutcome?: StrategyOutcome;
}

const FAILURE_EVENT_TYPES: readonly string[] = ['rejected', 'escalated'];

function lastEntryIndicatesFailure(entries: readonly EventLogEntry[]): boolean {
  if (entries.length === 0) return false;
  const last = entries[entries.length - 1];
  return FAILURE_EVENT_TYPES.includes(last.eventType);
}

function buildFactorsFromSignals(signals: ConfidenceSignalsInput): ConfidenceFactorInput[] {
  const executionContractPresent = signals.executionResult != null;
  const knownErrorClassification = signals.errorCode == null;
  const eventLogAvailable =
    signals.eventLog != null && signals.eventLog.entries.length > 0;
  const lastIndicatesFailure = signals.eventLog
    ? lastEntryIndicatesFailure(signals.eventLog.entries)
    : false;
  const executionSuccess = signals.executionResult?.status === 'SUCCESS';
  const strategySucceeded = signals.strategyOutcome === 'SUCCEEDED';
  const signalConsistency =
    executionSuccess &&
    strategySucceeded &&
    !lastIndicatesFailure;

  return [
    {
      factor: 'execution_contract_present',
      satisfied: executionContractPresent,
      rationale: executionContractPresent
        ? 'Execution result present'
        : 'No execution result',
    },
    {
      factor: 'known_error_classification',
      satisfied: knownErrorClassification,
      rationale: knownErrorClassification
        ? 'No error code; classification clear'
        : 'Error code present',
    },
    {
      factor: 'event_log_available',
      satisfied: eventLogAvailable,
      rationale: eventLogAvailable
        ? 'Event log has entries'
        : 'No event log or empty',
    },
    {
      factor: 'signal_consistency',
      satisfied: signalConsistency,
      rationale: signalConsistency
        ? 'Success path consistent'
        : 'Mixed or failure signals',
    },
  ];
}

export function deriveConfidenceFromSignals(
  signals: ConfidenceSignalsInput
): ConfidenceScore {
  const factors = buildFactorsFromSignals(signals);
  return buildConfidenceScore(factors);
}
