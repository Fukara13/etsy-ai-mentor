/**
 * Path affinity: derive 0–1 score for each bucket from module path.
 */

import { pathToBucket, BUCKETS } from './bucket-rules.mjs';
import { normalizeScore } from './normalize-score.mjs';

export function inferPathAffinity(modulePath) {
  const match = pathToBucket(modulePath);
  const scores = {};
  for (const b of BUCKETS) {
    scores[b] = b === match ? 1 : 0;
  }
  return scores;
}
