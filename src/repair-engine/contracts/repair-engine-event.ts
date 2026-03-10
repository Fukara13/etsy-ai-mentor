/**
 * RE-2: Normalized repair engine event. Engine-ready, immutable shape.
 */

import type { RepairEngineEventType } from './repair-engine-event-type'

export type RepairEngineEventSource = 'ci' | 'pull_request' | 'human'

export type RepairEngineEvent = {
  readonly type: RepairEngineEventType
  readonly source: RepairEngineEventSource
  readonly subjectId: string
  readonly summary: string
  readonly attemptCount: number
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>
}
