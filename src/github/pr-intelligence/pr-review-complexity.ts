/**
 * GH-8: PR review complexity classification.
 */

export type PrReviewComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export const PR_REVIEW_COMPLEXITIES: readonly PrReviewComplexity[] = [
  'LOW',
  'MEDIUM',
  'HIGH',
] as const;
