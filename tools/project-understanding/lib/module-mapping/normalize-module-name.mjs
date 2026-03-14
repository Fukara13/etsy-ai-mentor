/**
 * Convert path/domain candidates into stable module ids and names.
 */

export function toSlash(p) {
  if (typeof p !== 'string') return '';
  return p.replace(/\\/g, '/').trim();
}

/**
 * Derive stable module id from root path (e.g. src/governance -> governance).
 */
export function pathToModuleId(rootPath) {
  const p = toSlash(rootPath);
  if (!p) return 'unknown';
  const parts = p.split('/').filter(Boolean);
  if (parts.length === 0) return 'root';
  if (parts.length === 1) return parts[0];
  return parts.join('-');
}

/**
 * Derive display name from module id.
 */
export function moduleIdToName(moduleId) {
  if (!moduleId || moduleId === 'unknown') return 'unknown';
  return moduleId.replace(/-/g, ' ');
}
