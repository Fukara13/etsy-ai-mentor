/**
 * Classify module kind: feature, shared, infra, entrypoint, test-only, unknown.
 */

import { pathToModuleId } from './normalize-module-name.mjs';

const SHARED_PATTERNS = [
  /shared$/i, /^shared\//, /\/shared\//, /common$/i, /^common\//,
  /utils?$/i, /^utils?\//, /types?$/i, /^types?\//, /helper/i, /contracts$/,
];

const TEST_ROOT_PATTERNS = [
  /^__tests__$/, /__tests__/, /^tests?\//, /\/tests?(\/|$)/,
];

const INFRA_PATTERNS = [
  /infrastructure/i, /infra\//, /adapter/i, /external.*boundary/i,
  /transport/i, /integration/i,
];

const ENTRY_PATTERNS = [
  /\/index\.(ts|ts|tsx|js|jsx|mjs)$/, /^index\.(ts|tsx|js|mjs)$/,
  /main\.(ts|js)$/, /preload\.(ts|js)$/, /cli\.(ts|js|mjs)$/,
  /tools\/.*\.mjs$/, /tools\/.*\.js$/,
];

export function classifyModuleDomain(rootPath, filePath) {
  const p = toSlash(filePath || rootPath);
  const root = toSlash(rootPath);

  if (SHARED_PATTERNS.some((re) => re.test(root || p))) return 'shared';
  if (INFRA_PATTERNS.some((re) => re.test(root || p))) return 'infra';
  if (TEST_ROOT_PATTERNS.some((re) => re.test(root || p))) return 'test-only';
  if (ENTRY_PATTERNS.some((re) => re.test(p))) return 'entrypoint';

  if (root && (root.startsWith('src/') || root.startsWith('electron/'))) {
    return 'feature';
  }

  return 'unknown';
}

function toSlash(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\\/g, '/').trim();
}
