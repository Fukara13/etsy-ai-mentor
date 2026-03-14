/**
 * RE-10: Runs repair through canonical orchestrator. Adapter layer only.
 * No inline business logic. No fallback engine. Delegates to src/repair-engine.
 */

import { orchestrateRepairEngine } from '../../../src/repair-engine/orchestrator';
import { mapElectronInputToOrchestratorInput } from './map-electron-input-to-orchestrator-input';
import { mapOrchestratorResultToElectronResult } from './map-orchestrator-result-to-electron-result';
import type { ElectronRepairBridgeInput } from './map-electron-input-to-orchestrator-input';
import type { ElectronRepairBridgeResult } from './map-orchestrator-result-to-electron-result';

/**
 * Runs repair via canonical repair-engine orchestrator.
 * Maps input -> orchestrator -> output projection. No side effects.
 */
export function runElectronRepairBridge(
  input: ElectronRepairBridgeInput
): ElectronRepairBridgeResult {
  const orchestratorInput = mapElectronInputToOrchestratorInput(input);
  const orchestratorResult = orchestrateRepairEngine(orchestratorInput);
  return mapOrchestratorResultToElectronResult(orchestratorResult);
}
