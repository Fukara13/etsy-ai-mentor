import { describe, it, expect } from 'vitest';

import { buildExecutionResult } from './execution-result-builder';
import { RepairEngineError } from '../errors/repair-engine-error';
import { RepairEngineErrorCode } from '../errors/repair-engine-error-code';

describe('buildExecutionResult', () => {
  it('accepts valid status SUCCESS', () => {
    const result = buildExecutionResult({ status: 'SUCCESS' });
    expect(result.status).toBe('SUCCESS');
    expect(result.errorCode).toBeUndefined();
  });

  it('accepts valid status FAILURE', () => {
    const result = buildExecutionResult({ status: 'FAILURE' });
    expect(result.status).toBe('FAILURE');
  });

  it('accepts valid status SKIPPED', () => {
    const result = buildExecutionResult({ status: 'SKIPPED' });
    expect(result.status).toBe('SKIPPED');
  });

  it('accepts valid status RETRYABLE', () => {
    const result = buildExecutionResult({ status: 'RETRYABLE' });
    expect(result.status).toBe('RETRYABLE');
  });

  it('rejects invalid status', () => {
    expect(() => buildExecutionResult({ status: 'PENDING' })).toThrow(
      'ExecutionResult requires status to be one of: SUCCESS, FAILURE, SKIPPED, RETRYABLE'
    );
    expect(() => buildExecutionResult({ status: '' })).toThrow();
    expect(() => buildExecutionResult({ status: 'invalid' })).toThrow();
  });

  it('returns immutable result', () => {
    const result = buildExecutionResult({ status: 'SUCCESS' });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('produces deterministic output for same input', () => {
    const a = buildExecutionResult({ status: 'FAILURE', errorCode: RepairEngineErrorCode.STRATEGY_FAILURE });
    const b = buildExecutionResult({ status: 'FAILURE', errorCode: RepairEngineErrorCode.STRATEGY_FAILURE });
    expect(a).toEqual(b);
    expect(a.status).toBe(b.status);
    expect(a.errorCode).toBe(b.errorCode);
  });

  it('is compatible with RepairEngineError via errorCode', () => {
    const err = new RepairEngineError(
      RepairEngineErrorCode.CONTRACT_VIOLATION,
      'Missing required field'
    );
    const result = buildExecutionResult({
      status: 'FAILURE',
      errorCode: err.code,
    });
    expect(result.status).toBe('FAILURE');
    expect(result.errorCode).toBe(RepairEngineErrorCode.CONTRACT_VIOLATION);
  });

  it('does not mutate input', () => {
    const input = { status: 'SUCCESS' as const, errorCode: RepairEngineErrorCode.VALIDATION_ERROR };
    const snapshot = JSON.parse(JSON.stringify(input));
    buildExecutionResult(input);
    expect(input).toEqual(snapshot);
  });
});
