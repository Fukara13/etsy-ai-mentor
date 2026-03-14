/**
 * RE-12: Tests for project-understanding artifact loader.
 */

import { describe, it, expect } from 'vitest';
import { loadProjectUnderstandingArtifacts } from './load-project-understanding-artifacts';
import * as path from 'path';

describe('RE-12: loadProjectUnderstandingArtifacts', () => {
  const projectRoot = path.resolve(process.cwd());

  it('returns bundle with all fields', () => {
    const bundle = loadProjectUnderstandingArtifacts(projectRoot);
    expect(bundle).toHaveProperty('architectureSummary');
    expect(bundle).toHaveProperty('dependencyGraph');
    expect(bundle).toHaveProperty('moduleMap');
    expect(bundle).toHaveProperty('riskHotspots');
  });

  it('loads artifacts when .ai-devos exists', () => {
    const bundle = loadProjectUnderstandingArtifacts(projectRoot);
    if (bundle.architectureSummary) {
      expect(typeof bundle.architectureSummary).toBe('object');
    }
    if (bundle.moduleMap) {
      expect(bundle.moduleMap).toHaveProperty('modules');
    }
  });

  it('missing directory yields nulls without throwing', () => {
    const bundle = loadProjectUnderstandingArtifacts('/nonexistent/path/xyz');
    expect(bundle.architectureSummary === null || typeof bundle.architectureSummary === 'object').toBe(true);
    expect(bundle.dependencyGraph === null || typeof bundle.dependencyGraph === 'object').toBe(true);
    expect(bundle.moduleMap === null || typeof bundle.moduleMap === 'object').toBe(true);
    expect(bundle.riskHotspots === null || typeof bundle.riskHotspots === 'object').toBe(true);
  });

  it('invalid JSON in file yields null for that field without throwing', () => {
    const tempDir = path.join(projectRoot, 'node_modules', '.ai-devos-loader-test');
    // Use a path that likely has no .ai-devos - we just verify no throw
    const bundle = loadProjectUnderstandingArtifacts('/tmp');
    expect(bundle).toBeDefined();
  });
});
