/**
 * GH-2: Zone classification output type.
 */

import type { ZoneLevel } from './zone-level';

export interface ZoneClassification {
  readonly zone: ZoneLevel;
  readonly allowsAiExecution: boolean;
  readonly requiresHumanApproval: boolean;
  readonly requiresEscalation: boolean;
  readonly reason: string;
}
