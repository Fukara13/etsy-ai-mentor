/**
 * RE-2: Pure event intake. Normalizes and validates; no state transition, no I/O.
 */

import {
  REPAIR_ENGINE_EVENT_TYPES,
  type RepairEngineEventType,
} from '../contracts/repair-engine-event-type'
import type { RepairEngineEvent, RepairEngineEventSource } from '../contracts/repair-engine-event'
import type { RepairLifecycleState } from '../contracts/repair-lifecycle-state'
import type { RepairEngineEventIntakeResult } from '../contracts/repair-engine-event-intake-result'

/** Loose input shape for intake. Validated and normalized. */
export type RepairEngineEventInput = {
  type: string
  subjectId: string
  summary: string
  attemptCount?: number
  source?: string
  metadata?: Record<string, string | number | boolean | null>
}

const SOURCE_BY_TYPE: Record<RepairEngineEventType, RepairEngineEventSource> = {
  CI_FAILURE: 'ci',
  PR_UPDATED: 'pull_request',
  MANUAL_ANALYSIS_REQUESTED: 'human',
}

const STATE_BY_TYPE: Record<RepairEngineEventType, RepairLifecycleState> = {
  CI_FAILURE: 'FAILURE_DETECTED',
  PR_UPDATED: 'ANALYZING',
  MANUAL_ANALYSIS_REQUESTED: 'ANALYZING',
}

const REASON_CODE_BY_TYPE: Record<RepairEngineEventType, string> = {
  CI_FAILURE: 'CI_FAILURE_RECEIVED',
  PR_UPDATED: 'PR_UPDATED_RECEIVED',
  MANUAL_ANALYSIS_REQUESTED: 'MANUAL_ANALYSIS_REQUEST_RECEIVED',
}

function isSupportedType(t: string): t is RepairEngineEventType {
  return (REPAIR_ENGINE_EVENT_TYPES as readonly string[]).includes(t)
}

export class RepairEngineEventIntake {
  /**
   * Validates and normalizes input. Pure, deterministic.
   * Does not apply any state transition.
   */
  intake(input: RepairEngineEventInput): RepairEngineEventIntakeResult {
    const errors: string[] = []

    if (typeof input.subjectId !== 'string' || input.subjectId.trim() === '') {
      errors.push('subjectId must be non-empty')
    }
    if (typeof input.summary !== 'string' || input.summary.trim() === '') {
      errors.push('summary must be non-empty')
    }
    const attemptCount = input.attemptCount ?? 0
    if (typeof attemptCount !== 'number' || attemptCount < 0) {
      errors.push('attemptCount must be non-negative')
    }
    if (!isSupportedType(input.type)) {
      errors.push(`unsupported event type: ${input.type}`)
    }

    if (errors.length > 0) {
      return {
        accepted: false,
        recommendedInitialState: 'IDLE',
        reasonCodes: ['INTAKE_VALIDATION_FAILED'],
        validationErrors: [...errors],
      }
    }

    const eventType = input.type as RepairEngineEventType
    const normalizedEvent: RepairEngineEvent = {
      type: eventType,
      source: SOURCE_BY_TYPE[eventType],
      subjectId: input.subjectId.trim(),
      summary: input.summary.trim(),
      attemptCount: attemptCount,
      metadata:
        input.metadata && Object.keys(input.metadata).length > 0
          ? { ...input.metadata }
          : undefined,
    }

    return {
      accepted: true,
      normalizedEvent,
      recommendedInitialState: STATE_BY_TYPE[eventType],
      reasonCodes: [REASON_CODE_BY_TYPE[eventType]],
      validationErrors: [],
    }
  }
}
