/**
 * OC-14: Operator incident history surface types.
 * Read-only projection; no persistence.
 */

export type IncidentHistoryItemStatus = 'active' | 'resolved' | 'unknown'

export interface IncidentHistoryItem {
  readonly incidentKey: string
  readonly title: string
  readonly status: IncidentHistoryItemStatus
  readonly startedAt?: number
  readonly lastUpdatedAt?: number
  readonly requiresOperatorAction: boolean
  readonly hasAdvisory: boolean
  readonly hasDecisionContext: boolean
}

export interface OperatorIncidentHistorySurface {
  readonly items: readonly IncidentHistoryItem[]
  readonly totalCount: number
  readonly activeCount: number
  readonly resolvedCount: number
  readonly requiresAttentionCount: number
  readonly lastUpdatedAt?: number
  readonly summary: string
}

/**
 * Raw descriptor from runtime projections; input to create/derive.
 * Optional fields get safe defaults in createIncidentHistoryItems.
 */
export interface RawIncidentDescriptor {
  readonly incidentKey: string
  readonly title?: string
  readonly status?: IncidentHistoryItemStatus
  readonly startedAt?: number
  readonly lastUpdatedAt?: number
  readonly requiresOperatorAction?: boolean
  readonly hasAdvisory?: boolean
  readonly hasDecisionContext?: boolean
}
