/**
 * OC-3: Tests for runProjectUnderstandingRefresh.
 */

import { describe, it, expect } from 'vitest';
import {
  runProjectUnderstandingRefresh,
  PROJECT_UNDERSTANDING_REFRESH_COMMANDS,
  type ProcessRunner,
} from './run-project-understanding-refresh';

describe('runProjectUnderstandingRefresh', () => {
  it('runs commands in deterministic order', async () => {
    const runOrder: string[] = [];
    const runner: ProcessRunner = async (params) => {
      const script = params.args[1];
      runOrder.push(script);
      return { exitCode: 0, stdout: '', stderr: '' };
    };
    const result = await runProjectUnderstandingRefresh({
      cwd: '/repo',
      artifactPaths: ['/repo/.ai-devos/dep.json'],
      processRunner: runner,
      startedAt: new Date().toISOString(),
      reasonForRefresh: 'missing-artifact',
    });
    expect(result.status).toBe('refreshed');
    expect(runOrder).toEqual([...PROJECT_UNDERSTANDING_REFRESH_COMMANDS]);
    expect(result.commandsRun).toEqual([...PROJECT_UNDERSTANDING_REFRESH_COMMANDS]);
  });

  it('captures stdout and stderr', async () => {
    const runner: ProcessRunner = async () => ({
      exitCode: 0,
      stdout: 'out',
      stderr: 'err',
    });
    const result = await runProjectUnderstandingRefresh({
      cwd: '/repo',
      artifactPaths: [],
      processRunner: runner,
      startedAt: new Date().toISOString(),
      reasonForRefresh: 'force-refresh',
    });
    expect(result.status).toBe('refreshed');
    expect(result.stdout).toBe('out');
    expect(result.stderr).toBe('err');
  });

  it('returns failed when one command exits non-zero', async () => {
    let callCount = 0;
    const runner: ProcessRunner = async () => {
      callCount++;
      return {
        exitCode: callCount === 2 ? 1 : 0,
        stdout: '',
        stderr: 'error',
      };
    };
    const result = await runProjectUnderstandingRefresh({
      cwd: '/repo',
      artifactPaths: ['/repo/.ai-devos/dep.json'],
      processRunner: runner,
      startedAt: new Date().toISOString(),
      reasonForRefresh: 'stale-artifact',
    });
    expect(result.status).toBe('failed');
    expect(result.reason).toBe('refresh-command-failed');
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toBe('error');
    expect(result.commandsRun).toHaveLength(2);
  });

  it('does not continue silently after failure', async () => {
    let invocations = 0;
    const runner: ProcessRunner = async () => {
      invocations++;
      return { exitCode: invocations === 1 ? 1 : 0, stdout: '', stderr: '' };
    };
    const result = await runProjectUnderstandingRefresh({
      cwd: '/repo',
      artifactPaths: [],
      processRunner: runner,
      startedAt: new Date().toISOString(),
      reasonForRefresh: 'event-requires-refresh',
    });
    expect(result.status).toBe('failed');
    expect(invocations).toBe(1);
  });
});
