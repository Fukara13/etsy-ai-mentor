import type { IncidentTimelineEntry } from './incident-timeline-entry';
import type { IncidentTimelineStatus } from './incident-timeline-status';

export interface IncidentTimeline {
  readonly incidentId: string;
  readonly correlationId: string;
  readonly startedAt: string;
  readonly lastUpdatedAt: string;
  readonly status: IncidentTimelineStatus;
  readonly entries: readonly IncidentTimelineEntry[];
}

