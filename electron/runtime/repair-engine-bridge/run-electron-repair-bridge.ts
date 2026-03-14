/**
 * RE-10: Runs repair through canonical orchestrator. Adapter layer only.
 * RE-11: Post-orchestrator governance binding. Electron projects governance, does not derive.
 */

import { orchestrateRepairEngine } from '../../../src/repair-engine/orchestrator';
import { bindGovernanceRuntime } from '../../../src/repair-engine/governance-runtime';
import { mapElectronInputToOrchestratorInput } from './map-electron-input-to-orchestrator-input';
import { mapOrchestratorResultToElectronResult } from './map-orchestrator-result-to-electron-result';
import type { ElectronRepairBridgeInput } from './map-electron-input-to-orchestrator-input';
import type { ElectronRepairBridgeResult } from './map-orchestrator-result-to-electron-result';

/**
 * Runs repair via canonical repair-engine orchestrator.
 * Binds governance post-orchestration. Maps to Electron projection. No side effects.
 */
export function runElectronRepairBridge(
  input: ElectronRepairBridgeInput
): ElectronRepairBridgeResult {
  const orchestratorInput = mapElectronInputToOrchestratorInput(input);
  const orchestratorResult = orchestrateRepairEngine(orchestratorInput);
  const boundResult = bindGovernanceRuntime(orchestratorResult);
  return mapOrchestratorResultToElectronResult(boundResult);
}
