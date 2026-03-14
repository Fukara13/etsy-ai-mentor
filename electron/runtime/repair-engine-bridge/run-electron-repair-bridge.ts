/**
 * RE-10: Runs repair through canonical orchestrator. Adapter layer only.
 * RE-11: Post-orchestrator governance binding.
 * RE-12: Project-understanding binding. Loads .ai-devos in Electron, binds in trunk.
 */

import { orchestrateRepairEngine } from '../../../src/repair-engine/orchestrator';
import { bindGovernanceRuntime } from '../../../src/repair-engine/governance-runtime';
import { bindProjectUnderstandingRuntime } from '../../../src/repair-engine/project-understanding-runtime';
import { loadProjectUnderstandingArtifacts } from '../project-understanding-loader';
import { mapElectronInputToOrchestratorInput } from './map-electron-input-to-orchestrator-input';
import { mapOrchestratorResultToElectronResult } from './map-orchestrator-result-to-electron-result';
import type { ElectronRepairBridgeInput } from './map-electron-input-to-orchestrator-input';
import type { ElectronRepairBridgeResult } from './map-orchestrator-result-to-electron-result';

function getChangedFiles(input: ElectronRepairBridgeInput): string[] {
  const meta = input.metadata;
  if (!meta || typeof meta !== 'object') return [];
  const cf = meta.changedFiles;
  if (!Array.isArray(cf)) return [];
  return cf.filter((x): x is string => typeof x === 'string');
}

/**
 * Runs repair via canonical repair-engine orchestrator.
 * Binds governance and project-understanding post-orchestration. Maps to Electron projection.
 */
export function runElectronRepairBridge(
  input: ElectronRepairBridgeInput
): ElectronRepairBridgeResult {
  const orchestratorInput = mapElectronInputToOrchestratorInput(input);
  const orchestratorResult = orchestrateRepairEngine(orchestratorInput);
  const boundResult = bindGovernanceRuntime(orchestratorResult);

  const changedFiles = getChangedFiles(input);
  const artifactBundle = loadProjectUnderstandingArtifacts(process.cwd());
  const projectBoundResult = bindProjectUnderstandingRuntime({
    result: boundResult,
    changedFiles,
    artifactBundle,
  });

  return mapOrchestratorResultToElectronResult(projectBoundResult);
}
