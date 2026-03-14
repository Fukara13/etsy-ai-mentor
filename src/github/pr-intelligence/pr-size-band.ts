/**
 * GH-8: PR size band classification.
 */

export type PrSizeBand =
  | 'TINY'
  | 'SMALL'
  | 'MEDIUM'
  | 'LARGE'
  | 'VERY_LARGE';

export const PR_SIZE_BANDS: readonly PrSizeBand[] = [
  'TINY',
  'SMALL',
  'MEDIUM',
  'LARGE',
  'VERY_LARGE',
] as const;
