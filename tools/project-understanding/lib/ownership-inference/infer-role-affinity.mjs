/**
 * Role affinity: derive 0–1 score for each bucket from module role/kind/name.
 * Deterministic keyword matching.
 */

import { BUCKETS } from './bucket-rules.mjs';
import { normalizeScore } from './normalize-score.mjs';

const ROLE_KEYWORDS = {
  governance: ['governance', 'policy', 'risk', 'authority', 'security-policy', 'zones'],
  'github-backbone': ['github', 'webhook', 'pr', 'workflow', 'event-intake', 'pr-inspection', 'pr-intelligence'],
  'project-understanding': [
    'scanner',
    'mapping',
    'summary',
    'hotspot',
    'project-understanding',
    'dependency-graph',
    'module-map',
    'architecture',
  ],
  'shared-core': ['shared', 'core', 'common'],
  'desktop-control-center': [
    'desktop',
    'ui',
    'electron',
    'control-center',
    'ipc',
    'gates',
    'renderer',
  ],
  'hero-ministry': ['hero', 'heroes', 'ministry'],
  'archive-legacy': ['archive', 'legacy'],
};

export function inferRoleAffinity(moduleName, moduleRole, moduleKind) {
  const combined = [
    (moduleName || '').toLowerCase(),
    (moduleRole || '').toLowerCase(),
    (moduleKind || '').toLowerCase(),
  ].join(' ');

  const scores = {};
  for (const b of BUCKETS) {
    const keywords = ROLE_KEYWORDS[b] || [];
    let matchCount = 0;
    for (const kw of keywords) {
      if (combined.includes(kw)) matchCount++;
    }
    const score = matchCount > 0 ? Math.min(1, 0.3 + matchCount * 0.2) : 0;
    scores[b] = normalizeScore(score);
  }
  return scores;
}
