/**
 * OC-14: Maps raw incident descriptors to IncidentHistoryItem[].
 * Pure; safe defaults; deterministic.
 */

import type { IncidentHistoryItem, IncidentHistoryItemStatus } from './types'
import type { RawIncidentDescriptor } from './types'

const DEFAULT_STATUS: IncidentHistoryItemStatus = 'unknown'

export function createIncidentHistoryItems(
  raw: readonly RawIncidentDescriptor[]
): IncidentHistoryItem[] {
  return raw.map((r) => toHistoryItem(r))
}

function toHistoryItem(r: RawIncidentDescriptor): IncidentHistoryItem {
  const status = validStatus(r.status)
  return {
    incidentKey: r.incidentKey ?? '',
    title: r.title ?? r.incidentKey ?? '',
    status,
    startedAt: r.startedAt,
    lastUpdatedAt: r.lastUpdatedAt,
    requiresOperatorAction: r.requiresOperatorAction === true,
    hasAdvisory: r.hasAdvisory === true,
    hasDecisionContext: r.hasDecisionContext === true,
  }
}

function validStatus(s: unknown): IncidentHistoryItemStatus {
  if (s === 'active' || s === 'resolved' || s === 'unknown') return s
  return DEFAULT_STATUS
}
