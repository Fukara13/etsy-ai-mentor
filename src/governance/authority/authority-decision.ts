/**
 * GH-3: Authority decision types for governance guardrails.
 */

export const AUTHORITY_DECISIONS = {
  ALLOW_AI_FLOW: 'ALLOW_AI_FLOW',
  REQUIRE_HUMAN_APPROVAL: 'REQUIRE_HUMAN_APPROVAL',
  BLOCK_AND_ESCALATE: 'BLOCK_AND_ESCALATE',
} as const;

export type AuthorityDecisionType =
  (typeof AUTHORITY_DECISIONS)[keyof typeof AUTHORITY_DECISIONS];
