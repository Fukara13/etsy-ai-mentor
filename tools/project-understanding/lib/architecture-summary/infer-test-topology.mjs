/**
 * Infer test topology from module-map and dependency-graph.
 * Pure function, deterministic, no LLM.
 */

const TEST_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/i;

/**
 * @param {object} moduleMap - .ai-devos/module-map.json
 * @param {object} dependencyGraph - .ai-devos/dependency-graph.json
 * @returns {{ testFiles: number, testModules: string[], testDensity: number }}
 */
export function inferTestTopology(moduleMap, dependencyGraph) {
  const fileMappings = moduleMap?.fileMappings || [];
  const modules = moduleMap?.modules || [];
  const modulesObj = dependencyGraph?.modules || {};

  const testPaths = new Set();
  const testModuleIds = new Set();

  for (const fm of fileMappings) {
    const fp = fm.filePath || '';
    if (TEST_PATTERN.test(fp)) {
      testPaths.add(fp);
      if (fm.moduleId) testModuleIds.add(fm.moduleId);
    }
  }

  for (const fp of Object.keys(modulesObj || {})) {
    if (TEST_PATTERN.test(fp)) testPaths.add(fp);
  }

  const testFiles = testPaths.size;

  const idToName = new Map(modules.map((m) => [m.id, m.name]));
  const testModules = [...testModuleIds]
    .map((id) => idToName.get(id) || id)
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));

  const totalFiles = Object.keys(modulesObj).length || fileMappings.length || 1;
  const testDensity = totalFiles > 0 ? testFiles / totalFiles : 0;
  const rounded = Math.round(testDensity * 1000) / 1000;

  return {
    testFiles,
    testModules,
    testDensity: rounded,
  };
}
