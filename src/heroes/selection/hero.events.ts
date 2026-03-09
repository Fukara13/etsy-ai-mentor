/**
 * HM-3: Canonical hero events. Deterministic selection input.
 */

export type HeroEvent =
  | 'CI_FAILURE'
  | 'RETRY_EXHAUSTED'
  | 'PR_OPENED'
  | 'PR_UPDATED'
  | 'REPAIR_ANALYSIS_REQUESTED'

export const HERO_EVENTS: readonly HeroEvent[] = [
  'CI_FAILURE',
  'RETRY_EXHAUSTED',
  'PR_OPENED',
  'PR_UPDATED',
  'REPAIR_ANALYSIS_REQUESTED',
] as const
