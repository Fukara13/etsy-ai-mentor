import type { ExecutionContract } from './execution-contract';
import type { ExecutionEntityType } from './execution-entity-type';
import type { ExecutionPhase } from './execution-phase';
import type { ExecutionStatus } from './execution-status';
import type { ExecutionReasonCode } from './execution-reason-code';

export interface ExecutionContractInput {
  readonly id: string;
  readonly entityType: ExecutionEntityType;
  readonly phase: ExecutionPhase;
  readonly status: ExecutionStatus;
  readonly createdAt: number;
  readonly updatedAt?: number;
  readonly reasonCode?: ExecutionReasonCode;
  readonly operatorRequired: boolean;
  readonly metadata?: Record<string, unknown>;
}

function normalizeNonEmptyString(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`ExecutionContract builder requires non-empty ${field}.`);
  }

  return normalized;
}

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  const obj = value as Record<string, unknown>;

  Object.getOwnPropertyNames(obj).forEach((prop) => {
    const propValue = (obj as Record<string, unknown>)[prop];
    if (propValue && typeof propValue === 'object') {
      deepFreeze(propValue);
    }
  });

  return Object.freeze(obj) as T;
}

export function buildExecutionContract(input: ExecutionContractInput): ExecutionContract {
  const id = normalizeNonEmptyString(input.id, 'id');
  const createdAt = input.createdAt;

  if (!Number.isFinite(createdAt)) {
    throw new Error(
      'ExecutionContract builder requires finite numeric createdAt.'
    );
  }

  const updatedAt = input.updatedAt;

  if (updatedAt !== undefined && !Number.isFinite(updatedAt)) {
    throw new Error(
      'ExecutionContract builder requires finite numeric updatedAt when provided.'
    );
  }

  const metadata = input.metadata ? deepFreeze({ ...input.metadata }) : undefined;

  const contract: ExecutionContract = {
    id,
    entityType: input.entityType,
    phase: input.phase,
    status: input.status,
    reasonCode: input.reasonCode,
    createdAt,
    updatedAt,
    operatorRequired: input.operatorRequired,
    metadata,
  };

  return Object.freeze(contract);
}

