/**
 * Infer entrypoints from module-map and dependency-graph.
 * Emits concrete files only, never directory-only paths.
 * Pure function, deterministic, no LLM.
 */

const FILE_EXT_PATTERN = /\.[a-z0-9]+$/i;

function isConcreteFile(p) {
  return typeof p === 'string' && FILE_EXT_PATTERN.test(p.trim());
}

const ENTRY_SIGNALS = [
  { path: 'electron/desktop/main', type: 'server' },
  { path: 'electron/main', type: 'server' },
  { path: 'src/desktop/main', type: 'server' },
  { path: 'src/main', type: 'server' },
  { path: 'main.ts', type: 'server' },
  { path: 'main.js', type: 'server' },
  { path: 'index.ts', type: 'script' },
  { path: 'index.js', type: 'script' },
  { path: 'tools/', type: 'cli' },
  { path: 'scripts/', type: 'script' },
  { path: 'worker', type: 'worker' },
];

/**
 * Classify entrypoint type from path.
 */
function classifyEntrypointType(filePath) {
  const p = (filePath || '').replace(/\\/g, '/');
  for (const { path: signal, type } of ENTRY_SIGNALS) {
    if (p.includes(signal)) return type;
  }
  if (p.includes('tools/') || p.endsWith('.mjs') || p.endsWith('.cli.')) return 'cli';
  if (p.includes('worker')) return 'worker';
  if (p.includes('main') || p.includes('server')) return 'server';
  return 'script';
}

/**
 * @param {object} moduleMap - .ai-devos/module-map.json
 * @param {object} dependencyGraph - .ai-devos/dependency-graph.json
 * @returns {{ path: string, type: 'cli'|'server'|'worker'|'script' }[]}
 */
export function inferEntrypoints(moduleMap, dependencyGraph) {
  const entries = [];
  const seen = new Set();

  const modules = moduleMap?.modules || [];
  const fileMappings = moduleMap?.fileMappings || [];
  const modulesObj = dependencyGraph?.modules || {};

  for (const m of modules) {
    if (m.kind === 'entrypoint' && m.rootPaths && m.rootPaths.length > 0) {
      const root = m.rootPaths[0];
      if (isConcreteFile(root)) {
        if (seen.has(root)) continue;
        seen.add(root);
        entries.push({ path: root, type: classifyEntrypointType(root) });
      } else {
        const moduleFiles = fileMappings
          .filter((fm) => fm.moduleId === m.id && isConcreteFile(fm.filePath))
          .map((fm) => fm.filePath);
        const executableExts = ['.mjs', '.js', '.ts', '.tsx', '.cjs'];
        for (const fp of moduleFiles) {
          if (executableExts.some((ext) => fp.endsWith(ext)) && !seen.has(fp)) {
            seen.add(fp);
            entries.push({ path: fp, type: classifyEntrypointType(fp) });
          }
        }
      }
    }
  }

  for (const fp of Object.keys(modulesObj)) {
    if (
      isConcreteFile(fp) &&
      (fp.endsWith('main.ts') || fp.endsWith('main.tsx') || fp.endsWith('main.js')) &&
      !seen.has(fp)
    ) {
      seen.add(fp);
      entries.push({ path: fp, type: 'server' });
    }
  }

  entries.sort((a, b) => {
    const cmp = a.path.localeCompare(b.path);
    return cmp !== 0 ? cmp : a.type.localeCompare(b.type);
  });

  return entries;
}
