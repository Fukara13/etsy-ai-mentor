import { describe, it, expect } from 'vitest';

import { RepairEngineError } from './repair-engine-error';
import { RepairEngineErrorCode } from './repair-engine-error-code';

describe('RepairEngineError', () => {
  it('creates a RepairEngineError with the given code', () => {
    const err = new RepairEngineError(
      RepairEngineErrorCode.VALIDATION_ERROR,
      'Invalid input'
    );

    expect(err.code).toBe(RepairEngineErrorCode.VALIDATION_ERROR);
  });

  it('preserves the message', () => {
    const message = 'Contract violation: missing field';
    const err = new RepairEngineError(
      RepairEngineErrorCode.CONTRACT_VIOLATION,
      message
    );

    expect(err.message).toBe(message);
  });

  it('sets name to "RepairEngineError"', () => {
    const err = new RepairEngineError(
      RepairEngineErrorCode.STRATEGY_FAILURE,
      'Strategy failed'
    );

    expect(err.name).toBe('RepairEngineError');
  });

  it('supports instanceof RepairEngineError', () => {
    const err = new RepairEngineError(
      RepairEngineErrorCode.ENGINE_INVARIANT_VIOLATION,
      'Invariant broken'
    );

    expect(err instanceof RepairEngineError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it('instance is frozen', () => {
    const err = new RepairEngineError(
      RepairEngineErrorCode.VALIDATION_ERROR,
      'Bad'
    );

    expect(Object.isFrozen(err)).toBe(true);
  });

  it('deterministic shape for the same constructor input', () => {
    const a = new RepairEngineError(
      RepairEngineErrorCode.CONTRACT_VIOLATION,
      'Same message'
    );
    const b = new RepairEngineError(
      RepairEngineErrorCode.CONTRACT_VIOLATION,
      'Same message'
    );

    expect(a.code).toBe(b.code);
    expect(a.message).toBe(b.message);
    expect(a.name).toBe(b.name);
  });
});

describe('RepairEngineErrorCode', () => {
  it('exports expected stable string values', () => {
    expect(RepairEngineErrorCode.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(RepairEngineErrorCode.CONTRACT_VIOLATION).toBe('CONTRACT_VIOLATION');
    expect(RepairEngineErrorCode.STRATEGY_FAILURE).toBe('STRATEGY_FAILURE');
    expect(RepairEngineErrorCode.ENGINE_INVARIANT_VIOLATION).toBe(
      'ENGINE_INVARIANT_VIOLATION'
    );
  });
});
