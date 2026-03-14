/**
 * Infer repository identity from repo-scan, dependency-graph, and module-map.
 * Pure function, deterministic, no LLM.
 */

const FRAMEWORK_PACKAGES = new Set([
  'react',
  'react-dom',
  'vue',
  'angular',
  'svelte',
  'vite',
  'webpack',
  'electron',
  'next',
  'nuxt',
  'express',
  'fastify',
  'nestjs',
  'jest',
  'vitest',
  'mocha',
  'playwright',
  'cypress',
]);

/**
 * Infer primary language from file extensions in dependency graph.
 */
function inferPrimaryLanguage(modulesObj) {
  const langCounts = new Map();
  const langMap = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    py: 'python',
    go: 'go',
    rs: 'rust',
    rb: 'ruby',
  };
  for (const filePath of Object.keys(modulesObj || {})) {
    const m = filePath.match(/\.([a-z0-9]+)$/i);
    if (m) {
      const ext = m[1].toLowerCase();
      const lang = langMap[ext] || ext;
      langCounts.set(lang, (langCounts.get(lang) || 0) + 1);
    }
  }
  let best = 'unknown';
  let bestCount = 0;
  for (const [lang, count] of langCounts) {
    if (count > bestCount) {
      bestCount = count;
      best = lang;
    }
  }
  return best;
}

/**
 * Infer package manager from lockfile signals (npm wins over pnpm over yarn).
 * @param {object} lockfiles - { npm: boolean, pnpm: boolean, yarn: boolean }
 * @returns {string|null}
 */
function inferPackageManager(lockfiles) {
  if (!lockfiles) return null;
  if (lockfiles.npm === true) return 'npm';
  if (lockfiles.pnpm === true) return 'pnpm';
  if (lockfiles.yarn === true) return 'yarn';
  return null;
}

/**
 * @param {object} repoScan - .ai-devos/repo-scan.json (optional)
 * @param {object} dependencyGraph - .ai-devos/dependency-graph.json
 * @param {object} moduleMap - .ai-devos/module-map.json
 * @param {object} context - optional { packageJson, lockfiles: {npm,pnpm,yarn}, repoRootName }
 * @returns {object} repositoryIdentity
 */
export function inferRepositoryIdentity(repoScan, dependencyGraph, moduleMap, context) {
  const repo = repoScan || {};
  const ctx = context || {};
  const extPackages = dependencyGraph?.externalPackages || [];

  const frameworkSignals = extPackages
    .filter((p) => typeof p === 'string' && FRAMEWORK_PACKAGES.has(p.toLowerCase()))
    .map((p) => p.toLowerCase())
    .sort((a, b) => a.localeCompare(b));
  const uniqueFrameworks = [...new Set(frameworkSignals)];

  const name =
    ctx.packageJson?.name ??
    repo.name ??
    ctx.repoRootName ??
    'unknown';

  const primaryLanguage =
    repo.primaryLanguage ?? inferPrimaryLanguage(dependencyGraph?.modules);

  const packageManager =
    inferPackageManager(ctx.lockfiles) ??
    repo.packageManager ??
    null;

  return {
    name,
    primaryLanguage,
    packageManager,
    frameworkSignals: uniqueFrameworks,
  };
}
