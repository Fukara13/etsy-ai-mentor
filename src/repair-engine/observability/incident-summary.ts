import type { IncidentTimelineEntryType } from '../timeline/incident-timeline-entry-type';

export interface IncidentSummary {
  readonly incidentId: string;
  readonly timelineEventCount: number;
  readonly firstEventType: IncidentTimelineEntryType | null;
  readonly lastEventType: IncidentTimelineEntryType | null;
  readonly firstEventTimestamp: string | null;
  readonly lastEventTimestamp: string | null;
}

