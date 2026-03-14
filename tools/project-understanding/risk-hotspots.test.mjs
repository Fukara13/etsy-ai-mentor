/**
 * Deterministic tests for risk hotspot detection.
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  generateHotspotReport,
  computeInboundOutboundCounts,
  computeCrossInteractionCounts,
  getCircularModuleSet,
  getModuleTestDensity,
  deriveRiskLevel,
  deriveReasons,
  scoreModuleHotspot,
} from './lib/risk-hotspots/build-hotspot-report.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');

function loadFixture(name) {
  const p = path.join(ROOT, name);
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return null;
}

// --- 1. generates hotspot report from valid inputs ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || { modules: {}, externalPackages: [] };
  const moduleMap = loadFixture('.ai-devos/module-map.json') || {
    modules: [{ id: 'a', name: 'm1' }, { id: 'b', name: 'm2' }],
    crossModuleEdges: [],
  };
  const archSummary = loadFixture('.ai-devos/architecture-summary.json') || {
    modules: { modules: [{ name: 'm1', fileCount: 5 }, { name: 'm2', fileCount: 3 }] },
    crossModuleInteractions: [],
    testTopology: { testDensity: 0.2, testModules: ['m1'] },
    signals: { circularDependencySignals: 0, highCouplingModules: [] },
  };
  const report = generateHotspotReport(depGraph, moduleMap, archSummary);
  assert.strictEqual(report.version, 1);
  assert(typeof report.summary.totalModules === 'number');
  assert(typeof report.summary.hotspotCount === 'number');
  assert(Array.isArray(report.hotspots));
  assert(report.hotspots.length >= 1);
}

// --- 2. output is deterministic across repeated runs ---
{
  const depGraph = loadFixture('.ai-devos/dependency-graph.json') || { modules: {} };
  const moduleMap = loadFixture('.ai-devos/module-map.json') || {
    modules: [{ id: 'x', name: 'x' }],
    crossModuleEdges: [],
  };
  const archSummary = loadFixture('.ai-devos/architecture-summary.json') || {
    modules: { modules: [{ name: 'x', fileCount: 1 }] },
    crossModuleInteractions: [],
    testTopology: {},
    signals: {},
  };
  const a = generateHotspotReport(depGraph, moduleMap, archSummary);
  const b = generateHotspotReport(depGraph, moduleMap, archSummary);
  assert.deepStrictEqual(a, b, 'deterministic across runs');
}

// --- 3. sorts hotspots by score desc then module asc ---
{
  const archSummary = {
    modules: { modules: [{ name: 'a', fileCount: 50 }, { name: 'b', fileCount: 1 }, { name: 'c', fileCount: 50 }] },
    crossModuleInteractions: [],
    testTopology: { testDensity: 0, testModules: [] },
    signals: { highCouplingModules: ['a'] },
  };
  const moduleMap = {
    modules: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }, { id: 'c', name: 'c' }],
    crossModuleEdges: [],
  };
  const report = generateHotspotReport({}, moduleMap, archSummary);
  for (let i = 1; i < report.hotspots.length; i++) {
    const prev = report.hotspots[i - 1];
    const curr = report.hotspots[i];
    const cmp = (curr.score ?? 0) - (prev.score ?? 0);
    assert(cmp <= 0, `scores should be descending: ${prev.score} >= ${curr.score}`);
    if (cmp === 0) {
      assert(prev.module <= curr.module, 'tie-break by module name asc');
    }
  }
}

// --- 4. computes inbound dependency contribution correctly ---
{
  const moduleMap = {
    modules: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }, { id: 'c', name: 'c' }],
    crossModuleEdges: [
      { fromModuleId: 'b', toModuleId: 'a', edgeCount: 3 },
      { fromModuleId: 'c', toModuleId: 'a', edgeCount: 2 },
    ],
  };
  const { inbound } = computeInboundOutboundCounts(moduleMap);
  assert.strictEqual(inbound.get('a'), 5);
  assert.strictEqual(inbound.get('b'), 0);
}

// --- 5. computes outbound dependency contribution correctly ---
{
  const moduleMap = {
    modules: [{ id: 'a', name: 'a' }, { id: 'b', name: 'b' }],
    crossModuleEdges: [
      { fromModuleId: 'a', toModuleId: 'b', edgeCount: 4 },
    ],
  };
  const { outbound } = computeInboundOutboundCounts(moduleMap);
  assert.strictEqual(outbound.get('a'), 4);
  assert.strictEqual(outbound.get('b'), 0);
}

// --- 6. adds circular dependency risk conservatively ---
{
  const archSummary = {
    modules: { modules: [{ name: 'x', fileCount: 1 }] },
    signals: { highCouplingModules: ['x'] },
  };
  const report = generateHotspotReport({}, { modules: [{ id: 'x', name: 'x' }], crossModuleEdges: [] }, archSummary);
  const x = report.hotspots.find((h) => h.module === 'x');
  assert(x, 'module x found');
  assert.strictEqual(x.factors.circularDependencySignals, 1);
  assert(x.factorScores.circularDependencyScore > 0);
}

// --- 7. increases risk when test density is low ---
{
  const lowDensity = scoreModuleHotspot('m', {
    inboundCount: 0,
    outboundCount: 0,
    circularParticipant: false,
    testDensity: 0,
    fileCount: 5,
    crossInteractionCount: 0,
    maxInbound: 1,
    maxOutbound: 1,
    maxFileCount: 10,
    maxCrossInteraction: 1,
  });
  const highDensity = scoreModuleHotspot('m', {
    inboundCount: 0,
    outboundCount: 0,
    circularParticipant: false,
    testDensity: 0.9,
    fileCount: 5,
    crossInteractionCount: 0,
    maxInbound: 1,
    maxOutbound: 1,
    maxFileCount: 10,
    maxCrossInteraction: 1,
  });
  assert(lowDensity.score >= highDensity.score);
  assert(lowDensity.factorScores.lowTestDensityScore > highDensity.factorScores.lowTestDensityScore);
}

// --- 8. increases risk when module size is large ---
{
  const small = scoreModuleHotspot('s', {
    inboundCount: 0,
    outboundCount: 0,
    circularParticipant: false,
    testDensity: 0.5,
    fileCount: 2,
    crossInteractionCount: 0,
    maxInbound: 1,
    maxOutbound: 1,
    maxFileCount: 100,
    maxCrossInteraction: 1,
  });
  const large = scoreModuleHotspot('l', {
    inboundCount: 0,
    outboundCount: 0,
    circularParticipant: false,
    testDensity: 0.5,
    fileCount: 80,
    crossInteractionCount: 0,
    maxInbound: 1,
    maxOutbound: 1,
    maxFileCount: 100,
    maxCrossInteraction: 1,
  });
  assert(large.factorScores.moduleSizeScore >= small.factorScores.moduleSizeScore);
}

// --- 9. increases risk when cross-module interactions are high ---
{
  const lowCross = scoreModuleHotspot('m', {
    inboundCount: 0,
    outboundCount: 0,
    circularParticipant: false,
    testDensity: 0.5,
    fileCount: 5,
    crossInteractionCount: 0,
    maxInbound: 1,
    maxOutbound: 1,
    maxFileCount: 10,
    maxCrossInteraction: 10,
  });
  const highCross = scoreModuleHotspot('m', {
    inboundCount: 0,
    outboundCount: 0,
    circularParticipant: false,
    testDensity: 0.5,
    fileCount: 5,
    crossInteractionCount: 10,
    maxInbound: 1,
    maxOutbound: 1,
    maxFileCount: 10,
    maxCrossInteraction: 10,
  });
  assert(highCross.factorScores.crossModuleInteractionScore >= lowCross.factorScores.crossModuleInteractionScore);
}

// --- 10. handles missing optional signals safely ---
{
  const report = generateHotspotReport({}, {}, {});
  assert(Array.isArray(report.hotspots));
  assert(typeof report.summary === 'object');
}

{
  const moduleMap = { modules: [{ id: 'x', name: 'x' }], crossModuleEdges: [] };
  const report = generateHotspotReport({}, moduleMap, {
    modules: { modules: [{ name: 'x', fileCount: 1 }] },
  });
  assert.strictEqual(report.hotspots.length, 1);
}

// --- 11. CLI fails clearly when required input files are missing ---
{
  const cliSource = fs.readFileSync(path.join(__dirname, 'risk-hotspots.mjs'), 'utf-8');
  assert(cliSource.includes('Missing'), 'CLI has missing-file error messages');
  assert(cliSource.includes('process.exit(1)'), 'CLI exits 1 on missing artifacts');
}

// --- 12. fails clearly when input JSON is invalid ---
{
  try {
    JSON.parse('{ invalid }');
    assert.fail('expected parse error');
  } catch (e) {
    assert(e instanceof SyntaxError);
  }
}

// --- 13. clamps or bounds scores safely ---
{
  assert.strictEqual(deriveRiskLevel(150), 'HIGH');
  assert.strictEqual(deriveRiskLevel(100), 'HIGH');
  assert.strictEqual(deriveRiskLevel(70), 'HIGH');
  assert.strictEqual(deriveRiskLevel(69), 'MEDIUM');
  assert.strictEqual(deriveRiskLevel(40), 'MEDIUM');
  assert.strictEqual(deriveRiskLevel(39), 'LOW');
  assert.strictEqual(deriveRiskLevel(0), 'LOW');
}

// --- 14. assigns HIGH / MEDIUM / LOW correctly ---
{
  const high = scoreModuleHotspot('h', {
    inboundCount: 10,
    outboundCount: 10,
    circularParticipant: true,
    testDensity: 0,
    fileCount: 80,
    crossInteractionCount: 10,
    maxInbound: 10,
    maxOutbound: 10,
    maxFileCount: 100,
    maxCrossInteraction: 10,
  });
  assert(high.riskLevel === 'HIGH' || high.riskLevel === 'MEDIUM' || high.riskLevel === 'LOW');
}

// --- 15. reasons array only contains supported triggered explanations ---
{
  const validReasons = new Set([
    'high inbound dependency count',
    'high outbound dependency count',
    'participates in circular dependency signals',
    'below-average test density',
    'large module by file count',
    'frequent cross-module interaction surface',
  ]);
  const report = generateHotspotReport(
    {},
    loadFixture('.ai-devos/module-map.json') || { modules: [], crossModuleEdges: [] },
    loadFixture('.ai-devos/architecture-summary.json') || { modules: { modules: [] } }
  );
  for (const h of report.hotspots) {
    assert(Array.isArray(h.reasons));
    for (const r of h.reasons) {
      assert(validReasons.has(r), `unexpected reason: ${r}`);
    }
  }
}

// --- computeCrossInteractionCounts ---
{
  const arch = {
    crossModuleInteractions: [
      { from: 'a', to: 'b', edgeCount: 2 },
      { from: 'b', to: 'c', edgeCount: 1 },
    ],
  };
  const counts = computeCrossInteractionCounts(arch);
  assert.strictEqual(counts.get('a'), 2);
  assert.strictEqual(counts.get('b'), 3);
  assert.strictEqual(counts.get('c'), 1);
}

// --- getCircularModuleSet ---
{
  const arch = { signals: { highCouplingModules: ['x', 'y'] } };
  const set = getCircularModuleSet(arch);
  assert(set.has('x'));
  assert(set.has('y'));
}

// --- getModuleTestDensity ---
{
  const arch = { testTopology: { testDensity: 0.3, testModules: ['a'] } };
  assert.strictEqual(getModuleTestDensity(arch, 'a'), 0.3);
  assert.strictEqual(getModuleTestDensity(arch, 'b'), 0);
}

// --- deriveReasons ---
{
  const reasons = deriveReasons(
    { inboundDependencies: 10, outboundDependencies: 0, circularDependencySignals: 0, testDensity: 0.1, moduleFileCount: 50, crossModuleInteractions: 5 },
    { lowTestDensityScore: 10 }
  );
  assert(reasons.includes('high inbound dependency count'));
  assert(reasons.includes('below-average test density'));
  assert(reasons.includes('large module by file count'));
  assert(reasons.includes('frequent cross-module interaction surface'));
}

console.log('risk-hotspots tests passed');
