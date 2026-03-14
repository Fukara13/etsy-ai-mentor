/**
 * Orchestrate module map derivation from dependency graph.
 */

import { inferModuleBoundaries } from './infer-module-boundaries.mjs';
import { buildCrossModuleEdges } from './build-cross-module-edges.mjs';
import { classifyModuleDomain } from './classify-module-domain.mjs';
import {
  sortModules,
  sortFileMappings,
  sortCrossModuleEdges,
  sortUnassigned,
} from './sort-module-map.mjs';

const REPO_SCAN_PATH = '.ai-devos/repo-scan.json';
const DEP_GRAPH_PATH = '.ai-devos/dependency-graph.json';

export function deriveModuleMap(depGraph, options = {}) {
  const repoScanPath = options.repoScanPath ?? REPO_SCAN_PATH;
  const dependencyGraphPath = options.dependencyGraphPath ?? DEP_GRAPH_PATH;

  const modulesObj = depGraph?.modules || {};
  const filePaths = Object.keys(modulesObj).filter(Boolean);
  const totalFiles = filePaths.length;

  const { modules: rawModules, fileToModule } = inferModuleBoundaries(filePaths);
  const moduleIdToRoot = new Map(rawModules.map((m) => [m.id, (m.rootPaths && m.rootPaths[0]) || m.name]));

  const fileMappings = [];
  const unassignedFiles = [];

  for (const fp of filePaths) {
    const moduleId = fileToModule.get(fp) ?? null;
    const root = moduleId ? moduleIdToRoot.get(moduleId) : null;
    const kind = root ? classifyModuleDomain(root, fp) : null;

    let classification = 'unassigned';
    let reason = 'no matching module root';

    if (moduleId) {
      const isTest = kind === 'test-only';
      const isShared = kind === 'shared';
      classification = isTest ? 'test-only' : isShared ? 'shared' : 'mapped';
      reason = isTest ? 'test file' : isShared ? 'shared module' : `root: ${root}`;
    } else {
      unassignedFiles.push(fp);
    }

    fileMappings.push({
      filePath: fp,
      moduleId,
      classification,
      reason,
    });
  }

  const crossModuleEdges = buildCrossModuleEdges(depGraph, fileToModule);
  const mappedCount = fileMappings.filter((m) => m.moduleId !== null).length;

  const summary = {
    totalFiles,
    mappedFiles: mappedCount,
    unassignedFiles: unassignedFiles.length,
    moduleCount: rawModules.length,
    crossModuleEdgeCount: crossModuleEdges.length,
  };

  return {
    source: { repoScanPath, dependencyGraphPath },
    summary,
    modules: sortModules(rawModules),
    fileMappings: sortFileMappings(fileMappings),
    crossModuleEdges: sortCrossModuleEdges(crossModuleEdges),
    unassignedFiles: sortUnassigned(unassignedFiles),
  };
}
