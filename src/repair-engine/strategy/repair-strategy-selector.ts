/**
 * RE-3: Pure strategy candidate selector. No mutation, deterministic.
 */

import type { RepairEngineEvent } from '../contracts/repair-engine-event'
import type { RepairEngineEventType } from '../contracts/repair-engine-event-type'
import type { RepairStrategy } from '../contracts/repair-strategy'
import type { RepairStrategyCandidate } from '../contracts/repair-strategy-candidate'
import {
  STRATEGY_TEST_FIX,
  STRATEGY_DEPENDENCY_FIX,
  STRATEGY_CONFIGURATION_FIX,
  STRATEGY_MANUAL_INVESTIGATION,
} from './repair-strategy-catalog'

/**
 * Returns deterministic strategy candidates for a normalized repair event.
 * Does not mutate input. Returns fresh arrays.
 */
export function selectRepairStrategyCandidates(
  event: RepairEngineEvent
): RepairStrategyCandidate[] {
  const candidates = selectForEventType(event.type)
  return candidates.map((c) => ({
    strategy: c.strategy,
    reasonCodes: [...c.reasonCodes],
    confidence: c.confidence,
    sourceEventType: event.type,
  }))
}

type CandidateSeed = {
  strategy: RepairStrategy
  reasonCodes: readonly string[]
  confidence: number
}

function selectForEventType(
  eventType: RepairEngineEventType
): readonly CandidateSeed[] {
  switch (eventType) {
    case 'CI_FAILURE':
      return [
        {
          strategy: STRATEGY_TEST_FIX,
          reasonCodes: ['STRATEGY_MATCHED_TO_EVENT', 'TEST_REPAIR_CANDIDATE_SELECTED', 'HUMAN_APPROVAL_REQUIRED'],
          confidence: 0.85,
        },
        {
          strategy: STRATEGY_DEPENDENCY_FIX,
          reasonCodes: ['STRATEGY_MATCHED_TO_EVENT', 'DEPENDENCY_REPAIR_CANDIDATE_SELECTED', 'HUMAN_APPROVAL_REQUIRED'],
          confidence: 0.72,
        },
      ]
    case 'PR_UPDATED':
      return [
        {
          strategy: STRATEGY_CONFIGURATION_FIX,
          reasonCodes: ['STRATEGY_MATCHED_TO_EVENT', 'CONFIGURATION_REVIEW_RECOMMENDED', 'HUMAN_APPROVAL_REQUIRED'],
          confidence: 0.80,
        },
      ]
    case 'MANUAL_ANALYSIS_REQUESTED':
      return [
        {
          strategy: STRATEGY_MANUAL_INVESTIGATION,
          reasonCodes: ['STRATEGY_MATCHED_TO_EVENT', 'MANUAL_ANALYSIS_PATH_REQUIRED', 'HUMAN_APPROVAL_REQUIRED'],
          confidence: 0.90,
        },
      ]
    default: {
      const _: never = eventType
      return []
    }
  }
}
