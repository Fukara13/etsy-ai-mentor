/**
 * RE-10: Electron repair-engine bridge. Adapter layer over canonical orchestrator.
 */

export { mapElectronInputToOrchestratorInput } from './map-electron-input-to-orchestrator-input';
export { mapOrchestratorResultToElectronResult } from './map-orchestrator-result-to-electron-result';
export { runElectronRepairBridge } from './run-electron-repair-bridge';

export type { ElectronRepairBridgeInput } from './map-electron-input-to-orchestrator-input';
export type {
  ElectronRepairBridgeResult,
  ElectronGovernanceProjection,
} from './map-orchestrator-result-to-electron-result';
