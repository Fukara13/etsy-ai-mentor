/**
 * Gate-S14: Repair Telemetry — Helper wrappers for system events.
 */

import { repairLog } from './repair-logger';

export function logStateTransition(
  traceId: string,
  fromState: string,
  toState: string
): void {
  repairLog(traceId, toState, 'StateMachine', `transition ${fromState} → ${toState}`);
}

export function logActorExecution(
  traceId: string,
  actor: string,
  state: string,
  message: string
): void {
  repairLog(traceId, state, actor, message);
}

export function logActionPlan(traceId: string, actionType: string): void {
  repairLog(traceId, 'PLAN', 'RepairEngine', `action_plan ${actionType}`);
}

export function logBoundaryDecision(
  traceId: string,
  actionType: string,
  decision: 'allowed' | 'rejected'
): void {
  repairLog(traceId, 'BOUNDARY', 'ExecutionBoundary', `${actionType} ${decision}`);
}

export function logRetryAttempt(traceId: string, attempt: number): void {
  repairLog(traceId, 'RETRY', 'RetryController', `retry_attempt ${attempt}`);
}

/** Gate-S28: Deterministic Telemetry Projection */
export { mapRepairTelemetryEvent } from './repair-telemetry-mapper';
export type { MapRepairTelemetryEventParams } from './repair-telemetry-mapper';
export type {
  RepairTelemetryEvent,
  RepairTelemetryStatus,
  RepairTelemetrySeverity,
  RepairTelemetryMetadata,
} from './repair-telemetry.types';
