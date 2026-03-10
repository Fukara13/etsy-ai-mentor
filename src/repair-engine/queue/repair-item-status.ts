/**
 * RE-4: Queue item processing status.
 */

export const REPAIR_ITEM_STATUSES = ['queued', 'processing', 'completed', 'blocked'] as const

export type RepairItemStatus = (typeof REPAIR_ITEM_STATUSES)[number]
