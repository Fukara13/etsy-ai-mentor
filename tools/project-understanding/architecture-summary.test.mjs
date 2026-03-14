/**
 * Deterministic tests for architecture summary.
 */

import assert from 'assert';
import { buildArchitectureSummary } from './lib/architecture-summary/build-architecture-summary.mjs';
import { inferRepositoryIdentity } from './lib/architecture-summary/infer-repository-identity.mjs';
import { inferLayers } from './lib/architecture-summary/infer-layers.mjs';
import { inferEntrypoints } from './lib/architecture-summary/infer-entrypoints.mjs';
import { inferTestTopology } from './lib/architecture-summary/infer-test-topology.mjs';
import { inferInfrastructure } from './lib/architecture-summary/infer-infrastructure.mjs';
import { inferCrossModuleInteractions } from './lib/architecture-summary/infer-cross-module-interactions.mjs';
import { collectArchitectureSignals } from './lib/architecture-summary/collect-architecture-signals.mjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MODULE_MAP_PATH = path.resolve(__dirname, '../../.ai-devos/module-map.json');
const DEP_GRAPH_PATH = path.resolve(__dirname, '../../.ai-devos/dependency-graph.json');

const ROOT = path.resolve(__dirname, '../..');
function loadFixture(name) {
  const p = path.join(ROOT, name);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return null;
}

// --- inferRepositoryIdentity ---
{
  const depGraph = { externalPackages: ['react', 'electron', 'vitest'], modules: { 'a.ts': {}, 'b.tsx': {} } };
  const repo = inferRepositoryIdentity(null, depGraph, {});
  assert.strictEqual(repo.primaryLanguage, 'typescript');
  assert(Array.isArray(repo.frameworkSignals));
  assert(repo.frameworkSignals.includes('react'));
  assert(repo.frameworkSignals.includes('electron'));
}

{
  const ctx = { packageJson: { name: 'my-app' }, lockfiles: { npm: true, pnpm: false, yarn: false }, repoRootName: 'my-repo' };
  const repo = inferRepositoryIdentity(null, { modules: {}, externalPackages: [] }, {}, ctx);
  assert.strictEqual(repo.name, 'my-app');
  assert.strictEqual(repo.packageManager, 'npm');
}

{
  const ctx = { lockfiles: { npm: true }, repoRootName: 'fallback-repo' };
  const repo = inferRepositoryIdentity(null, { modules: {}, externalPackages: [] }, {}, ctx);
  assert.strictEqual(repo.name, 'fallback-repo');
  assert.strictEqual(repo.packageManager, 'npm');
}

// --- inferLayers ---
{
  const mm = {
    modules: [
      { name: 'src/heroes', kind: 'feature' },
      { name: 'src/shared', kind: 'shared' },
      { name: 'tools/x', kind: 'entrypoint' },
    ],
  };
  const { detectedLayers, layerAssignments } = inferLayers(mm);
  assert(Array.isArray(detectedLayers));
  assert(Array.isArray(layerAssignments));
  assert.strictEqual(layerAssignments.length, 3);
}

// --- inferEntrypoints ---
{
  const mm = {
    modules: [{ id: 'ep1', name: 'electron/desktop', kind: 'entrypoint', rootPaths: ['electron/desktop'] }],
    fileMappings: [],
  };
  const entries = inferEntrypoints(mm, {});
  assert(Array.isArray(entries));
}

{
  const mm = {
    modules: [{ id: 'ep1', name: 'tools/foo', kind: 'entrypoint', rootPaths: ['tools/bar.mjs'] }],
    fileMappings: [],
  };
  const entries = inferEntrypoints(mm, {});
  assert(entries.every((e) => /\.[a-z0-9]+$/i.test(e.path)), 'entrypoints contain files only');
}

{
  const mm = {
    modules: [{ id: 'ep1', name: 'tools/x', kind: 'entrypoint', rootPaths: ['tools/project-understanding'] }],
    fileMappings: [
      { filePath: 'tools/project-understanding/repo-scanner.mjs', moduleId: 'ep1' },
      { filePath: 'tools/project-understanding/foo.test.mjs', moduleId: 'ep1' },
    ],
  };
  const entries = inferEntrypoints(mm, {});
  assert(entries.some((e) => e.path.includes('repo-scanner.mjs')));
  assert(entries.every((e) => /\.[a-z0-9]+$/i.test(e.path)), 'no directory-only entrypoints');
}

