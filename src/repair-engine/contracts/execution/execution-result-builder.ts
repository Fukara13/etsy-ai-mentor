import type { ExecutionResult } from './execution-result';
import { isExecutionResultStatus } from './execution-result';
import type { RepairEngineErrorCode } from '../errors/repair-engine-error-code';

export interface ExecutionResultInput {
  readonly status: string;
  readonly errorCode?: RepairEngineErrorCode;
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

export function buildExecutionResult(input: ExecutionResultInput): ExecutionResult {
  if (!isExecutionResultStatus(input.status)) {
    throw new Error(
      `ExecutionResult requires status to be one of: SUCCESS, FAILURE, SKIPPED, RETRYABLE. Got: ${input.status}`
    );
  }

  const result: ExecutionResult = {
    status: input.status,
    errorCode: input.errorCode,
  };

  return deepFreeze(result) as ExecutionResult;
}
