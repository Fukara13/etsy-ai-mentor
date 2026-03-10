/**
 * RE-1: Pure escalation policy.
 * No I/O, deterministic. Negative attempt counts are non-escalated.
 */

export const REPAIR_RETRY_LIMIT = 3

/**
 * Returns true when attemptCount >= 3, false otherwise.
 * Negative values are treated as non-escalated (false).
 */
export function shouldEscalateRepairAttempt(attemptCount: number): boolean {
  return attemptCount >= REPAIR_RETRY_LIMIT
}
