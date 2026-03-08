/**
 * DC-7: Pure mapper from read models to analysis view models.
 * Deterministic, no side effects, no async, no network, no IPC.
 */

import type { GPTAnalysisView, RepairStrategyView } from '../../shared/read-models'
import type { GPTAnalysisViewModel, RepairStrategyViewModel } from './analysis.view-model'

function confidenceFromNumber(n: number): string {
  if (n >= 0.9) return 'High'
  if (n >= 0.7) return 'Medium'
  if (n >= 0.5) return 'Low'
  return 'Low'
}

export function mapGPTAnalysisViewModel(input: GPTAnalysisView | null): GPTAnalysisViewModel {
  if (!input) {
    return {
      title: 'GPT Analysis',
      failureType: '',
      rootCause: '',
      confidence: '',
      affectedFiles: [],
      status: 'empty',
    }
  }
  const affectedFiles = input.findings
    .flatMap((f) => (f.evidence ? [f.evidence] : []))
    .filter((f): f is string => typeof f === 'string' && f.length > 0)
  if (affectedFiles.length === 0 && input.findings.length > 0) {
    affectedFiles.push(...input.findings.map((f) => f.title))
  }
  return {
    title: 'GPT Analysis',
    failureType: input.failureType,
    rootCause: input.rootCause,
    confidence: confidenceFromNumber(input.confidence),
    affectedFiles: [...affectedFiles],
    summary: input.suggestedFix ? `Suggested fix: ${input.suggestedFix}` : undefined,
    status: 'ready',
  }
}

export function mapRepairStrategyViewModel(input: RepairStrategyView | null): RepairStrategyViewModel {
  if (!input) {
    return {
      title: 'Repair Strategy',
      proposedSteps: [],
      expectedResult: '',
      status: 'empty',
    }
  }
  const proposedSteps = input.steps.map((s) => s.summary ?? s.label).filter(Boolean)
  if (proposedSteps.length === 0) {
    proposedSteps.push(...input.steps.map((s) => s.label))
  }
  return {
    title: 'Repair Strategy',
    proposedSteps: [...proposedSteps],
    expectedResult: input.nextAction,
    riskLevel: undefined,
    notes: input.operatorMessage,
    status: 'ready',
  }
}
