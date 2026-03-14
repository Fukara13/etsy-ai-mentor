/**
 * Test affinity: module in testModules -> supports its path bucket.
 */

import { pathToBucket } from './bucket-rules.mjs';
import { BUCKETS } from './bucket-rules.mjs';
import { normalizeScore } from './normalize-score.mjs';

export function inferTestAffinity(moduleName, testModules) {
  const inTestModules = Array.isArray(testModules) && testModules.includes(moduleName);
  const bucket = pathToBucket(moduleName);
  const scores = {};
  for (const b of BUCKETS) {
    if (inTestModules && b === bucket) {
      scores[b] = normalizeScore(0.7);
    } else if (inTestModules) {
      scores[b] = 0;
    } else {
      scores[b] = 0;
    }
  }
  return scores;
}
