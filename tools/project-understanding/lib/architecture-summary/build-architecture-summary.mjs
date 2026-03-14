/**
 * Build architecture summary from repo-scan, dependency-graph, module-map.
 * Deterministic, read-only, pure functions.
 */

import { inferRepositoryIdentity } from './infer-repository-identity.mjs';
import { inferLayers } from './infer-layers.mjs';
import { inferEntrypoints } from './infer-entrypoints.mjs';
import { inferTestTopology } from './infer-test-topology.mjs';
import { inferInfrastructure } from './infer-infrastructure.mjs';
import { inferCrossModuleInteractions } from './infer-cross-module-interactions.mjs';
import { collectArchitectureSignals } from './collect-architecture-signals.mjs';

/**
 * Map module-map modules to summary structure with role from layers.
 */
function buildModulesSummary(moduleMap, layerAssignments) {
  const layerByModule = new Map(
    (layerAssignments || []).map((a) => [a.module, a.layer])
  );
  const modules = (moduleMap?.modules || []).map((m) => ({
    name: m.name,
    fileCount: typeof m.fileCount === 'number' ? m.fileCount : 0,
    role: layerByModule.get(m.name) || 'unknown',
  }));
  modules.sort((a, b) => a.name.localeCompare(b.name));
  return {
    totalModules: modules.length,
    modules,
  };
}

/**
 * Build full architecture summary.
 * @param {object} inputs - { repoScan, dependencyGraph, moduleMap, context? }
 * @param {object} inputs.context - optional { packageJson, lockfiles, repoRootName, fsSignals }
 * @returns {object} architecture summary
 */
export function buildArchitectureSummary(inputs) {
  const { repoScan, dependencyGraph, moduleMap, context } = inputs;

  const repositoryIdentity = inferRepositoryIdentity(
    repoScan,
    dependencyGraph,
    moduleMap,
    context
  );

  const { detectedLayers, layerAssignments } = inferLayers(moduleMap);
  const modules = buildModulesSummary(moduleMap, layerAssignments);

  const entrypoints = inferEntrypoints(moduleMap, dependencyGraph);
  entrypoints.sort((a, b) => {
    const cmp = a.path.localeCompare(b.path);
    return cmp !== 0 ? cmp : a.type.localeCompare(b.type);
  });

  const testTopology = inferTestTopology(moduleMap, dependencyGraph);

  const infrastructure = inferInfrastructure(repoScan, context);

  const crossModuleInteractions = inferCrossModuleInteractions(moduleMap);

  const signals = collectArchitectureSignals(moduleMap, crossModuleInteractions);

  return {
    repositoryIdentity,
    modules,
    layers: {
      detectedLayers,
      layerAssignments: layerAssignments.sort((a, b) => {
        const cmp = a.module.localeCompare(b.module);
        return cmp !== 0 ? cmp : a.layer.localeCompare(b.layer);
      }),
    },
    entrypoints,
    testTopology,
    infrastructure,
    crossModuleInteractions,
    signals,
  };
}
