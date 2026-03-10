/**
 * RE-1: Repair verdict contract.
 * Readonly tuple and union type for evaluation outcomes.
 */

export const REPAIR_VERDICTS = [
  'informational',
  'needs_review',
  'safe_with_human_approval',
  'blocked',
  'escalated',
] as const

export type RepairVerdict = (typeof REPAIR_VERDICTS)[number]
