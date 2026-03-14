/**
 * Dependency affinity: neighborhood clusters around buckets.
 */

import { pathToBucket } from './bucket-rules.mjs';
import { BUCKETS } from './bucket-rules.mjs';
import { normalizeScore } from './normalize-score.mjs';

function getNeighborModules(moduleName, crossModuleInteractions, moduleNames) {
  const neighbors = new Map();
  const edges = crossModuleInteractions || [];
  for (const e of edges) {
    if (e.from === moduleName) {
      const to = e.to;
      if (moduleNames.has(to)) {
        const c = typeof e.edgeCount === 'number' ? e.edgeCount : 1;
        neighbors.set(to, (neighbors.get(to) || 0) + c);
      }
    }
    if (e.to === moduleName) {
      const from = e.from;
      if (moduleNames.has(from)) {
        const c = typeof e.edgeCount === 'number' ? e.edgeCount : 1;
        neighbors.set(from, (neighbors.get(from) || 0) + c);
      }
    }
  }
  return neighbors;
}

export function inferDependencyAffinity(moduleName, crossModuleInteractions, moduleNames) {
  const neighbors = getNeighborModules(moduleName, crossModuleInteractions, moduleNames);
  const totalWeight = [...neighbors.values()].reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const scores = {};
    for (const b of BUCKETS) scores[b] = 0;
    return scores;
  }

  const bucketWeight = {};
  for (const b of BUCKETS) bucketWeight[b] = 0;

  for (const [neighbor, weight] of neighbors) {
    const bucket = pathToBucket(neighbor);
    bucketWeight[bucket] = (bucketWeight[bucket] || 0) + weight;
  }

  const scores = {};
  for (const b of BUCKETS) {
    const w = bucketWeight[b] || 0;
    scores[b] = normalizeScore(w / totalWeight);
  }
  return scores;
}
