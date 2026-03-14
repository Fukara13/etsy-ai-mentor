/**
 * Normalize file paths and module ids to deterministic slash style.
 */

/**
 * Convert backslashes to forward slashes.
 */
export function toSlash(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').trim();
}

/**
 * Normalize relative path to repo-root style (e.g. src/foo/bar.ts).
 */
export function normalizePath(relPath, root) {
  let p = toSlash(relPath);
  // Remove leading ./
  if (p.startsWith('./')) p = p.slice(2);
  // Normalize ..
  const parts = p.split('/').filter(Boolean);
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
 * Resolve relative import from filePath.
 */
export function resolveRelative(fromFile, specifier, root) {
  const fromDir = toSlash(fromFile).replace(/\/[^/]+$/, '') || '.';
  const base = fromDir === '.' ? '' : fromDir + '/';
  const joined = base + toSlash(specifier).replace(/^\.\//, '');
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
