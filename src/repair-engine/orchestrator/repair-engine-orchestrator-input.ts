/**
 * RE-9: Minimal public input for orchestration.
 */

import type { RepairEngineEvent } from '../contracts/repair-engine-event';

export type RepairEngineOrchestratorInput = {
  readonly event: RepairEngineEvent;
};
