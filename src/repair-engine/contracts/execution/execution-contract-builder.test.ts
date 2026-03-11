import { describe, it, expect } from 'vitest';

import type { ExecutionEntityType } from './execution-entity-type';
import type { ExecutionPhase } from './execution-phase';
import type { ExecutionStatus } from './execution-status';
import type { ExecutionReasonCode } from './execution-reason-code';
import type { ExecutionContract } from './execution-contract';
import { buildExecutionContract } from './execution-contract-builder';

const ENTITY_TYPE: ExecutionEntityType = 'repair_run';
const PHASE: ExecutionPhase = 'executing';
const STATUS: ExecutionStatus = 'running';
const REASON: ExecutionReasonCode = 'strategy_selected';

describe('buildExecutionContract', () => {
  it('creates an execution contract with required fields', () => {
    const contract = buildExecutionContract({
      id: 'run-1',
      entityType: ENTITY_TYPE,
      phase: PHASE,
      status: STATUS,
      createdAt: 1234567890,
      operatorRequired: false,
    });

    expect(contract.id).toBe('run-1');
    expect(contract.entityType).toBe(ENTITY_TYPE);
    expect(contract.phase).toBe(PHASE);
    expect(contract.status).toBe(STATUS);
    expect(contract.reasonCode).toBeUndefined();
    expect(contract.operatorRequired).toBe(false);
    expect(contract.createdAt).toBe(1234567890);
  });

  it('validates required id field', () => {
    expect(() =>
      buildExecutionContract({
        id: '   ',
        entityType: ENTITY_TYPE,
        phase: PHASE,
        status: STATUS,
        createdAt: 1234567890,
        operatorRequired: false,
      })
    ).toThrow('ExecutionContract builder requires non-empty id.');
  });

  it('handles optional metadata', () => {
    const contractWithMetadata = buildExecutionContract({
      id: 'run-2',
      entityType: ENTITY_TYPE,
      phase: PHASE,
      status: STATUS,
      createdAt: 1234567890,
      operatorRequired: true,
      metadata: { attempt: 1, notes: 'test' },
    });

    const contractWithoutMetadata = buildExecutionContract({
      id: 'run-3',
      entityType: ENTITY_TYPE,
      phase: PHASE,
      status: STATUS,
      createdAt: 987654321,
      operatorRequired: false,
    });

    expect(contractWithMetadata.metadata).toEqual({ attempt: 1, notes: 'test' });
    expect(contractWithoutMetadata.metadata).toBeUndefined();
  });

  it('creates an immutable contract object', () => {
    const contract = buildExecutionContract({
      id: 'run-4',
      entityType: ENTITY_TYPE,
      phase: PHASE,
      status: STATUS,
      reasonCode: REASON,
      createdAt: 1234567890,
      updatedAt: 1234567900,
      operatorRequired: false,
      metadata: { attempt: 1 },
    }) as ExecutionContract;

    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.metadata)).toBe(true);
  });

  it('validates createdAt field', () => {
    expect(() =>
      buildExecutionContract({
        id: 'run-invalid',
        entityType: ENTITY_TYPE,
        phase: PHASE,
        status: STATUS,
        // @ts-expect-error runtime validation for invalid createdAt
        createdAt: NaN,
        operatorRequired: false,
      })
    ).toThrow(
      'ExecutionContract builder requires finite numeric createdAt.'
    );
  });

  it('produces equivalent results for same input', () => {
    const input = {
      id: 'run-6',
      entityType: ENTITY_TYPE,
      phase: PHASE,
      status: STATUS,
      createdAt: 1111111111,
      operatorRequired: true,
      metadata: { attempt: 2 },
    } as const;

    const first = buildExecutionContract(input);
    const second = buildExecutionContract(input);

    expect(first).toEqual(second);
  });

  it('does not mutate input object', () => {
    const input = {
      id: 'run-5',
      entityType: ENTITY_TYPE,
      phase: PHASE,
      status: STATUS,
      createdAt: 1234567890,
      operatorRequired: false,
      metadata: { attempt: 1 },
    } as const;

    const snapshot = JSON.parse(JSON.stringify(input));

    buildExecutionContract(input);

    expect(input).toEqual(snapshot);
  });
});

