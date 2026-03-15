/**
 * OC-14: Pure derivation of operator incident history surface.
 * No I/O; no mutation; deterministic.
 */

import type {
  OperatorIncidentHistorySurface,
  RawIncidentDescriptor,
} from './types'
import { createIncidentHistoryItems } from './create-incident-history-items'
import { sortIncidentHistoryItems } from './sort-incident-history-items'

export function deriveIncidentHistorySurface(
  raw: readonly RawIncidentDescriptor[]
): OperatorIncidentHistorySurface {
  const items = sortIncidentHistoryItems(createIncidentHistoryItems(raw))
  const totalCount = items.length
  const activeCount = items.filter((i) => i.status === 'active').length
  const resolvedCount = items.filter((i) => i.status === 'resolved').length
  const requiresAttentionCount = items.filter(
    (i) => i.requiresOperatorAction
  ).length
  const lastUpdatedAt = maxLastUpdatedAt(items)
  const summary = buildSummary(
    totalCount,
    requiresAttentionCount,
    resolvedCount,
    activeCount
  )

  return {
    items,
    totalCount,
    activeCount,
    resolvedCount,
    requiresAttentionCount,
    lastUpdatedAt,
    summary,
  }
}

function maxLastUpdatedAt(
  items: readonly { lastUpdatedAt?: number }[]
): number | undefined {
  const defined = items
    .map((i) => i.lastUpdatedAt)
    .filter((t): t is number => typeof t === 'number')
  if (defined.length === 0) return undefined
  return Math.max(...defined)
}

function buildSummary(
  total: number,
  requiresAttention: number,
  resolved: number,
  active: number
): string {
  if (total === 0) return 'No incidents.'
  const parts: string[] = [
    `${total} incident${total === 1 ? '' : 's'}`,
  ]
  if (requiresAttention > 0) {
    parts.push(`${requiresAttention} requires operator attention`)
  }
  if (resolved > 0) {
    parts.push(`${resolved} resolved`)
  }
  if (active > 0 && resolved === 0 && requiresAttention === 0) {
    parts.push(`${active} active`)
  }
  return parts.join(' • ') + '.'
}
