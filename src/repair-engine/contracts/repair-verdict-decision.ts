/**
 * RE-5: Final verdict decision union for verdict engine output.
 */

export const REPAIR_VERDICT_DECISIONS = [
  'strategy_ready',
  'manual_investigation',
  'blocked',
  'insufficient_signal',
  'escalate',
] as const

export type RepairVerdictDecision = (typeof REPAIR_VERDICT_DECISIONS)[number]
