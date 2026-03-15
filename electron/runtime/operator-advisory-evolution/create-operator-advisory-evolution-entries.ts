/**
 * OC-12: Builds ordered advisory evolution entries from current stage and view.
 * Pure; deterministic headlines and details from view signals only.
 */

import { getAdvisoryEvolutionStageOrder } from './operator-advisory-evolution-stage'
import type { OperatorAdvisoryEvolutionStage } from './operator-advisory-evolution-stage'
import type {
  OperatorAdvisoryEvolutionEntry,
  OperatorAdvisoryEvolutionEntryStatus,
} from './operator-advisory-evolution-entry'
import type { OperatorAdvisoryView } from '../operator-advisory-view'

function headlineFor(stage: OperatorAdvisoryEvolutionStage, status: OperatorAdvisoryEvolutionEntryStatus): string {
  const suffix = status === 'active' ? ' (active)' : ''
  switch (stage) {
    case 'hero-analysis':
      return 'Hero analysis completed' + suffix
    case 'governance-evaluated':
      return 'Governance evaluated' + suffix
    case 'bridge-path-derived':
      return 'Bridge path derived' + suffix
    case 'advisory-generated':
      return 'Advisory generated' + suffix
    case 'operator-view-ready':
      return 'Operator view ready' + suffix
    default:
      return 'Advisory evolution stage' + suffix
  }
}

function detailFor(stage: OperatorAdvisoryEvolutionStage, advisoryView: OperatorAdvisoryView): string {
  const count = advisoryView.advisory?.projection?.advisorySummaries?.length ?? 0
  switch (stage) {
    case 'hero-analysis':
      return 'Hero reasoning or summary exists.'
    case 'governance-evaluated':
      return 'Governance-related advisory interpretation has been derived.'
    case 'bridge-path-derived':
      return 'Bridge path explanation exists.'
    case 'advisory-generated':
      return advisoryView.hasAdvisory
        ? (count === 0 ? 'Advisory object exists with no items.' : `Advisory has ${count} item(s).`)
        : 'Advisory object not yet present.'
    case 'operator-view-ready':
      return count > 0
        ? 'Advisory is ready for operator consumption with summaries.'
        : 'Advisory view not fully ready.'
    default:
      return 'No detail.'
  }
}

function hasAdvisoryImpact(stage: OperatorAdvisoryEvolutionStage): boolean {
  return true
}

export function createOperatorAdvisoryEvolutionEntries(
  currentStage: OperatorAdvisoryEvolutionStage | null,
  advisoryView: OperatorAdvisoryView
): OperatorAdvisoryEvolutionEntry[] {
  const stages = getAdvisoryEvolutionStageOrder()
  const currentIndex = currentStage != null ? stages.indexOf(currentStage) : -1

  return stages.map((stage, index) => {
    let status: OperatorAdvisoryEvolutionEntryStatus
    if (currentIndex === -1) {
      status = 'unknown'
    } else if (index < currentIndex) {
      status = 'completed'
    } else if (index === currentIndex) {
      status = 'active'
    } else {
      status = 'not-reached'
    }
    return {
      stage,
      status,
      order: index,
      headline: headlineFor(stage, status),
      detail: detailFor(stage, advisoryView),
      hasAdvisoryImpact: hasAdvisoryImpact(stage),
    }
  })
}
