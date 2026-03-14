/**
 * Deterministic path-to-bucket mapping rules.
 * Explicit prefix-based rules. No fuzzy matching.
 */

export const BUCKETS = [
  'governance',
  'github-backbone',
  'project-understanding',
  'hero-ministry',
  'desktop-control-center',
  'shared-core',
  'archive-legacy',
  'unknown',
];

const PATH_RULES = [
  { prefix: 'src/governance', bucket: 'governance' },
  { prefix: 'src/github', bucket: 'github-backbone' },
  { prefix: 'tools/project-understanding', bucket: 'project-understanding' },
  { prefix: 'src/hero-ministry', bucket: 'hero-ministry' },
  { prefix: 'src/heroes', bucket: 'hero-ministry' },
  { prefix: 'src/hero/', bucket: 'hero-ministry' },
  { prefix: 'src/control-center', bucket: 'desktop-control-center' },
  { prefix: 'src/ui', bucket: 'desktop-control-center' },
  { prefix: 'src/desktop', bucket: 'desktop-control-center' },
  { prefix: 'electron/', bucket: 'desktop-control-center' },
  { prefix: 'electron', bucket: 'desktop-control-center' },
  { prefix: 'src/common', bucket: 'shared-core' },
  { prefix: 'src/core', bucket: 'shared-core' },
  { prefix: 'src/shared', bucket: 'shared-core' },
  { prefix: 'archive/', bucket: 'archive-legacy' },
  { prefix: 'archive', bucket: 'archive-legacy' },
];

export function pathToBucket(modulePath) {
  const p = (modulePath || '').replace(/\\/g, '/');
  if (!p) return 'unknown';
  for (const { prefix, bucket } of PATH_RULES) {
    if (p === prefix || p.startsWith(prefix + '/')) return bucket;
  }
  return 'unknown';
}
