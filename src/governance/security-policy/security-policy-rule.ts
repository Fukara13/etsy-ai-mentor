/**
 * GH-4: Security policy rule type.
 */

import type { SecurityPolicyEffect } from './security-policy-effect';

export interface SecurityPolicyRule {
  readonly id: string;
  readonly description: string;
  readonly effect: SecurityPolicyEffect;
  readonly reason: string;
}
