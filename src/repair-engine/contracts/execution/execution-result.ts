import type { RepairEngineErrorCode } from '../errors/repair-engine-error-code';

export type ExecutionResultStatus =
  | 'SUCCESS'
  | 'FAILURE'
  | 'SKIPPED'
  | 'RETRYABLE';

const VALID_STATUSES: readonly ExecutionResultStatus[] = [
  'SUCCESS',
  'FAILURE',
  'SKIPPED',
  'RETRYABLE',
];

export function isExecutionResultStatus(
  value: string
): value is ExecutionResultStatus {
  return (VALID_STATUSES as readonly string[]).includes(value);
}

export interface ExecutionResult {
  readonly status: ExecutionResultStatus;
  readonly errorCode?: RepairEngineErrorCode;
}
