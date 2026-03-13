import type { AuthorityDecisionType } from './authority-decision';

export interface AuthorityDecision {
  readonly decision: AuthorityDecisionType;
  readonly allowsAiExecution: boolean;
  readonly requiresHumanApproval: boolean;
  readonly requiresEscalation: boolean;
  readonly reason: string;
}
