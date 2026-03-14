/**
 * Combine signal affinities into per-bucket owner scores.
 */

import { BUCKETS } from './bucket-rules.mjs';
import { normalizeScore } from './normalize-score.mjs';

const WEIGHTS = {
  pathAffinity: 0.3,
  roleAffinity: 0.25,
  dependencyAffinity: 0.2,
  testAffinity: 0.1,
  hotspotAffinity: 0.15,
};

export function scoreOwnershipSignals(pathAff, roleAff, depAff, testAff, hotspotAff) {
  const bucketScores = {};
  for (const b of BUCKETS) {
    const path = pathAff[b] ?? 0;
    const role = roleAff[b] ?? 0;
    const dep = depAff[b] ?? 0;
    const test = testAff[b] ?? 0;
    const hotspot = hotspotAff[b] ?? 0;
    const raw =
      path * WEIGHTS.pathAffinity +
      role * WEIGHTS.roleAffinity +
      dep * WEIGHTS.dependencyAffinity +
      test * WEIGHTS.testAffinity +
      hotspot * WEIGHTS.hotspotAffinity;
    bucketScores[b] = normalizeScore(raw);
  }
  return bucketScores;
}
