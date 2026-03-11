import { describe, it, expect } from 'vitest';

import type { ErrorTaxonomyContract } from './error-taxonomy-contract';
import type { ErrorSeverity } from './error-severity';
import type { ErrorRecoverability } from './error-recoverability';
import { buildErrorTaxonomyContract } from './error-taxonomy-builder';

describe('buildErrorTaxonomyContract', () => {
  it('builds a valid contract with explicit values', () => {
    const contract = buildErrorTaxonomyContract({
      category: 'build',
      type: 'build_failure',
      code: 'TYPESCRIPT_COMPILE_ERROR',
      severity: 'high',
      recoverability: 'operator_required',
      message: ' Type error in build pipeline ',
      metadata: { file: 'src/index.ts', line: 10 },
    });

    expect(contract.category).toBe('build');
    expect(contract.type).toBe('build_failure');
    expect(contract.code).toBe('TYPESCRIPT_COMPILE_ERROR');
    expect(contract.severity).toBe('high');
    expect(contract.recoverability).toBe('operator_required');
    expect(contract.message).toBe('Type error in build pipeline');
    expect(contract.metadata).toEqual({ file: 'src/index.ts', line: 10 });
  });

  it('applies default severity and recoverability', () => {
    const contract = buildErrorTaxonomyContract({
      category: 'test',
      type: 'test_failure',
      code: 'TEST_TIMEOUT',
      message: 'Test suite timed out',
    });

    expect(contract.severity).toBe<'medium'>('medium');
    expect(contract.recoverability).toBe<'unknown'>('unknown');
  });

  it('trims message and throws when empty after trimming', () => {
    const contract = buildErrorTaxonomyContract({
      category: 'validation',
      type: 'missing_input',
      code: 'OPERATOR_INPUT_REQUIRED',
      message: '   Missing user input   ',
    });

    expect(contract.message).toBe('Missing user input');

    expect(() =>
      buildErrorTaxonomyContract({
        category: 'validation',
        type: 'missing_input',
        code: 'OPERATOR_INPUT_REQUIRED',
        message: '   ',
      })
    ).toThrow('ErrorTaxonomyContract requires non-empty message.');
  });

  it('defaults metadata to empty frozen object and deeply freezes nested metadata', () => {
    const withDefaultMetadata = buildErrorTaxonomyContract({
      category: 'infrastructure',
      type: 'ci_failure',
      code: 'UNKNOWN_ERROR',
      message: 'CI failed without clear reason',
    }) as ErrorTaxonomyContract & { metadata: Record<string, unknown> };

    expect(withDefaultMetadata.metadata).toEqual({});
    expect(Object.isFrozen(withDefaultMetadata.metadata)).toBe(true);

    const nested = buildErrorTaxonomyContract({
      category: 'security',
      type: 'secret_violation',
      code: 'SECRET_POLICY_VIOLATION',
      message: 'Secret found in logs',
      metadata: {
        locations: ['log-1', 'log-2'],
        details: {
          key: 'API_TOKEN',
        },
      },
    }) as ErrorTaxonomyContract & {
      metadata: {
        locations: string[];
        details: { key: string };
      };
    };

    expect(Object.isFrozen(nested.metadata)).toBe(true);
    expect(Object.isFrozen(nested.metadata.locations)).toBe(true);
    expect(Object.isFrozen(nested.metadata.details)).toBe(true);
  });

  it('does not mutate the input object', () => {
    const input = {
      category: 'dependency',
      type: 'install_failure',
      code: 'MODULE_NOT_FOUND',
      message: 'Missing dependency module',
      metadata: { package: 'react' },
    } as const;

    const snapshot = JSON.parse(JSON.stringify(input));

    buildErrorTaxonomyContract(input);

    expect(input).toEqual(snapshot);
  });

  it('produces equivalent results for the same input', () => {
    const input = {
      category: 'state_machine',
      type: 'invalid_transition',
      code: 'INVALID_STATE_TRANSITION',
      severity: 'critical' as ErrorSeverity,
      recoverability: 'manual_only' as ErrorRecoverability,
      message: 'Invalid transition attempted',
      metadata: { from: 'idle', to: 'completed' },
    } as const;

    const first = buildErrorTaxonomyContract(input);
    const second = buildErrorTaxonomyContract(input);

    expect(first).toEqual(second);
  });
});

