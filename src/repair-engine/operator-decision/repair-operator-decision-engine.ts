import type { OperatorDecisionInput } from './operator-decision-input';
import type { OperatorDecisionResult } from './operator-decision-result';
import type { OperatorDecisionActionType } from './operator-decision-action-type';
import type { OperatorDecisionEvent } from './operator-decision-event';
import type { OperatorDecisionEventType } from './operator-decision-event-type';

const ALLOWED_ACTIONS: OperatorDecisionActionType[] = [
  'approve',
  'reject',
  'request_investigation',
  'request_escalation',
];

const OPERATOR_DECISION_RECORDED: OperatorDecisionEventType = 'operator_decision_recorded';

/**
 * RE-9: Pure function to record a human operator decision as a deterministic event.
 */
export function recordOperatorDecision(
  input: OperatorDecisionInput
): OperatorDecisionResult {
  if (!ALLOWED_ACTIONS.includes(input.decisionAction)) {
    throw new Error(`Invalid operator decision action: ${input.decisionAction}`);
  }

  const summary = input.decisionSummary?.trim();
  if (!summary) {
    throw new Error('Operator decision summary is required.');
  }

  const trimmedNote = input.operatorNote?.trim();
  const operatorNote = trimmedNote && trimmedNote.length > 0 ? trimmedNote : undefined;

  const event: OperatorDecisionEvent = {
    type: OPERATOR_DECISION_RECORDED,
    action: input.decisionAction,
    summary,
    operatorNote,
  };

  return {
    action: event.action,
    recorded: true,
    event,
  };
}