// --- inferTestTopology ---
{
  const mm = {
    fileMappings: [
      { filePath: 'src/foo.test.ts', moduleId: 'src-foo' },
      { filePath: 'src/bar.ts', moduleId: 'src-bar' },
    ],
    modules: [{ id: 'src-foo', name: 'src/foo' }],
  };
  const depGraph = { modules: { 'src/foo.test.ts': {}, 'src/bar.ts': {} } };
  const topo = inferTestTopology(mm, depGraph);
  assert.strictEqual(topo.testFiles, 1);
  assert(Array.isArray(topo.testModules));
  assert(typeof topo.testDensity === 'number');
}

// --- inferInfrastructure ---
{
  const infra = inferInfrastructure(null);
  assert(typeof infra.hasGitHubWorkflows === 'boolean');
  assert(typeof infra.hasDocker === 'boolean');
  assert(typeof infra.hasLint === 'boolean');
  assert(typeof infra.hasFormatter === 'boolean');
}

{
  const infra = inferInfrastructure({ workflows: ['ci.yml'], configs: ['eslint.config.js', '.prettierrc'] });
  assert.strictEqual(infra.hasGitHubWorkflows, true);
  assert.strictEqual(infra.hasLint, true);
  assert.strictEqual(infra.hasFormatter, true);
}

{
  const infra = inferInfrastructure(null, { fsSignals: { hasGitHubWorkflows: true } });
  assert.strictEqual(infra.hasGitHubWorkflows, true);
}

// --- inferCrossModuleInteractions ---
{
  const mm = {
    modules: [
      { id: 'a', name: 'mod-a' },
      { id: 'b', name: 'mod-b' },
    ],
    crossModuleEdges: [
      { fromModuleId: 'a', toModuleId: 'b', edgeCount: 2 },
    ],
  };
  const edges = inferCrossModuleInteractions(mm);
  assert.strictEqual(edges.length, 1);
  assert.strictEqual(edges[0].from, 'mod-a');
  assert.strictEqual(edges[0].to, 'mod-b');
  assert.strictEqual(edges[0].edgeCount, 2);
}

// --- collectArchitectureSignals ---
{
  const edges = [
    { from: 'a', to: 'b', edgeCount: 1 },
    { from: 'b', to: 'a', edgeCount: 1 },
  ];
  const sig = collectArchitectureSignals({}, edges);
  assert.strictEqual(sig.circularDependencySignals, 1);
  assert(Array.isArray(sig.highCouplingModules));
}

// --- buildArchitectureSummary deterministic ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || {
    modules: { 'src/a.ts': { internal: [] }, 'src/b.test.ts': { internal: [] } },
    externalPackages: ['react'],
  };
  const moduleMap = loadFixture('.ai-devos/module-map.json') || {
    modules: [
      { id: 'src-a', name: 'src/a', kind: 'feature', rootPaths: ['src/a'], fileCount: 1 },
    ],
    fileMappings: [
      { filePath: 'src/a.ts', moduleId: 'src-a' },
      { filePath: 'src/b.test.ts', moduleId: 'src-a' },
    ],
    crossModuleEdges: [],
  };

  const ctx = {
    packageJson: loadFixture('package.json'),
    lockfiles: {
      npm: fs.existsSync(path.join(ROOT, 'package-lock.json')),
      pnpm: fs.existsSync(path.join(ROOT, 'pnpm-lock.yaml')),
      yarn: fs.existsSync(path.join(ROOT, 'yarn.lock')),
    },
    repoRootName: path.basename(ROOT),
    fsSignals: {
      hasGitHubWorkflows: fs.existsSync(path.join(ROOT, '.github/workflows')),
    },
  };
  const a = buildArchitectureSummary({ repoScan: null, dependencyGraph: depGraph, moduleMap, context: ctx });
  const b = buildArchitectureSummary({ repoScan: null, dependencyGraph: depGraph, moduleMap, context: ctx });
  assert.deepStrictEqual(a, b, 'buildArchitectureSummary is deterministic');
}

