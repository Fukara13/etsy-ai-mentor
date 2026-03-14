/**
 * GH-8: Input for PR intelligence derivation.
 */

import type { PullRequestInspectionResult } from '../pr-inspection';

export interface PrIntelligenceInput {
  readonly inspection: PullRequestInspectionResult;
}
