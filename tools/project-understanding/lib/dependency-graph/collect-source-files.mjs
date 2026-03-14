/**
 * Collect source files from repo for dependency scanning.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EXTENSIONS = new Set([
  '.js', '.mjs', '.cjs',
  '.ts', '.mts', '.cts',
  '.tsx', '.jsx',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'dist-electron', 'build',
  'coverage', '.next', '.turbo', 'out', '.ai-devos', '.cursor',
  'release', 'promptu',
]);

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

function readDirSafe(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}

/**
 * Recursively collect source files under dir.
 * Returns paths relative to root.
 */
function walk(dir, root, acc = []) {
  if (!exists(dir)) return acc;
  for (const e of readDirSafe(dir)) {
    const full = path.join(dir, e.name);
    const rel = path.relative(root, full).replace(/\\/g, '/');
    if (e.isDirectory()) {
      if (IGNORE_DIRS.has(e.name)) continue;
      walk(full, root, acc);
    } else if (e.isFile()) {
      const ext = path.extname(e.name).toLowerCase();
      if (EXTENSIONS.has(ext)) {
        acc.push(rel);
      }
    }
  }
  return acc;
}

/**
 * Collect source files from repository.
 * root: absolute path to repo root
 * includePaths: optional array of subpaths to include (e.g. ['src', 'electron'])
 *   If not provided, scans entire repo except ignored dirs.
 */
export function collectSourceFiles(root, includePaths = null) {
  const files = [];
  if (includePaths && includePaths.length > 0) {
    for (const sub of includePaths) {
      const full = path.join(root, sub);
      if (exists(full)) {
        walk(full, root, files);
      }
    }
  } else {
    walk(root, root, files);
  }
  return files.sort();
}
