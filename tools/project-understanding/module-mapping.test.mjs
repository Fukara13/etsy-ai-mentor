/**
 * Deterministic tests for module mapping.
 */

import assert from 'assert';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pathToModuleId, toSlash } from './lib/module-mapping/normalize-module-name.mjs';
import { classifyModuleDomain } from './lib/module-mapping/classify-module-domain.mjs';
import {
  inferModuleRoot,
  inferModuleBoundaries,
} from './lib/module-mapping/infer-module-boundaries.mjs';
import { buildCrossModuleEdges } from './lib/module-mapping/build-cross-module-edges.mjs';
import { deriveModuleMap } from './lib/module-mapping/derive-module-map.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

// --- normalize-module-name ---
{
  assert.strictEqual(pathToModuleId('src/governance'), 'src-governance', 'path to id');
  assert.strictEqual(pathToModuleId('src/governance'), pathToModuleId('src/governance'), 'same input => same id');
  assert.strictEqual(pathToModuleId('utils'), 'utils', 'single segment');
}

{
  assert.strictEqual(toSlash('a\\b\\c'), 'a/b/c', 'path noise removed');
}

// --- classify-module-domain ---
{
  assert.strictEqual(classifyModuleDomain('src/shared', 'src/shared/foo.ts'), 'shared', 'shared path');
  assert.strictEqual(classifyModuleDomain('common', 'common/bar.ts'), 'shared', 'common path');
}

{
  assert.strictEqual(classifyModuleDomain('__tests__', '__tests__/a.test.ts'), 'test-only', 'tests dir');
  assert.strictEqual(classifyModuleDomain('src/foo/__tests__', 'x.test.ts'), 'test-only', '__tests__ root');
}

{
  assert.strictEqual(classifyModuleDomain('src/infrastructure', 'x.ts'), 'infra', 'infra path');
}

{
  assert.strictEqual(classifyModuleDomain('tools/project-understanding', 'tools/foo.mjs'), 'entrypoint', 'tools mjs');
}

{
  const k = classifyModuleDomain('unknown/zone', 'x.ts');
  assert(['feature', 'unknown'].includes(k), 'unknown/ambiguous falls to feature or unknown');
}

// --- infer-module-boundaries ---
{
  const root = inferModuleRoot('src/governance/foo.ts');
  assert.strictEqual(root, 'src/governance', 'stable root for known path');
}

{
  const root = inferModuleRoot('archive/legacy-etsy-mentor/electron/db.ts');
  assert.strictEqual(root, 'archive/legacy-etsy-mentor', 'archive root');
}

{
  const { modules, fileToModule } = inferModuleBoundaries([
    'src/governance/a.ts',
    'src/governance/b.ts',
    'src/github/c.ts',
    'orphan/x.ts',
  ]);
  assert(modules.length >= 2, 'groups directory clusters');
  assert.strictEqual(fileToModule.get('src/governance/a.ts'), 'src-governance', 'maps file to module id');
}

{
  const { modules, fileToModule } = inferModuleBoundaries(['unknown/single/file.ts']);
  assert(fileToModule.has('unknown/single/file.ts'), 'conservative fallback maps unknown/single');
}

// --- build-cross-module-edges ---
{
  const depGraph = {
    modules: {
      'src/a/foo.ts': { internal: ['src/b/bar.ts'], external: [] },
      'src/b/bar.ts': { internal: [], external: [] },
    },
  };
  const fileToModule = new Map([
    ['src/a/foo.ts', 'src-a'],
    ['src/b/bar.ts', 'src-b'],
  ]);
  const edges = buildCrossModuleEdges(depGraph, fileToModule);
  assert.strictEqual(edges.length, 1, 'one cross-module edge');
  assert.strictEqual(edges[0].fromModuleId, 'src-a');
  assert.strictEqual(edges[0].toModuleId, 'src-b');
  assert.strictEqual(edges[0].edgeCount, 1);
}

{
  const depGraph = { modules: { 'x.ts': { internal: ['y.ts'], external: [] } } };
  const fileToModule = new Map([['x.ts', 'mod-x']]);
  const edges = buildCrossModuleEdges(depGraph, fileToModule);
  assert.strictEqual(edges.length, 0, 'ignores unassigned target y.ts');
}

// --- derive-module-map ---
{
  const depGraph = {
    modules: {
      'src/governance/a.ts': { internal: ['src/shared/b.ts'], external: [] },
      'src/shared/b.ts': { internal: [], external: [] },
    },
  };
  const map = deriveModuleMap(depGraph);
  assert(map.summary.totalFiles === 2, 'correct totalFiles');
  assert(map.summary.moduleCount >= 1, 'has modules');
  assert(Array.isArray(map.modules), 'modules array');
  assert(Array.isArray(map.fileMappings), 'fileMappings array');
  assert(Array.isArray(map.unassignedFiles), 'unassignedFiles array');
  assert(Array.isArray(map.crossModuleEdges), 'crossModuleEdges array');
  assert(!('generatedAt' in map) || map.generatedAt == null, 'no generatedAt or null');
}

{
  const depGraph = { modules: { 'x/y/z.ts': { internal: [], external: [] } } };
  const a = deriveModuleMap(depGraph);
  const b = deriveModuleMap(depGraph);
  assert.deepStrictEqual(a, b, 'deterministic across runs');
}

{
  const depGraph = { modules: {} };
  const map = deriveModuleMap(depGraph);
  assert.strictEqual(map.summary.totalFiles, 0);
  assert.strictEqual(map.summary.mappedFiles, 0);
  assert.strictEqual(map.summary.unassignedFiles, 0);
}

// --- CLI (integration) ---
{
  const depPath = path.join(ROOT, '.ai-devos/dependency-graph.json');
  if (!fs.existsSync(depPath)) {
    console.log('Skipping CLI test: dependency-graph.json not present');
  } else {
    const outPath = path.join(ROOT, '.ai-devos/module-map.json');
    execSync('node tools/project-understanding/module-mapping.mjs', { cwd: ROOT });
    assert(fs.existsSync(outPath), 'writes module-map.json');
    const content1 = fs.readFileSync(outPath, 'utf-8');
    execSync('node tools/project-understanding/module-mapping.mjs', { cwd: ROOT });
    const content2 = fs.readFileSync(outPath, 'utf-8');
    assert.strictEqual(content1, content2, 'repeated runs produce same content');
    const parsed = JSON.parse(content1);
    assert(!parsed.generatedAt || parsed.generatedAt == null, 'no timestamp in output');
  }
}

console.log('All module-mapping tests passed.');
