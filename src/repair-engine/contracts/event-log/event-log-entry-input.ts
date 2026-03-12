import type { EventLogEntityType } from './event-log-entity-type';
import type { EventLogEventType } from './event-log-event-type';

export interface EventLogEntryInput {
  readonly entityType: EventLogEntityType;
  readonly entityId: string;
  readonly eventType: EventLogEventType;
  readonly reasonCode: string;
  readonly phase: string;
  readonly status: string;
  readonly sequence: number;
  readonly payload?: Record<string, unknown>;
  readonly metadata?: Record<string, unknown>;
}
