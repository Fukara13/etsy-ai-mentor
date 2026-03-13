/**
 * GH-1: Risk classification output type.
 */

import type { RiskLevel } from './risk-level';

export interface RiskClassification {
  readonly level: RiskLevel;
  readonly requiresHumanApproval: boolean;
  readonly reason: string;
}
