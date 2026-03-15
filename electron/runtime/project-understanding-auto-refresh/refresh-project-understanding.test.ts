/**
 * OC-3: Tests for refreshProjectUnderstanding orchestration.
 */

import * as path from 'path';
import { describe, it, expect, vi } from 'vitest';
import { refreshProjectUnderstanding } from './refresh-project-understanding';
import type { FsAdapter } from './refresh-project-understanding';
import type { ProcessRunner } from './run-project-understanding-refresh';

describe('refreshProjectUnderstanding', () => {
  const cwd = path.sep === '/' ? '/repo' : 'C:\\repo';
  const artifactPaths = [
    path.join(cwd, '.ai-devos', 'dependency-graph.json'),
    path.join(cwd, '.ai-devos', 'module-map.json'),
    path.join(cwd, '.ai-devos', 'architecture-summary.json'),
    path.join(cwd, '.ai-devos', 'hotspot-report.json'),
  ];

  it('skips when artifacts are fresh', async () => {
    const nowMs = Date.now();
    const fsAdapter: FsAdapter = {
      getStat: vi.fn().mockResolvedValue({ exists: true, mtimeMs: nowMs - 100 }),
    };
    const processRunner: ProcessRunner = vi.fn();
    const result = await refreshProjectUnderstanding({
      cwd,
      freshnessWindowMs: 60000,
      fsAdapter,
      processRunner,
    });
    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('fresh-enough');
    expect(result.commandsRun).toEqual([]);
    expect(processRunner).not.toHaveBeenCalled();
  });

  it('refreshes when decision says refresh', async () => {
    const fsAdapter: FsAdapter = {
      getStat: vi.fn().mockResolvedValue({ exists: false }),
    };
    const processRunner: ProcessRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    const result = await refreshProjectUnderstanding({
      cwd,
      freshnessWindowMs: 60000,
      fsAdapter,
      processRunner,
    });
    expect(result.status).toBe('refreshed');
    expect(result.reason).toBe('missing-artifact');
    expect(result.artifactPaths).toEqual(artifactPaths);
    expect(result.commandsRun.length).toBeGreaterThan(0);
    expect(processRunner).toHaveBeenCalled();
  });

  it('returns failed when runner fails', async () => {
    const fsAdapter: FsAdapter = {
      getStat: vi.fn().mockResolvedValue({ exists: false }),
    };
    const processRunner: ProcessRunner = vi.fn().mockResolvedValue({
      exitCode: 1,
      stdout: '',
      stderr: 'npm err',
    });
    const result = await refreshProjectUnderstanding({
      cwd,
      freshnessWindowMs: 60000,
      fsAdapter,
      processRunner,
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toBe('refresh-command-failed');
    expect(result.artifactPaths).toEqual(artifactPaths);
  });

  it('passes through artifact paths and command list', async () => {
    const fsAdapter: FsAdapter = {
      getStat: vi.fn().mockResolvedValue({ exists: true, mtimeMs: 0 }),
    };
    const processRunner: ProcessRunner = vi.fn().mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
    const result = await refreshProjectUnderstanding({
      cwd,
      freshnessWindowMs: 1,
      fsAdapter,
      processRunner,
    });
    expect(result.status).toBe('refreshed');
    expect(result.artifactPaths).toEqual(artifactPaths);
    expect(result.commandsRun).toContain('project:dependency-graph');
    expect(result.commandsRun).toContain('ai-devos:risk-hotspots');
  });
});
