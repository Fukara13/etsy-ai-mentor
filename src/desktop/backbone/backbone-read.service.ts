/**
 * DC-4: Desktop read service.
 * Calls adapter, maps results, returns DC-3 read models.
 */

import type {
  RepairRunView,
  StateMachineView,
  FailureTimelineView,
  GPTAnalysisView,
  RepairStrategyView,
  TelemetryView,
  DecisionView,
} from '../../shared/read-models'
import { createMockBackboneReadAdapter } from './backbone-read.adapter'
import {
  mapRepairRunView,
  mapStateMachineView,
  mapFailureTimelineView,
  mapGPTAnalysisView,
  mapRepairStrategyView,
  mapTelemetryView,
  mapDecisionView,
} from './backbone-read.mapper'

const adapter = createMockBackboneReadAdapter()

export async function getRepairRunView(): Promise<RepairRunView | null> {
  const raw = await adapter.getRepairRun()
  return raw ? mapRepairRunView(raw) : null
}

export async function getStateMachineView(): Promise<StateMachineView | null> {
  const raw = await adapter.getStateMachine()
  return raw ? mapStateMachineView(raw) : null
}

export async function getFailureTimelineView(): Promise<FailureTimelineView | null> {
  const raw = await adapter.getFailureTimeline()
  return raw ? mapFailureTimelineView(raw) : null
}

export async function getGPTAnalysisView(): Promise<GPTAnalysisView | null> {
  const raw = await adapter.getGPTAnalysis()
  return raw ? mapGPTAnalysisView(raw) : null
}

export async function getRepairStrategyView(): Promise<RepairStrategyView | null> {
  const raw = await adapter.getRepairStrategy()
  return raw ? mapRepairStrategyView(raw) : null
}

export async function getTelemetryView(): Promise<TelemetryView | null> {
  const raw = await adapter.getTelemetry()
  return raw ? mapTelemetryView(raw) : null
}

export async function getDecisionView(): Promise<DecisionView | null> {
  const raw = await adapter.getDecision()
  return raw ? mapDecisionView(raw) : null
}
