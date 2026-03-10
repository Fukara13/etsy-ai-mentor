/**
 * RE-1: Repair engine evaluation contract.
 * Shape of the evaluation result from the state machine.
 */

import type { RepairLifecycleState } from './repair-lifecycle-state'
import type { RepairVerdict } from './repair-verdict'

export type RepairEngineEvaluation = {
  currentState: RepairLifecycleState
  nextState: RepairLifecycleState
  isLegalTransition: boolean
  verdict: RepairVerdict
  escalationTriggered: boolean
  reasonCodes: string[]
}
