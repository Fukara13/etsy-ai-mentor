/**
 * Gate-S22: Step actor dispatcher. Maps state -> actor. Does not decide next state.
 */

import type { RepairState } from './repair-state-machine';
import type { ActorName } from './actor-runtime.types';

const STATE_TO_ACTOR: ReadonlyMap<RepairState, ActorName> = new Map([
  ['IDLE', 'None'],
  ['ANALYZE', 'Analyzer'],
  ['COACH', 'RepairCoach'],
  ['JULES_PENDING', 'JulesPlaceholder'],
  ['GUARDIAN_CHECK', 'Guardian'],
  ['EVALUATOR_CHECK', 'Evaluator'],
  ['CI_RETRY', 'RetryController'],
  ['EXHAUSTED', 'HumanEscalation'],
  ['HUMAN', 'None'],
]);

export function getActorForState(state: RepairState): ActorName {
  return STATE_TO_ACTOR.get(state) ?? 'None';
}
