/**
 * Deterministic tests for ownership inference.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildOwnershipMap,
  pathToBucket,
  BUCKETS,
  normalizeScore,
} from './lib/ownership-inference/index.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function loadFixture(name) {
  const p = path.join(ROOT, name);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return null;
}

// --- 1. output artifact structure ---
{
  const depGraph = { modules: {} };
  const moduleMap = {
    modules: [{ id: 'm1', name: 'src/governance' }],
    crossModuleEdges: [],
  };
  const archSummary = {
    modules: { modules: [{ name: 'src/governance', role: 'domain', fileCount: 5 }] },
    crossModuleInteractions: [],
    testTopology: { testModules: ['src/governance'] },
  };
  const hotspotReport = { hotspots: [] };
  const out = buildOwnershipMap(depGraph, moduleMap, archSummary, hotspotReport);
  assert(typeof out.summary === 'object');
  assert(typeof out.summary.totalModules === 'number');
  assert(typeof out.thresholds === 'object');
  assert(Array.isArray(out.ownership));
  assert(out.ownership.length >= 1);
  const rec = out.ownership[0];
  assert(typeof rec.module === 'string');
  assert(typeof rec.ownerCandidate === 'string');
  assert(['PRIMARY', 'SHARED', 'UNKNOWN'].includes(rec.ownershipType));
  assert(typeof rec.confidence === 'number');
  assert(typeof rec.signals === 'object');
  assert(Array.isArray(rec.explanations));
}

// --- 2. PRIMARY classification ---
{
  const moduleMap = {
    modules: [{ id: 'm1', name: 'src/governance' }],
    crossModuleEdges: [],
  };
  const archSummary = {
    modules: { modules: [{ name: 'src/governance', role: 'domain' }] },
    crossModuleInteractions: [],
    testTopology: { testModules: ['src/governance'] },
  };
  const out = buildOwnershipMap({}, moduleMap, archSummary, { hotspots: [] });
  const gov = out.ownership.find((o) => o.module === 'src/governance');
  assert(gov);
  assert.strictEqual(gov.ownershipType, 'PRIMARY');
  assert.strictEqual(gov.ownerCandidate, 'governance');
}

// --- 3. SHARED classification when delta <= 0.10 ---
{
  const moduleMap = {
    modules: [{ id: 'm1', name: 'src/shared' }],
    crossModuleEdges: [],
  };
  const archSummary = {
    modules: { modules: [{ name: 'src/shared', role: 'infrastructure' }] },
    crossModuleInteractions: [],
    testTopology: { testModules: [] },
  };
  const out = buildOwnershipMap({}, moduleMap, archSummary, { hotspots: [] });
  const rec = out.ownership.find((o) => o.module === 'src/shared');
  assert(rec);
  assert(['PRIMARY', 'SHARED', 'UNKNOWN'].includes(rec.ownershipType));
}

// --- 4. UNKNOWN classification when top score < 0.35 ---
{
  const moduleMap = {
    modules: [{ id: 'm1', name: 'x/y/z' }],
    crossModuleEdges: [],
  };
  const archSummary = {
    modules: { modules: [{ name: 'x/y/z', role: 'unknown' }] },
    crossModuleInteractions: [],
    testTopology: { testModules: [] },
  };
  const out = buildOwnershipMap({}, moduleMap, archSummary, { hotspots: [] });
  const rec = out.ownership.find((o) => o.module === 'x/y/z');
  assert(rec);
  assert.strictEqual(rec.ownershipType, 'UNKNOWN');
  assert.strictEqual(rec.ownerCandidate, 'unknown');
}

// --- 5. confidence equals top score ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || {};
  const moduleMap = loadFixture('.ai-devos/module-map.json') || { modules: [], crossModuleEdges: [] };
  const archSummary = loadFixture('.ai-devos/architecture-summary.json') || { modules: { modules: [] } };
  const hotspotReport = loadFixture('.ai-devos/hotspot-report.json') || { hotspots: [] };
  const out = buildOwnershipMap(depGraph, moduleMap, archSummary, hotspotReport);
  for (const rec of out.ownership) {
    assert(typeof rec.confidence === 'number');
    assert(rec.confidence >= 0 && rec.confidence <= 1);
  }
}

// --- 6. threshold values emitted correctly ---
{
  const out = buildOwnershipMap({}, { modules: [], crossModuleEdges: [] }, { modules: { modules: [] } }, { hotspots: [] });
  assert.strictEqual(out.thresholds.highConfidenceMin, 0.75);
  assert.strictEqual(out.thresholds.mediumConfidenceMin, 0.5);
  assert.strictEqual(out.thresholds.sharedDeltaMax, 0.1);
  assert.strictEqual(out.thresholds.unknownMinConfidence, 0.35);
}

// --- 7. path-to-bucket mapping ---
{
  assert.strictEqual(pathToBucket('src/governance'), 'governance');
  assert.strictEqual(pathToBucket('src/github'), 'github-backbone');
  assert.strictEqual(pathToBucket('tools/project-understanding'), 'project-understanding');
  assert.strictEqual(pathToBucket('src/heroes'), 'hero-ministry');
  assert.strictEqual(pathToBucket('src/desktop'), 'desktop-control-center');
  assert.strictEqual(pathToBucket('electron/desktop'), 'desktop-control-center');
  assert.strictEqual(pathToBucket('src/shared'), 'shared-core');
  assert.strictEqual(pathToBucket('archive/legacy-etsy-mentor'), 'archive-legacy');
  assert.strictEqual(pathToBucket('x/y'), 'unknown');
}

// --- 8. role affinity keyword mapping ---
{
  const moduleMap = {
    modules: [{ id: 'a', name: 'src/github' }],
    crossModuleEdges: [],
  };
  const archSummary = {
    modules: { modules: [{ name: 'src/github', role: 'domain' }] },
    crossModuleInteractions: [],
    testTopology: { testModules: ['src/github'] },
  };
  const out = buildOwnershipMap({}, moduleMap, archSummary, { hotspots: [] });
  const gh = out.ownership.find((o) => o.module === 'src/github');
  assert(gh);
  assert.strictEqual(gh.ownerCandidate, 'github-backbone');
}

// --- 9. dependency affinity behaves predictably ---
{
  const moduleMap = {
    modules: [
      { id: 'a', name: 'src/github' },
      { id: 'b', name: 'src/github/intake' },
    ],
    crossModuleEdges: [],
  };
  const archSummary = {
    modules: {
      modules: [
        { name: 'src/github', role: 'domain' },
        { name: 'src/github/intake', role: 'domain' },
      ],
    },
    crossModuleInteractions: [{ from: 'src/github', to: 'src/github/intake', edgeCount: 5 }],
    testTopology: { testModules: ['src/github'] },
  };
  const out = buildOwnershipMap({}, moduleMap, archSummary, { hotspots: [] });
  const intake = out.ownership.find((o) => o.module === 'src/github/intake');
  assert(intake);
  assert(typeof intake.signals.dependencyAffinity === 'number');
}

// --- 10. explanations present and template-based ---
{
  const validPatterns = [
    'module path strongly aligns with',
    'module role aligns with',
    'dependency neighborhood clusters',
    'test proximity supports',
    'hotspot interaction patterns',
    'top two ownership candidates',
    'signals were insufficient',
  ];
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || {};
  const moduleMap = loadFixture('.ai-devos/module-map.json') || { modules: [], crossModuleEdges: [] };
  const archSummary = loadFixture('.ai-devos/architecture-summary.json') || { modules: { modules: [] } };
  const hotspotReport = loadFixture('.ai-devos/hotspot-report.json') || { hotspots: [] };
  const out = buildOwnershipMap(depGraph, moduleMap, archSummary, hotspotReport);
  for (const rec of out.ownership) {
    assert(rec.explanations.length >= 1, `module ${rec.module} must have at least one explanation`);
    assert(rec.explanations.length <= 4);
    for (const ex of rec.explanations) {
      const matches = validPatterns.some((p) => ex.includes(p) || ex.startsWith('signals'));
      assert(matches, `unexpected explanation: ${ex}`);
    }
  }
}

// --- 11. same input produces identical output ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || {};
  const moduleMap = loadFixture('.ai-devos/module-map.json') || { modules: [], crossModuleEdges: [] };
  const archSummary = loadFixture('.ai-devos/architecture-summary.json') || { modules: { modules: [] } };
  const hotspotReport = loadFixture('.ai-devos/hotspot-report.json') || { hotspots: [] };
  const a = buildOwnershipMap(depGraph, moduleMap, archSummary, hotspotReport);
  const b = buildOwnershipMap(depGraph, moduleMap, archSummary, hotspotReport);
  assert.deepStrictEqual(a, b);
}

// --- 12. missing required artifact fails clearly ---
{
  const cliSource = fs.readFileSync(path.join(__dirname, 'ownership-inference.mjs'), 'utf-8');
  assert(cliSource.includes('Missing'));
  assert(cliSource.includes('process.exit(1)'));
}

// --- normalizeScore ---
{
  assert.strictEqual(normalizeScore(0.5), 0.5);
  assert.strictEqual(normalizeScore(1.234), 1);
  assert.strictEqual(normalizeScore(-1), 0);
}

console.log('ownership-inference tests passed');
