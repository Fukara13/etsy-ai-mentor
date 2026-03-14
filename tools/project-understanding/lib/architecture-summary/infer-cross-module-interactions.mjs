/**
 * Infer cross-module interactions from module-map.
 * Pure function, deterministic, no LLM.
 */

/**
 * @param {object} moduleMap - .ai-devos/module-map.json
 * @returns {{ from: string, to: string, edgeCount: number }[]}
 */
export function inferCrossModuleInteractions(moduleMap) {
  const edges = moduleMap?.crossModuleEdges || [];
  const modules = moduleMap?.modules || [];
  const idToName = new Map(modules.map((m) => [m.id, m.name]));

  const result = edges.map((e) => ({
    from: idToName.get(e.fromModuleId) ?? e.fromModuleId,
    to: idToName.get(e.toModuleId) ?? e.toModuleId,
    edgeCount: typeof e.edgeCount === 'number' ? e.edgeCount : 0,
  }));

  result.sort((a, b) => {
    const cmp = a.from.localeCompare(b.from);
    if (cmp !== 0) return cmp;
    const cmp2 = a.to.localeCompare(b.to);
    return cmp2;
  });

  return result;
}
