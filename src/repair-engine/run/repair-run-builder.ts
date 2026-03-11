import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { RepairRun } from './repair-run';
import type { RepairRunStatus } from './repair-run-status';

function normalizeNonEmptyString(value: string, field: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`RepairRun builder requires non-empty ${field}.`);
  }

  return normalized;
}

function deriveRunId(correlationId: string): string {
  return `run-${correlationId}`;
}

function deriveStatus(timeline: IncidentTimeline): RepairRunStatus {
  // deterministic placeholder rule

  if (timeline.entries.length === 0) {
    return 'running';
  }

  return 'running';
}

export function buildRepairRun(timeline: IncidentTimeline): RepairRun {
  const incidentId = normalizeNonEmptyString(
    timeline.incidentId,
    'incidentId'
  );

  const correlationId = normalizeNonEmptyString(
    timeline.correlationId,
    'correlationId'
  );

  const startedAt = normalizeNonEmptyString(
    timeline.startedAt,
    'startedAt'
  );

  const lastUpdatedAt = normalizeNonEmptyString(
    timeline.lastUpdatedAt,
    'lastUpdatedAt'
  );

  const runId = deriveRunId(correlationId);

  const status = deriveStatus(timeline);

  return {
    runId,
    incidentId,
    correlationId,
    startedAt,
    lastUpdatedAt,
    status,
    timeline,
  };
}

