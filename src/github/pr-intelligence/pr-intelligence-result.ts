/**
 * GH-8: PR intelligence result.
 */

import type { PrReviewComplexity } from './pr-review-complexity';
import type { PrRiskSignals } from './pr-risk-signal';
import type { PrSizeBand } from './pr-size-band';

export interface PrIntelligenceResult {
  readonly sizeBand: PrSizeBand;
  readonly reviewComplexity: PrReviewComplexity;
  readonly risky: boolean;
  readonly signals: PrRiskSignals;
  readonly reasons: readonly string[];
  readonly totals: {
    readonly totalChangedFiles: number;
    readonly totalAdditions: number;
    readonly totalDeletions: number;
    readonly totalChanges: number;
  };
}
