import type { RepairRunStatus } from '../run/repair-run-status';
import type { IncidentTimelineEntryType } from '../timeline/incident-timeline-entry-type';

export interface RepairRunListItem {
  readonly runId: string;
  readonly incidentId: string;
  readonly status: RepairRunStatus;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly timelineEventCount: number;
  readonly lastEventType: IncidentTimelineEntryType | null;
}

