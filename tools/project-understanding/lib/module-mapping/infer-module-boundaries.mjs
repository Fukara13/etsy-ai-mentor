/**
 * Infer stable module groups using conservative path-based heuristics.
 */

import { pathToModuleId } from './normalize-module-name.mjs';
import { classifyModuleDomain } from './classify-module-domain.mjs';

const STABLE_ROOTS = [
  'src/governance', 'src/github', 'src/repair-engine', 'src/heroes',
  'src/desktop', 'src/shared', 'src/operator', 'src/application',
  'src/components', 'src/lib', 'src/screens',
  'electron/desktop', 'electron/gates', 'electron/ipc', 'electron/shared',
  'tools/project-understanding', 'archive/legacy-etsy-mentor', 'scripts',
  'data', 'docs', 'architecture',
];

function toSlash(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').trim();
}

/**
 * Find module root for a file path.
 * Returns root path (e.g. src/governance) or null if unassigned.
 */
export function inferModuleRoot(filePath) {
  const p = toSlash(filePath);
  if (!p) return null;

  for (const root of STABLE_ROOTS) {
    if (p === root || p.startsWith(root + '/')) return root;
  }

  const parts = p.split('/').filter(Boolean);
  if (parts.length >= 2) return parts.slice(0, 2).join('/');
  if (parts.length === 1) return parts[0];
  return null;
}

/**
 * Build module map from file list.
 * Returns { modules: [{ id, name, kind, rootPaths, fileCount }], fileToModule: Map }
 */
export function inferModuleBoundaries(filePaths) {
  const rootToFiles = new Map();
  const fileToModule = new Map();

  for (const fp of filePaths) {
    const root = inferModuleRoot(fp);
    if (root) {
      if (!rootToFiles.has(root)) rootToFiles.set(root, []);
      rootToFiles.get(root).push(fp);
      const id = pathToModuleId(root);
      fileToModule.set(fp, id);
    }
  }

  const modules = [];
  for (const [root, files] of rootToFiles) {
    const id = pathToModuleId(root);
    const sampleFile = files[0];
    const kind = classifyModuleDomain(root, sampleFile);
    modules.push({
      id,
      name: root,
      kind,
      rootPaths: [root],
      fileCount: files.length,
    });
  }

  return { modules, fileToModule };
}
