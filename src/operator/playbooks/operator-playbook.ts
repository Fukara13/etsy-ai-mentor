/**
 * RE-8: Operator playbook interface.
 */

import type { OperatorPlaybookDecisionType } from './operator-playbook-decision-type'
import type { OperatorPlaybookChecklistItem } from './operator-playbook-checklist-item'

export interface OperatorPlaybook {
  readonly decisionType: OperatorPlaybookDecisionType
  readonly headline: string
  readonly summary: string
  readonly reviewChecklist: readonly OperatorPlaybookChecklistItem[]
  readonly riskNotes: readonly string[]
  readonly escalationRule: string | null
  readonly operatorGuidance: readonly string[]
}
