import type { IncidentTimeline } from '../timeline/incident-timeline';
import type { IncidentSummary } from './incident-summary';

export function buildIncidentSummary(timeline: IncidentTimeline): IncidentSummary {
  const { incidentId, entries } = timeline;

  const timelineEventCount = entries.length;

  if (timelineEventCount === 0) {
    return {
      incidentId,
      timelineEventCount: 0,
      firstEventType: null,
      lastEventType: null,
      firstEventTimestamp: null,
      lastEventTimestamp: null,
    };
  }

  const firstEntry = entries[0];
  const lastEntry = entries[timelineEventCount - 1];

  return {
    incidentId,
    timelineEventCount,
    firstEventType: firstEntry.entryType,
    lastEventType: lastEntry.entryType,
    firstEventTimestamp: firstEntry.timestamp,
    lastEventTimestamp: lastEntry.timestamp,
  };
}

