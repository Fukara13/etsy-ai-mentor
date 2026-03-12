import type { EventLogEntry } from './event-log-entry';

export interface EventLog {
  readonly entries: readonly EventLogEntry[];
}
