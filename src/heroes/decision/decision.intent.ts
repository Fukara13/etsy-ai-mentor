/**
 * HM-7: Decision intent.
 * What kind of human decision is being requested.
 */

export type DecisionIntent =
  | 'acknowledge'
  | 'review'
  | 'approve_or_reject'
  | 'escalate'
