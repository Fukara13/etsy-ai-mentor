import type { ExecutionEntityType } from './execution-entity-type';
import type { ExecutionPhase } from './execution-phase';
import type { ExecutionStatus } from './execution-status';
import type { ExecutionReasonCode } from './execution-reason-code';

export interface ExecutionContract {
  readonly id: string;
  readonly entityType: ExecutionEntityType;
  readonly phase: ExecutionPhase;
  readonly status: ExecutionStatus;
  readonly reasonCode?: ExecutionReasonCode;
  readonly createdAt: number;
  readonly updatedAt?: number;
  readonly operatorRequired: boolean;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

