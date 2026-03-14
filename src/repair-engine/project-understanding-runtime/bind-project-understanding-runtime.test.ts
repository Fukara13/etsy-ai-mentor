/**
 * RE-12: Tests for project-understanding runtime binding.
 */

import { describe, it, expect } from 'vitest';
import { bindProjectUnderstandingRuntime } from './bind-project-understanding-runtime';
import { orchestrateRepairEngine } from '../orchestrator';
import { bindGovernanceRuntime } from '../governance-runtime';
import type { RepairEngineOrchestratorInput } from '../orchestrator';
import type { ProjectUnderstandingArtifactBundleCompatible } from './project-understanding-runtime-input';

const emptyBundle: ProjectUnderstandingArtifactBundleCompatible = Object.freeze({
  architectureSummary: null,
  dependencyGraph: null,
  moduleMap: null,
  riskHotspots: null,
});

function makeGovernanceBoundResult() {
  const input: RepairEngineOrchestratorInput = Object.freeze({
    event: Object.freeze({
      type: 'CI_FAILURE',
      source: 'ci',
      subjectId: 'run-1',
      summary: 'CI failed',
      attemptCount: 0,
    }),
  });
  const orch = orchestrateRepairEngine(input);
  return bindGovernanceRuntime(orch);
}

const fullBundle: ProjectUnderstandingArtifactBundleCompatible = Object.freeze({
  architectureSummary: Object.freeze({
    modules: Object.freeze({
      modules: Object.freeze([
        Object.freeze({ name: 'src/repair-engine', role: 'domain' }),
      ]),
    }),
  }),
  dependencyGraph: Object.freeze({
    modules: Object.freeze({
      'src/repair-engine/orchestrator/index.ts': Object.freeze({ internal: ['src/repair-engine/contracts/index.ts'], external: [] }),
    }),
  }),
  moduleMap: Object.freeze({
    modules: Object.freeze([
      Object.freeze({ id: 'src-repair-engine', name: 'src/repair-engine' }),
    ]),
    fileMappings: Object.freeze([
      Object.freeze({ filePath: 'src/repair-engine/orchestrator/index.ts', moduleId: 'src-repair-engine' }),
    ]),
  }),
  riskHotspots: Object.freeze({
    hotspots: Object.freeze([
      Object.freeze({ module: 'src/repair-engine', score: 50, riskLevel: 'MEDIUM' }),
    ]),
  }),
});

describe('RE-12: bindProjectUnderstandingRuntime', () => {
  it('full artifact path produces available status', () => {
    const result = makeGovernanceBoundResult();
    const bound = bindProjectUnderstandingRuntime({
      result,
      changedFiles: ['src/repair-engine/orchestrator/index.ts'],
      artifactBundle: fullBundle,
    });
    expect(bound.projectUnderstanding.artifactStatus).toBe('available');
    expect(bound.projectUnderstanding.moduleName).toBe('src/repair-engine');
    expect(bound.projectUnderstanding.architecturalLayer).toBe('domain');
    expect(bound.projectUnderstanding.moduleHotspotScore).toBe(50);
    expect(bound.projectUnderstanding.moduleRiskLevel).toBe('MEDIUM');
  });

  it('partial artifact path produces partial status', () => {
    const partialBundle: ProjectUnderstandingArtifactBundleCompatible = Object.freeze({
      ...fullBundle,
      riskHotspots: null,
    });
    const result = makeGovernanceBoundResult();
    const bound = bindProjectUnderstandingRuntime({
      result,
      changedFiles: [],
      artifactBundle: partialBundle,
    });
    expect(bound.projectUnderstanding.artifactStatus).toBe('partial');
  });

  it('missing artifact path produces missing status', () => {
    const result = makeGovernanceBoundResult();
    const bound = bindProjectUnderstandingRuntime({
      result,
      changedFiles: [],
      artifactBundle: emptyBundle,
    });
    expect(bound.projectUnderstanding.artifactStatus).toBe('missing');
    expect(bound.projectUnderstanding.moduleName).toBeNull();
    expect(bound.projectUnderstanding.summarySignals).toContain('artifact_status:missing');
  });

  it('deterministic dominant-module selection on tie', () => {
    const tieBundle: ProjectUnderstandingArtifactBundleCompatible = Object.freeze({
      ...emptyBundle,
      moduleMap: Object.freeze({
        modules: Object.freeze([
          Object.freeze({ id: 'mod-a', name: 'mod/a' }),
          Object.freeze({ id: 'mod-b', name: 'mod/b' }),
        ]),
        fileMappings: Object.freeze([
          Object.freeze({ filePath: 'mod/a/foo.ts', moduleId: 'mod-a' }),
          Object.freeze({ filePath: 'mod/b/bar.ts', moduleId: 'mod-b' }),
        ]),
      }),
    });
    const result = makeGovernanceBoundResult();
    const a = bindProjectUnderstandingRuntime({
      result,
      changedFiles: ['mod/a/foo.ts', 'mod/b/bar.ts'],
      artifactBundle: tieBundle,
    });
    const b = bindProjectUnderstandingRuntime({
      result,
      changedFiles: ['mod/b/bar.ts', 'mod/a/foo.ts'],
      artifactBundle: tieBundle,
    });
    expect(a.projectUnderstanding.moduleName).toBe(b.projectUnderstanding.moduleName);
    expect(a.projectUnderstanding.moduleName).toBe('mod/a');
  });

  it('does not mutate input', () => {
    const result = makeGovernanceBoundResult();
    const before = JSON.stringify(result);
    bindProjectUnderstandingRuntime({
      result,
      changedFiles: [],
      artifactBundle: emptyBundle,
    });
    expect(JSON.stringify(result)).toBe(before);
  });
});
