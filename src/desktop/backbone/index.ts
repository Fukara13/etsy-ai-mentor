/**
 * DC-4: Read-only backbone bridge.
 */

export type {
  BackboneRepairRun,
  BackboneStateMachine,
  BackboneFailureTimeline,
  BackboneGPTAnalysis,
  BackboneRepairStrategy,
  BackboneTelemetry,
} from './backbone-read.types'

export type { BackboneReadAdapter } from './backbone-read.adapter'
export { createMockBackboneReadAdapter } from './backbone-read.adapter'

export {
  mapRepairRunView,
  mapStateMachineView,
  mapFailureTimelineView,
  mapGPTAnalysisView,
  mapRepairStrategyView,
  mapTelemetryView,
} from './backbone-read.mapper'

export {
  getRepairRunView,
  getStateMachineView,
  getFailureTimelineView,
  getGPTAnalysisView,
  getRepairStrategyView,
  getTelemetryView,
} from './backbone-read.service'
