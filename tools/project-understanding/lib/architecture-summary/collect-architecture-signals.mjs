/**
 * Collect architecture signals: circular dependencies, high coupling.
 * Pure function, deterministic, no LLM.
 */

/**
 * Count cycles in directed graph (A->B, B->A).
 * @param {{ from: string, to: string, edgeCount: number }[]} edges
 * @returns {number}
 */
function countCircularPairs(edges) {
  const pairSet = new Set();
  for (const e of edges) {
    const f = e.from;
    const t = e.to;
    const rev = edges.find((x) => x.from === t && x.to === f);
    if (rev && f !== t) {
      const key = [f, t].sort().join('|');
      pairSet.add(key);
    }
  }
  return pairSet.size;
}

const HIGH_COUPLING_THRESHOLD = 3;

/**
 * @param {object} moduleMap - .ai-devos/module-map.json
 * @param {{ from: string, to: string, edgeCount: number }[]} crossModuleInteractions
 * @returns {{ circularDependencySignals: number, highCouplingModules: string[] }}
 */
export function collectArchitectureSignals(moduleMap, crossModuleInteractions) {
  const circularDependencySignals = countCircularPairs(crossModuleInteractions);

  const outDegree = new Map();
  const inDegree = new Map();
  for (const e of crossModuleInteractions) {
    outDegree.set(e.from, (outDegree.get(e.from) || 0) + (e.edgeCount || 1));
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + (e.edgeCount || 1));
  }

  const allModules = new Set([...outDegree.keys(), ...inDegree.keys()]);
  const highCouplingModules = [];
  for (const m of allModules) {
    const out = outDegree.get(m) || 0;
    const in_ = inDegree.get(m) || 0;
    if (out + in_ >= HIGH_COUPLING_THRESHOLD) {
      highCouplingModules.push(m);
    }
  }
  highCouplingModules.sort((a, b) => a.localeCompare(b));

  return {
    circularDependencySignals: circularDependencySignals,
    highCouplingModules,
  };
}
