import type { IncidentTimelineEntryType } from './incident-timeline-entry-type';

export interface IncidentTimelineEntry {
  readonly incidentId: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly entryType: IncidentTimelineEntryType;
  readonly summary: string;
  readonly notes: readonly string[];
  readonly sourceEventId: string;
  readonly operatorId: string;
}

