/**
 * Gate-S28: Deterministic Telemetry Projection — Transport-ready event contract.
 */

export type RepairTelemetryStatus =
  | 'resolved'
  | 'requires_human'
  | 'halted'
  | 'blocked';

export type RepairTelemetrySeverity = 'info' | 'warning' | 'critical';

export type RepairTelemetryMetadata = {
  readonly sessionId?: string;
  readonly source: 'repair-verdict-layer';
  readonly projectionVersion: 's28-v1';
};

export interface RepairTelemetryEvent {
  readonly eventName: string;
  readonly status: RepairTelemetryStatus;
  readonly severity: RepairTelemetrySeverity;
  readonly finalState: string;
  readonly reasonCode: string;
  readonly requiresHuman: boolean;
  readonly safeToRetry: boolean;
  readonly recommendedAction: string;
  readonly retryCount?: number;
  readonly maxRetries?: number;
  readonly totalSteps?: number;
  readonly metadata: RepairTelemetryMetadata;
}
