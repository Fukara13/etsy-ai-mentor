/**
 * Build dependency graph from source files.
 */

import path from 'path';
import fs from 'fs';
import { collectSourceFiles } from './collect-source-files.mjs';
import { extractDependencies } from './extract-dependencies.mjs';
import { resolveRelative, toSlash } from './normalize-module-id.mjs';

const EXT_PROBES = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '/index.ts', '/index.js'];

/**
 * Check if specifier is external (package-like).
 * node:path, react, @scope/pkg = external
 */
function isExternal(specifier) {
  const s = specifier.trim();
  if (!s) return true;
  if (s.startsWith('node:')) return true;
  if (s.startsWith('.')) return false;
  if (s.startsWith('/')) return false;
  if (/^@[^/]+\//.test(s)) return true;
  if (/^[a-zA-Z][\w-]*(\/[\w.-]+)*$/.test(s)) return true;
  return false;
}

/**
 * Resolve relative specifier to repo-root path.
 */
function resolveToRepoPath(fromFile, specifier) {
  const fromDir = toSlash(fromFile).replace(/\/[^/]*$/, '') || '.';
  const base = fromDir === '.' ? '' : fromDir + '/';
  const raw = specifier.replace(/^\.\//, '');
  let joined = base + raw;
  const parts = joined.split('/').filter(Boolean);
  const out = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

/**
 * Probe for resolved file in sourceSet or filesystem.
 */
function resolveInternalPath(repoRoot, unresolved, sourceSet) {
  const candidates = [];
  const base = unresolved.replace(/\.[^.]+$/, '') || unresolved;
  for (const ext of EXT_PROBES) {
    const candidate = ext ? base + ext : unresolved;
    if (sourceSet.has(candidate)) return candidate;
    const fullPath = path.join(repoRoot, candidate.replace(/\//g, path.sep));
    try {
      if (fs.existsSync(fullPath)) return candidate;
    } catch {}
    if (ext && ext.startsWith('/')) {
      const withIndex = base + ext;
      if (sourceSet.has(withIndex)) return withIndex;
    }
  }
  return base || unresolved;
}

/**
 * Build dependency graph.
 */
export function buildDependencyGraph(repoRoot, options = {}) {
  const includePaths = options.includePaths || null;
  const sourceFiles = collectSourceFiles(repoRoot, includePaths);
  const sourceSet = new Set(sourceFiles);

  const modules = {};
  const externalPackagesSet = new Set();

  for (const file of sourceFiles) {
    const fullPath = path.join(repoRoot, file.replace(/\//g, path.sep));
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf-8');
    } catch {
      continue;
    }

    const specifiers = extractDependencies(content);
    const internal = [];
    const external = [];

    for (const spec of specifiers) {
      const s = spec.trim();
      if (!s) continue;

      if (isExternal(s)) {
        if (!external.includes(s)) external.push(s);
        externalPackagesSet.add(s);
      } else {
        const resolved = resolveToRepoPath(file, s);
        const final = resolveInternalPath(repoRoot, resolved, sourceSet);
        if (final && !internal.includes(final)) internal.push(final);
      }
    }

    internal.sort();
    external.sort();
    if (internal.length > 0 || external.length > 0) {
      modules[file] = { internal, external };
    }
  }

  const externalPackages = [...externalPackagesSet].sort();
  let edgeCount = 0;
  for (const m of Object.values(modules)) {
    edgeCount += (m.internal?.length || 0) + (m.external?.length || 0);
  }

  const internalModuleCount = new Set(
    Object.values(modules).flatMap((m) => m.internal || [])
  ).size;

  return {
    generatedAt: 'deterministic',
    root: '.',
    summary: {
      sourceFileCount: sourceFiles.length,
      internalModuleCount,
      externalPackageCount: externalPackages.length,
      edgeCount,
    },
    modules: sortObjectKeys(modules),
    externalPackages,
  };
}

function sortObjectKeys(obj) {
  const out = {};
  for (const k of Object.keys(obj).sort()) {
    out[k] = obj[k];
  }
  return out;
}
