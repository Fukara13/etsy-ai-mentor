/**
 * Gate-S22: Stub actor implementations. Deterministic, no side effects.
 */

import type { ActorExecuteInput, ActorRawOutput, ActorName } from './actor-runtime.types';
import { runGuardian } from './guardian';
import { runEvaluator } from './evaluator';

export type ActorExecuteFn = (input: ActorExecuteInput) => ActorRawOutput;

function analyzerStub(_input: ActorExecuteInput): ActorRawOutput {
  return { actor: 'Analyzer', ok: true, event: 'ANALYSIS_COMPLETED', reason: 'Stub' };
}

function coachStub(_input: ActorExecuteInput): ActorRawOutput {
  return { actor: 'RepairCoach', ok: true, event: 'COACH_COMPLETED', reason: 'Stub' };
}

function julesPlaceholderStub(_input: ActorExecuteInput): ActorRawOutput {
  return {
    actor: 'JulesPlaceholder',
    ok: false,
    event: 'JULES_FROZEN_OUTCOME',
    reason: 'Jules frozen',
    requiresHuman: true,
  };
}

function guardianStub(input: ActorExecuteInput): ActorRawOutput {
  const paths = (input.context?.paths as string[] | undefined) ?? ['src/foo.ts'];
  const decision = runGuardian({ paths });
  return {
    actor: 'Guardian',
    allowed: decision.allowed,
    event: 'GUARDIAN_COMPLETED',
    reason: decision.reason,
    blocked: !decision.allowed,
  };
}

function evaluatorStub(input: ActorExecuteInput): ActorRawOutput {
  const guardian = (input.context?.guardian ?? { allowed: true, reason: 'ok' }) as {
    allowed: boolean;
    reason: string;
  };
  const decision = runEvaluator({ ciPassed: false, guardian });
  return {
    actor: 'Evaluator',
    passed: decision.passed,
    event: decision.passed ? 'EVALUATOR_PASSED' : 'EVALUATOR_FAILED',
    reason: decision.reason,
  };
}

function retryControllerStub(input: ActorExecuteInput): ActorRawOutput {
  const exhausted = input.retryCount >= input.maxRetries;
  return {
    actor: 'RetryController',
    ok: !exhausted,
    event: exhausted ? 'RETRY_LIMIT_REACHED' : 'CI_RETRY_COMPLETED',
    reason: exhausted ? 'Retry limit reached' : 'Retry available',
    requiresHuman: exhausted,
  };
}

function humanEscalationStub(_input: ActorExecuteInput): ActorRawOutput {
  return {
    actor: 'HumanEscalation',
    event: 'HUMAN_ESCALATION',
    reason: 'Human handoff',
    requiresHuman: true,
    terminal: true,
  };
}

export const ACTOR_REGISTRY: ReadonlyMap<ActorName, ActorExecuteFn> = new Map([
  ['Analyzer', analyzerStub],
  ['RepairCoach', coachStub],
  ['JulesPlaceholder', julesPlaceholderStub],
  ['Guardian', guardianStub],
  ['Evaluator', evaluatorStub],
  ['RetryController', retryControllerStub],
  ['HumanEscalation', humanEscalationStub],
]);
