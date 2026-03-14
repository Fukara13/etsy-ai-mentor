/**
 * Hotspot affinity: hotspot interaction neighbors cluster around buckets.
 */

import { pathToBucket } from './bucket-rules.mjs';
import { BUCKETS } from './bucket-rules.mjs';
import { normalizeScore } from './normalize-score.mjs';

function getHotspotNeighbors(moduleName, hotspots) {
  const neighbors = [];
  const interactions = [];
  for (const h of hotspots || []) {
    if (h.module === moduleName) continue;
    const score = h.score ?? 0;
    if (score >= 40) interactions.push({ module: h.module, score });
  }
  for (const e of interactions) {
    neighbors.push(e.module);
  }
  const crossModuleInteractions = [];
  return { neighbors, crossModuleInteractions };
}

export function inferHotspotAffinity(
  moduleName,
  hotspotReport,
  crossModuleInteractions,
  moduleNames
) {
  const hotspots = hotspotReport?.hotspots || [];
  const edges = crossModuleInteractions || [];
  const highRiskModules = new Set(hotspots.filter((h) => (h.score ?? 0) >= 40).map((h) => h.module));

  const neighborToWeight = new Map();
  for (const e of edges) {
    if (e.from === moduleName && moduleNames.has(e.to)) {
      const w = typeof e.edgeCount === 'number' ? e.edgeCount : 1;
      neighborToWeight.set(e.to, (neighborToWeight.get(e.to) || 0) + w);
    }
    if (e.to === moduleName && moduleNames.has(e.from)) {
      const w = typeof e.edgeCount === 'number' ? e.edgeCount : 1;
      neighborToWeight.set(e.from, (neighborToWeight.get(e.from) || 0) + w);
    }
  }

  const totalWeight = [...neighborToWeight.values()].reduce((a, b) => a + b, 0);
  if (totalWeight <= 0) {
    const scores = {};
    for (const b of BUCKETS) scores[b] = 0;
    return scores;
  }

  const bucketWeight = {};
  for (const b of BUCKETS) bucketWeight[b] = 0;

  for (const [neighbor, weight] of neighborToWeight) {
    const isHighRisk = highRiskModules.has(neighbor);
    const adjusted = isHighRisk ? weight * 1.5 : weight;
    const bucket = pathToBucket(neighbor);
    bucketWeight[bucket] = (bucketWeight[bucket] || 0) + adjusted;
  }

  const maxBucketWeight = Math.max(...Object.values(bucketWeight), 1);
  const scores = {};
  for (const b of BUCKETS) {
    const w = bucketWeight[b] || 0;
    scores[b] = normalizeScore(w / maxBucketWeight);
  }
  return scores;
}
