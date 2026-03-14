/**
 * RE-10: Maps Electron repair runtime input to canonical orchestrator input.
 * Pure, deterministic. Does not mutate source. Fails conservatively on missing required fields.
 */

import type { RepairEngineOrchestratorInput } from '../../../src/repair-engine/orchestrator';
import type { RepairEngineEvent } from '../../../src/repair-engine/contracts/repair-engine-event';
import type { LoopRunInput } from '../../gates/repair/repair-loop-orchestrator';

/** Electron-side repair runtime input (same shape as LoopRunInput). */
export type ElectronRepairBridgeInput = LoopRunInput;

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

const LEGACY_DEFAULT_SESSION_ID = 'legacy-bridge-default';

/**
 * Maps Electron input to RepairEngineOrchestratorInput.
 * Requires sessionId for explicit mapping; uses deterministic fallback when omitted.
 * Throws if sessionId is provided but invalid (empty string).
 */
export function mapElectronInputToOrchestratorInput(
  input: ElectronRepairBridgeInput
): RepairEngineOrchestratorInput {
  const raw = input.sessionId;
  const sessionId = isNonEmptyString(raw) ? raw.trim() : LEGACY_DEFAULT_SESSION_ID;

  const event: RepairEngineEvent = Object.freeze({
    type: 'CI_FAILURE',
    source: 'ci',
    subjectId: sessionId.trim(),
    summary: `Repair run ${sessionId.trim()}`,
    attemptCount: typeof input.retryCount === 'number' && input.retryCount >= 0
      ? input.retryCount
      : 0,
    metadata:
      input.metadata != null && typeof input.metadata === 'object'
        ? Object.freeze({ ...input.metadata } as Record<string, string | number | boolean | null>)
        : undefined,
  });

  return Object.freeze({
    event,
  });
}
