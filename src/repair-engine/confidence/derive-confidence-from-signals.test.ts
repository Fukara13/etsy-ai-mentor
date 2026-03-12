import { describe, it, expect } from 'vitest';

import {
  deriveConfidenceFromSignals,
  type ConfidenceSignalsInput,
  type StrategyOutcome,
} from './derive-confidence-from-signals';
import type { ExecutionResult } from '../contracts/execution/execution-result';
import { RepairEngineErrorCode } from '../contracts/errors/repair-engine-error-code';
import type { EventLogEntry } from '../contracts/event-log/event-log-entry';

function makeEntry(overrides: Partial<EventLogEntry> = {}): EventLogEntry {
  return {
    entityType: 'repair_run',
    entityId: 'run-1',
    eventType: 'created',
    reasonCode: 'RUN_CREATED',
    phase: 'received',
    status: 'running',
    sequence: 0,
    payload: {},
    metadata: {},
    ...overrides,
  };
}

describe('deriveConfidenceFromSignals', () => {
  it('returns HIGH for clean success path', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'SUCCESS' },
      strategyOutcome: 'SUCCEEDED',
    };

    const score = deriveConfidenceFromSignals(signals);

    expect(score.level).toBe('high');
    expect(score.value).toBeGreaterThanOrEqual(75);
  });

  it('returns HIGH when success with event log ending in approved', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'SUCCESS' },
      strategyOutcome: 'SUCCEEDED',
      eventLog: {
        entries: [
          makeEntry({ eventType: 'created', sequence: 0 }),
          makeEntry({ eventType: 'approved', sequence: 1 }),
        ],
      },
    };

    const score = deriveConfidenceFromSignals(signals);

    expect(score.level).toBe('high');
  });

  it('returns MEDIUM for retryable / partial success path', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'RETRYABLE' },
      strategyOutcome: 'PARTIALLY_SUCCEEDED',
    };

    const score = deriveConfidenceFromSignals(signals);

    expect(score.level).toBe('medium');
  });

  it('returns LOW for failure + severe error path', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'FAILURE', errorCode: RepairEngineErrorCode.STRATEGY_FAILURE },
      errorCode: RepairEngineErrorCode.STRATEGY_FAILURE,
      strategyOutcome: 'FAILED',
    };

    const score = deriveConfidenceFromSignals(signals);

    expect(score.level).toBe('low');
  });

  it('produces deterministic output for identical inputs', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'SUCCESS' },
      strategyOutcome: 'SUCCEEDED',
    };

    const a = deriveConfidenceFromSignals(signals);
    const b = deriveConfidenceFromSignals(signals);

    expect(a).toEqual(b);
    expect(a.level).toBe(b.level);
    expect(a.value).toBe(b.value);
  });

  it('does not mutate provided inputs', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'SUCCESS' },
      eventLog: { entries: [makeEntry()] },
    };
    const snapshot = JSON.parse(JSON.stringify(signals));

    deriveConfidenceFromSignals(signals);

    expect(signals).toEqual(snapshot);
  });

  it('works when optional fields are absent', () => {
    const signals: ConfidenceSignalsInput = {};

    const score = deriveConfidenceFromSignals(signals);

    expect(score.level).toBe('low');
    expect(score.value).toBe(25);
  });

  it('integrates correctly with ExecutionResult contract', () => {
    const executionResult: ExecutionResult = { status: 'SKIPPED' };
    const signals: ConfidenceSignalsInput = { executionResult };

    const score = deriveConfidenceFromSignals(signals);

    expect(score.factors.some((f) => f.factor === 'execution_contract_present' && f.satisfied)).toBe(true);
    expect(score.level).toBe('medium');
  });

  it('integrates correctly with RepairEngineErrorCode when provided', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'FAILURE', errorCode: RepairEngineErrorCode.CONTRACT_VIOLATION },
      errorCode: RepairEngineErrorCode.CONTRACT_VIOLATION,
    };

    const score = deriveConfidenceFromSignals(signals);

    expect(score.factors.find((f) => f.factor === 'known_error_classification')?.satisfied).toBe(false);
    expect(score.level).toBe('low');
  });

  it('uses event log signals conservatively and deterministically', () => {
    const signalsWithFailureEvent: ConfidenceSignalsInput = {
      strategyOutcome: 'SUCCEEDED',
      eventLog: {
        entries: [
          makeEntry({ eventType: 'created', sequence: 0 }),
          makeEntry({ eventType: 'escalated', sequence: 1 }),
        ],
      },
    };

    const score = deriveConfidenceFromSignals(signalsWithFailureEvent);

    expect(score.factors.find((f) => f.factor === 'signal_consistency')?.satisfied).toBe(false);
    expect(score.level).toBe('medium');
  });

  it('returns frozen / immutable structures', () => {
    const signals: ConfidenceSignalsInput = {
      executionResult: { status: 'SUCCESS' },
      strategyOutcome: 'SUCCEEDED',
    };

    const score = deriveConfidenceFromSignals(signals);

    expect(Object.isFrozen(score)).toBe(true);
    expect(Object.isFrozen(score.factors)).toBe(true);
  });
});
