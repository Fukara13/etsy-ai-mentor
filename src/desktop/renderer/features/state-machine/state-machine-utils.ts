/**
 * DC-5: Pure helpers for State Machine Viewer.
 */

import type { StateNodeView } from '../../../../shared/read-models'

export function buildTransitions(nodes: StateNodeView[]): Array<{ from: string; to: string }> {
  const sorted = [...nodes].filter((n) => n.visitedAt != null).sort((a, b) => (a.visitedAt ?? 0) - (b.visitedAt ?? 0))
  const transitions: Array<{ from: string; to: string }> = []
  for (let i = 1; i < sorted.length; i++) {
    transitions.push({ from: sorted[i - 1].label, to: sorted[i].label })
  }
  return transitions
}
