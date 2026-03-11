import type { AuditRecord } from '../audit/audit-record';
import type { IncidentTimeline } from './incident-timeline';
import type { IncidentTimelineEntry } from './incident-timeline-entry';

function normalizeNonEmptyString(value: string, fieldName: string): string {
  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new Error(`Incident timeline builder requires non-empty ${fieldName}.`);
  }

  return normalized;
}

function cloneAndNormalizeNotes(notes: readonly string[] | undefined): string[] {
  if (!notes) {
    return [];
  }

  return notes
    .map((note) => note.trim())
    .filter((note) => note.length > 0);
}

function compareIsoTimestampAscending(left: string, right: string): number {
  if (left < right) {
    return -1;
  }

  if (left > right) {
    return 1;
  }

  return 0;
}

function toIncidentTimelineEntry(record: AuditRecord): IncidentTimelineEntry {
  const incidentId = normalizeNonEmptyString(record.correlationId, 'incidentId');
  const correlationId = normalizeNonEmptyString(record.correlationId, 'correlationId');
  const timestamp = normalizeNonEmptyString(record.recordedAt, 'timestamp');
  const summary = normalizeNonEmptyString(record.decisionSummary, 'summary');
  const sourceEventId = normalizeNonEmptyString(record.sourceEventId, 'sourceEventId');
  const operatorId = normalizeNonEmptyString(record.operatorId, 'operatorId');

  return {
    incidentId,
    correlationId,
    timestamp,
    entryType: 'operator_decision',
    summary,
    notes: cloneAndNormalizeNotes(record.decisionNotes),
    sourceEventId,
    operatorId,
  };
}

export function buildIncidentTimeline(auditRecords: readonly AuditRecord[]): IncidentTimeline {
  if (auditRecords.length === 0) {
    throw new Error('Incident timeline builder requires at least one audit record.');
  }

  const entries = auditRecords
    .map((record) => toIncidentTimelineEntry(record))
    .slice()
    .sort((left, right) => compareIsoTimestampAscending(left.timestamp, right.timestamp));

  const incidentId = normalizeNonEmptyString(entries[0].incidentId, 'incidentId');
  const correlationId = normalizeNonEmptyString(entries[0].correlationId, 'correlationId');

  for (const entry of entries) {
    if (entry.incidentId !== incidentId) {
      throw new Error('Incident timeline builder requires all entries to share the same incidentId.');
    }

    if (entry.correlationId !== correlationId) {
      throw new Error('Incident timeline builder requires all entries to share the same correlationId.');
    }
  }

  return {
    incidentId,
    correlationId,
    startedAt: entries[0].timestamp,
    lastUpdatedAt: entries[entries.length - 1].timestamp,
    status: 'open',
    entries,
  };
}

