/**
 * GH-3: Maps governance zone output into explicit authority behavior.
 * Deterministic, pure, no I/O, no mutation.
 */

import type { ZoneClassification } from '../zones';
import { AUTHORITY_DECISIONS } from './authority-decision';
import type { AuthorityDecision } from './authority-decision-model';

/**
 * Rules:
 * - SAFE => AI flow may continue
 * - RESTRICTED => human approval required before continuation
 * - RED => AI flow blocked and escalation required
 */
export function deriveAuthorityDecision(
  classification: ZoneClassification
): AuthorityDecision {
  switch (classification.zone) {
    case 'SAFE':
      return Object.freeze({
        decision: AUTHORITY_DECISIONS.ALLOW_AI_FLOW,
        allowsAiExecution: true,
        requiresHumanApproval: false,
        requiresEscalation: false,
        reason: `SAFE zone allows controlled AI flow. ${classification.reason}`,
      });

    case 'RESTRICTED':
      return Object.freeze({
        decision: AUTHORITY_DECISIONS.REQUIRE_HUMAN_APPROVAL,
        allowsAiExecution: false,
        requiresHumanApproval: true,
        requiresEscalation: false,
        reason: `RESTRICTED zone requires explicit human approval. ${classification.reason}`,
      });

    case 'RED':
      return Object.freeze({
        decision: AUTHORITY_DECISIONS.BLOCK_AND_ESCALATE,
        allowsAiExecution: false,
        requiresHumanApproval: true,
        requiresEscalation: true,
        reason: `RED zone blocks AI flow and requires escalation. ${classification.reason}`,
      });

    default: {
      const exhaustiveCheck: never = classification.zone;
      return exhaustiveCheck;
    }
  }
}
