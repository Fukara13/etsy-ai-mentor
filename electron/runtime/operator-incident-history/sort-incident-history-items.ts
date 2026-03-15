/**
 * OC-14: Sorts incident history items by priority.
 * Pure; deterministic.
 * Order: requiresOperatorAction true first, then active before resolved, then newest lastUpdatedAt, then incidentKey A–Z.
 */

import type { IncidentHistoryItem } from './types'

export function sortIncidentHistoryItems(
  items: readonly IncidentHistoryItem[]
): IncidentHistoryItem[] {
  return [...items].sort(compareItems)
}

function compareItems(
  a: IncidentHistoryItem,
  b: IncidentHistoryItem
): number {
  if (a.requiresOperatorAction !== b.requiresOperatorAction) {
    return a.requiresOperatorAction ? -1 : 1
  }
  const statusOrder = (s: string) => (s === 'active' ? 0 : s === 'resolved' ? 1 : 2)
  const orderA = statusOrder(a.status)
  const orderB = statusOrder(b.status)
  if (orderA !== orderB) return orderA - orderB
  const ta = a.lastUpdatedAt ?? 0
  const tb = b.lastUpdatedAt ?? 0
  if (ta !== tb) return tb - ta
  return a.incidentKey.localeCompare(b.incidentKey)
}
