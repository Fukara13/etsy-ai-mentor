/**
 * GH-4: Security policy effect types.
 */

export type SecurityPolicyEffect =
  | 'ALLOW'
  | 'REQUIRE_HUMAN_APPROVAL'
  | 'DENY_AND_ESCALATE';
