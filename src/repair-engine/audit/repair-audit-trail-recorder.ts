import type { AuditRecordInput } from './audit-record-input';
import type { AuditRecordResult } from './audit-record-result';
import type { AuditRecord } from './audit-record';

function ensureTrimmedNonEmpty(value: string | undefined, fieldName: string): string {
  const trimmed = (value ?? '').trim();

  if (!trimmed) {
    throw new Error(`${fieldName} is required.`);
  }

  return trimmed;
}

/**
 * RE-10: Pure audit trail recorder. Deterministic, no side effects.
 */
export function recordAuditTrail(input: AuditRecordInput): AuditRecordResult {
  if (!input) {
    throw new Error('AuditRecordInput is required.');
  }

  const { decisionResult } = input;

  if (!decisionResult) {
    throw new Error('decisionResult is required.');
  }

  const recordedAt = ensureTrimmedNonEmpty(input.recordedAt, 'recordedAt');
  const operatorId = ensureTrimmedNonEmpty(input.operatorId, 'operatorId');
  const sourceEventId = ensureTrimmedNonEmpty(input.sourceEventId, 'sourceEventId');
  const correlationId = ensureTrimmedNonEmpty(input.correlationId, 'correlationId');

  const event = decisionResult.event as any;
  const payload = event.payload ?? {
    action: event.action,
    summary: event.summary,
    notes: event.operatorNote ? [event.operatorNote] : [],
  };

  const decisionSummary = ensureTrimmedNonEmpty(payload.summary, 'decisionSummary');

  const rawNotes: unknown = payload.notes;
  const notesArray: string[] = Array.isArray(rawNotes) ? (rawNotes as string[]) : [];
  const decisionNotes = notesArray
    .map((note) => (note ?? '').trim())
    .filter((note) => note.length > 0);

  const record: AuditRecord = {
    recordType: 'operator_decision_recorded',
    eventType: event.type,
    decisionAction: payload.action,
    decisionSummary,
    decisionNotes,
    recordedAt,
    operatorId,
    sourceEventId,
    correlationId,
  };

  return { record };
}