// --- output schema ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || {
    modules: { 'a.ts': {} },
    externalPackages: [],
  };
  const moduleMap = loadFixture('.ai-devos/module-map.json') || {
    modules: [{ id: 'm1', name: 'm1', kind: 'feature', rootPaths: ['m1'], fileCount: 1 }],
    fileMappings: [],
    crossModuleEdges: [],
  };

  const ctx = {
    packageJson: loadFixture('package.json'),
    lockfiles: { npm: true, pnpm: false, yarn: false },
    repoRootName: path.basename(ROOT),
    fsSignals: { hasGitHubWorkflows: fs.existsSync(path.join(ROOT, '.github/workflows')) },
  };
  const out = buildArchitectureSummary({
    repoScan: null,
    dependencyGraph: depGraph,
    moduleMap,
    context: ctx,
  });

  assert(typeof out.repositoryIdentity === 'object');
  assert(typeof out.repositoryIdentity.name === 'string');
  assert(typeof out.repositoryIdentity.primaryLanguage === 'string');
  assert(Array.isArray(out.repositoryIdentity.frameworkSignals));

  assert(typeof out.modules === 'object');
  assert(typeof out.modules.totalModules === 'number');
  assert(Array.isArray(out.modules.modules));

  assert(typeof out.layers === 'object');
  assert(Array.isArray(out.layers.detectedLayers));
  assert(Array.isArray(out.layers.layerAssignments));

  assert(Array.isArray(out.entrypoints));

  assert(typeof out.testTopology === 'object');
  assert(typeof out.testTopology.testFiles === 'number');
  assert(Array.isArray(out.testTopology.testModules));
  assert(typeof out.testTopology.testDensity === 'number');

  assert(typeof out.infrastructure === 'object');
  assert(typeof out.infrastructure.hasGitHubWorkflows === 'boolean');
  assert(typeof out.infrastructure.hasDocker === 'boolean');
  assert(typeof out.infrastructure.hasLint === 'boolean');
  assert(typeof out.infrastructure.hasFormatter === 'boolean');

  assert(Array.isArray(out.crossModuleInteractions));

  assert(typeof out.signals === 'object');
  assert(typeof out.signals.circularDependencySignals === 'number');
  assert(Array.isArray(out.signals.highCouplingModules));
}

// --- hardening: name from package.json ---
{
  const pkg = loadFixture('package.json');
  const ctx = { packageJson: pkg };
  const out = buildArchitectureSummary({
    repoScan: null,
    dependencyGraph: { modules: { 'a.ts': {} }, externalPackages: [] },
    moduleMap: { modules: [], fileMappings: [], crossModuleEdges: [] },
    context: ctx,
  });
  if (pkg && pkg.name) {
    assert.notStrictEqual(out.repositoryIdentity.name, 'unknown');
    assert.strictEqual(out.repositoryIdentity.name, pkg.name);
  }
}

// --- hardening: packageManager when lockfile exists ---
{
  const ctx = { lockfiles: { npm: true, pnpm: false, yarn: false } };
  const out = buildArchitectureSummary({
    repoScan: null,
    dependencyGraph: { modules: { 'a.ts': {} }, externalPackages: [] },
    moduleMap: { modules: [], fileMappings: [], crossModuleEdges: [] },
    context: ctx,
  });
  assert.strictEqual(out.repositoryIdentity.packageManager, 'npm');
}

// --- hardening: hasGitHubWorkflows when .github/workflows exists ---
{
  const hasWorkflows = fs.existsSync(path.join(ROOT, '.github/workflows'));
  const ctx = { fsSignals: { hasGitHubWorkflows: hasWorkflows } };
  const out = buildArchitectureSummary({
    repoScan: null,
    dependencyGraph: { modules: { 'a.ts': {} }, externalPackages: [] },
    moduleMap: { modules: [], fileMappings: [], crossModuleEdges: [] },
    context: ctx,
  });
  if (hasWorkflows) assert.strictEqual(out.infrastructure.hasGitHubWorkflows, true);
}

// --- hardening: entrypoints contain files only ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json');
  const moduleMap = loadFixture('.ai-devos/module-map.json');
  if (depGraph && moduleMap) {
    const ctx = {
      packageJson: loadFixture('package.json'),
      lockfiles: { npm: fs.existsSync(path.join(ROOT, 'package-lock.json')), pnpm: false, yarn: false },
      repoRootName: path.basename(ROOT),
      fsSignals: { hasGitHubWorkflows: fs.existsSync(path.join(ROOT, '.github/workflows')) },
    };
    const out = buildArchitectureSummary({ repoScan: null, dependencyGraph: depGraph, moduleMap, context: ctx });
    assert(out.entrypoints.every((e) => /\.[a-z0-9]+$/i.test(e.path)), 'all entrypoints are concrete files');
  }
}

console.log('architecture-summary tests passed');
