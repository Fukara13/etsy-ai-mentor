/**
 * Gate-S11: Jules Patch Integration — Controlled Integration Layer
 * Transforms Repair Coach output into a Jules patch request model.
 * No real writes, commits, pushes, or PR updates. Preparation + interface only.
 * Single write actor = Jules. Human remains final authority.
 */

import type { CoachResult } from './types';
import { WRITE_ACTOR } from './types';

/** Jules mode: frozen = no patch, enabled = structured request only (no execution). */
export type JulesMode = 'frozen' | 'enabled';

/**
 * Deterministic Jules patch request model.
 * Bounded scope, narrow guidance. Never performs real writes.
 */
export type JulesPatchRequest = {
  readonly source: CoachResult;
  readonly summary: string;
  readonly instructions: readonly string[];
  readonly mode: JulesMode;
  readonly writeActor: typeof WRITE_ACTOR;
};

/**
 * Deterministic Jules integration result.
 * Pipeline-compatible next phase. Human always required.
 */
export type JulesIntegrationResult = {
  readonly status: 'skipped_due_to_freeze' | 'ready_for_jules';
  readonly requestedPatch: JulesPatchRequest | null;
  readonly writeActor: typeof WRITE_ACTOR;
  readonly nextPhase: 'JULES_FROZEN' | 'GUARDIAN_CHECK';
  readonly humanRequired: true;
};

const MAX_SUMMARY_LEN = 500;
const MAX_INSTRUCTIONS = 10;

/**
 * Transforms coach output into a Jules patch request.
 * Deterministic. Always assigns writeActor = Jules. Preserves narrow scope.
 */
export function buildJulesPatchRequest(
  coach: CoachResult,
  mode: JulesMode
): JulesPatchRequest {
  const summary =
    coach.guidance.length > MAX_SUMMARY_LEN
      ? coach.guidance.slice(0, MAX_SUMMARY_LEN) + '…'
      : coach.guidance;
  const instructions = (coach.scope ?? [coach.guidance]).slice(0, MAX_INSTRUCTIONS);
  return {
    source: coach,
    summary,
    instructions,
    mode,
    writeActor: WRITE_ACTOR,
  };
}

/**
 * Evaluates Jules mode and returns integration result.
 * When frozen: no real patch, status = skipped_due_to_freeze.
 * When enabled: status = ready_for_jules, structured request (no execution).
 * Human always required. No merge path.
 */
export function integrateJules(
  coach: CoachResult,
  mode: JulesMode
): JulesIntegrationResult {
  if (mode === 'frozen') {
    return {
      status: 'skipped_due_to_freeze',
      requestedPatch: null,
      writeActor: WRITE_ACTOR,
      nextPhase: 'JULES_FROZEN',
      humanRequired: true,
    };
  }
  return {
    status: 'ready_for_jules',
    requestedPatch: buildJulesPatchRequest(coach, mode),
    writeActor: WRITE_ACTOR,
    nextPhase: 'GUARDIAN_CHECK',
    humanRequired: true,
  };
}
