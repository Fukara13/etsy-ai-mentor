import type { RepairRun } from './repair-run';
import type { EventLogEntry } from '../contracts/event-log/event-log-entry';
import type { EventLog } from '../contracts/event-log/event-log';
import type { EventLogEntryInput } from '../contracts/event-log/event-log-entry-input';
import type { EventLogEventType } from '../contracts/event-log/event-log-event-type';
import type { EventLogEntityType } from '../contracts/event-log/event-log-entity-type';
import { buildEventLogEntry, buildEventLog } from '../contracts/event-log/event-log-builder';

const ENTITY_TYPE: EventLogEntityType = 'repair_run';

export interface RepairRunEventLogContext {
  readonly run: RepairRun;
  readonly eventType: EventLogEventType;
  readonly reasonCode: string;
  readonly phase: string;
  readonly status: string;
  readonly sequence: number;
  readonly payload?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}

function toEventLogEntryInput(context: RepairRunEventLogContext): EventLogEntryInput {
  return {
    entityType: ENTITY_TYPE,
    entityId: context.run.runId,
    eventType: context.eventType,
    reasonCode: context.reasonCode,
    phase: context.phase,
    status: context.status,
    sequence: context.sequence,
    payload: context.payload,
    metadata: context.metadata,
  };
}

export function buildRepairRunEventLogEntry(
  context: RepairRunEventLogContext
): Readonly<EventLogEntry> {
  const input = toEventLogEntryInput(context);
  return buildEventLogEntry(input);
}

export function buildRepairRunEventLog(
  contexts: readonly RepairRunEventLogContext[]
): Readonly<EventLog> {
  const inputs = contexts.map(toEventLogEntryInput);
  return buildEventLog(inputs);
}

