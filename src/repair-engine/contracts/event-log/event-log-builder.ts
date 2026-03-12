import type { EventLogEntry } from './event-log-entry';
import type { EventLogEntryInput } from './event-log-entry-input';
import type { EventLog } from './event-log';

function deepFreeze<T>(value: T): Readonly<T> {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value) as Readonly<T>;
  }

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const prop = obj[key];
    if (prop !== null && typeof prop === 'object') {
      deepFreeze(prop);
    }
  }
  return Object.freeze(obj) as Readonly<T>;
}

function normalizeNonEmptyString(value: string, field: string): string {
  const normalized = value.trim();
  if (normalized.length === 0) {
    throw new Error(`EventLogEntry requires non-empty ${field}.`);
  }
  return normalized;
}

function validateSequence(sequence: number): number {
  if (!Number.isInteger(sequence)) {
    throw new Error('EventLogEntry requires integer sequence.');
  }
  if (sequence < 0) {
    throw new Error('EventLogEntry requires non-negative sequence.');
  }
  return sequence;
}

export function buildEventLogEntry(input: EventLogEntryInput): Readonly<EventLogEntry> {
  const entityId = normalizeNonEmptyString(input.entityId, 'entityId');
  const reasonCode = normalizeNonEmptyString(input.reasonCode, 'reasonCode');
  const phase = normalizeNonEmptyString(input.phase, 'phase');
  const status = normalizeNonEmptyString(input.status, 'status');
  const sequence = validateSequence(input.sequence);

  const payloadRaw =
    input.payload !== undefined
      ? (JSON.parse(JSON.stringify(input.payload)) as Record<string, unknown>)
      : {};
  const metadataRaw =
    input.metadata !== undefined
      ? (JSON.parse(JSON.stringify(input.metadata)) as Record<string, unknown>)
      : {};
  const payload = deepFreeze(payloadRaw) as Readonly<Record<string, unknown>>;
  const metadata = deepFreeze(metadataRaw) as Readonly<Record<string, unknown>>;

  const entry: EventLogEntry = {
    entityType: input.entityType,
    entityId,
    eventType: input.eventType,
    reasonCode,
    phase,
    status,
    sequence,
    payload,
    metadata,
  };

  return Object.freeze(entry);
}

export function buildEventLog(inputs: readonly EventLogEntryInput[]): Readonly<EventLog> {
  const entries = inputs.map((input) => buildEventLogEntry(input));
  const frozenEntries = deepFreeze([...entries]) as readonly EventLogEntry[];

  const log: EventLog = {
    entries: frozenEntries,
  };

  return Object.freeze(log);
}

export function appendEventLogEntry(
  log: EventLog,
  input: EventLogEntryInput
): Readonly<EventLog> {
  const newEntry = buildEventLogEntry(input);
  const newEntries = [...log.entries, newEntry];
  const frozenEntries = deepFreeze(newEntries) as readonly EventLogEntry[];

  const newLog: EventLog = {
    entries: frozenEntries,
  };

  return Object.freeze(newLog);
}
