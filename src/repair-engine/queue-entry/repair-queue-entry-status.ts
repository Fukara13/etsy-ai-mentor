/**
 * GH-10: Queue entry status for repair queue contract.
 */

export type RepairQueueEntryStatus = 'PENDING' | 'BLOCKED' | 'UNKNOWN';

export const REPAIR_QUEUE_ENTRY_STATUSES: readonly RepairQueueEntryStatus[] = [
  'PENDING',
  'BLOCKED',
  'UNKNOWN',
] as const;
