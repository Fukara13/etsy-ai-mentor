/**
 * GH-10: Queue entry source type.
 */

export type RepairQueueEntrySource = 'GITHUB';

export const REPAIR_QUEUE_ENTRY_SOURCES: readonly RepairQueueEntrySource[] = [
  'GITHUB',
] as const;
