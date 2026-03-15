/**
 * OC-13: Canonical read entry for operator decision timeline projection.
 * Read-only; uses existing operator advisory view.
 */

import { readOperatorAdvisoryView } from '../operator-advisory-view'
import type { OperatorDecisionTimeline } from './operator-decision-timeline'
import { deriveOperatorDecisionTimeline } from './derive-operator-decision-timeline'

export function readOperatorDecisionTimeline(): OperatorDecisionTimeline {
  const advisoryView = readOperatorAdvisoryView()
  return deriveOperatorDecisionTimeline(advisoryView)
}
