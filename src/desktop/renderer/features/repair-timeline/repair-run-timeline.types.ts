/**
 * DC-6: Repair Run Timeline types.
 */

export type TimelineStageStatus = 'pending' | 'running' | 'success' | 'failed'

export interface RepairTimelineStage {
  id: string
  title: string
  status: TimelineStageStatus
  timestamp?: string
}

export interface RepairTimelineView {
  runId: string
  stages: RepairTimelineStage[]
}
