/**
 * Aggregate dependency graph edges at module level.
 */

export function buildCrossModuleEdges(depGraph, fileToModule) {
  const edgeMap = new Map();

  const modules = depGraph?.modules || {};
  for (const [fromFile, meta] of Object.entries(modules)) {
    const fromMod = fileToModule.get(fromFile);
    if (!fromMod) continue;

    const internal = meta.internal || [];
    for (const toFile of internal) {
      const toMod = fileToModule.get(toFile);
      if (!toMod || toMod === fromMod) continue;

      const key = `${fromMod}\t${toMod}`;
      edgeMap.set(key, (edgeMap.get(key) || 0) + 1);
    }
  }

  const edges = [];
  for (const [key, count] of edgeMap) {
    const [from, to] = key.split('\t');
    edges.push({ fromModuleId: from, toModuleId: to, edgeCount: count });
  }
  return edges.sort((a, b) => {
    const c = a.fromModuleId.localeCompare(b.fromModuleId);
    return c !== 0 ? c : a.toModuleId.localeCompare(b.toModuleId);
  });
}
