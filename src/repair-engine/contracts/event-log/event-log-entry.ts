import type { EventLogEntityType } from './event-log-entity-type';
import type { EventLogEventType } from './event-log-event-type';

export interface EventLogEntry {
  readonly entityType: EventLogEntityType;
  readonly entityId: string;
  readonly eventType: EventLogEventType;
  readonly reasonCode: string;
  readonly phase: string;
  readonly status: string;
  readonly sequence: number;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}
