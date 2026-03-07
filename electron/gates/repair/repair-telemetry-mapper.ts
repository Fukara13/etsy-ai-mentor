/**
 * Gate-S28: Telemetry projection mapper — Pure mapping from verdict (+ outcome) to telemetry event.
 * No side effects. No delivery. Deterministic only.
 */

import type { RepairRunVerdict, RepairRunVerdictReasonCode } from './repair-run-verdict';
import type { RepairRunOutcome } from './repair-run-outcome';
import type {
  RepairTelemetryEvent,
  RepairTelemetryStatus,
  RepairTelemetrySeverity,
} from './repair-telemetry.types';

export type MapRepairTelemetryEventParams = {
  readonly verdict: RepairRunVerdict;
  readonly outcome?: RepairRunOutcome;
};

const EVENT_NAME = 'repair.run.evaluated' as const;
const METADATA_SOURCE = 'repair-verdict-layer' as const;
const METADATA_VERSION = 's28-v1' as const;
const DEFAULT_FINAL_STATE = 'HUMAN';

function statusToSeverity(s: RepairTelemetryStatus): RepairTelemetrySeverity {
  switch (s) {
    case 'resolved':
      return 'info';
    case 'halted':
    case 'requires_human':
      return 'warning';
    case 'blocked':
      return 'critical';
    default: {
      const _: never = s;
      return 'warning';
    }
  }
}

function reasonCodeToRecommendedAction(rc: RepairRunVerdictReasonCode): string {
  switch (rc) {
    case 'RUN_RESOLVED':
      return 'close_safe';
    case 'RUN_EXHAUSTED':
    case 'RUN_TERMINAL_HUMAN':
      return 'manual_repair_required';
    case 'RUN_POLICY_BLOCKED':
    case 'RUN_HALTED_BLOCKED':
      return 'blocked_no_action';
    case 'RUN_CYCLE_SUSPECTED':
    case 'RUN_MAX_STEPS_REACHED':
      return 'review_required';
    default: {
      const _: never = rc;
      return 'unknown';
    }
  }
}

export function mapRepairTelemetryEvent(
  params: MapRepairTelemetryEventParams
): RepairTelemetryEvent {
  const { verdict, outcome } = params;

  const status: RepairTelemetryStatus = verdict.status;
  const severity = statusToSeverity(status);
  const finalState = outcome?.finalState ?? DEFAULT_FINAL_STATE;
  const recommendedAction = reasonCodeToRecommendedAction(verdict.reasonCode);

  const metadata: RepairTelemetryEvent['metadata'] = {
    source: METADATA_SOURCE,
    projectionVersion: METADATA_VERSION,
    ...(outcome?.sessionId != null && outcome.sessionId !== ''
      ? { sessionId: outcome.sessionId }
      : {}),
  };

  return {
    eventName: EVENT_NAME,
    status,
    severity,
    finalState,
    reasonCode: verdict.reasonCode,
    requiresHuman: verdict.requiresHuman,
    safeToRetry: verdict.safeToRetry,
    recommendedAction,
    retryCount: undefined,
    maxRetries: undefined,
    totalSteps: outcome?.totalSteps,
    metadata,
  };
}
