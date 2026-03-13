/**
 * GH-4: Security policy evaluation result.
 */

import type { SecurityPolicyEffect } from './security-policy-effect';

export interface SecurityPolicyResult {
  readonly effect: SecurityPolicyEffect;
  readonly requiresHumanApproval: boolean;
  readonly requiresEscalation: boolean;
  readonly matchedRuleIds: readonly string[];
  readonly reasons: readonly string[];
}
