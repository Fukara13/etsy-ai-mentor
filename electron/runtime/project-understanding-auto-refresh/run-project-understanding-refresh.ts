/**
 * OC-3: CLI runner for project-understanding scripts. Fails closed on non-zero exit.
 */

import type {
  ProjectUnderstandingRefreshResult,
  ProjectUnderstandingRefreshReason,
} from './project-understanding-refresh-result';

export const PROJECT_UNDERSTANDING_REFRESH_COMMANDS = [
  'project:dependency-graph',
  'project:module-mapping',
  'ai-devos:architecture-summary',
  'ai-devos:risk-hotspots',
] as const;

export type ProcessRunner = (params: {
  command: string;
  args: string[];
  cwd: string;
}) => Promise<{ exitCode: number; stdout: string; stderr: string }>;

function runNpmScript(
  scriptName: string,
  cwd: string,
  runner: ProcessRunner
): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return runner({
    command: 'npm',
    args: ['run', scriptName],
    cwd,
  });
}

/**
 * Runs the required project-understanding commands in order.
 * Stops on first non-zero exit and returns failed result.
 */
export async function runProjectUnderstandingRefresh(params: {
  cwd: string;
  artifactPaths: string[];
  processRunner: ProcessRunner;
  startedAt: string;
  reasonForRefresh: ProjectUnderstandingRefreshReason;
}): Promise<ProjectUnderstandingRefreshResult> {
  const { cwd, artifactPaths, processRunner, startedAt, reasonForRefresh } = params;
  const commandsRun: string[] = [];
  let lastExitCode = 0;
  let lastStdout = '';
  let lastStderr = '';

  for (const script of PROJECT_UNDERSTANDING_REFRESH_COMMANDS) {
    const result = await runNpmScript(script, cwd, processRunner);
    commandsRun.push(script);
    lastExitCode = result.exitCode;
    lastStdout = result.stdout;
    lastStderr = result.stderr;
    if (result.exitCode !== 0) {
      const finishedAt = new Date().toISOString();
      const started = new Date(startedAt).getTime();
      const finished = new Date(finishedAt).getTime();
      return {
        status: 'failed',
        reason: 'refresh-command-failed',
        artifactPaths: [...artifactPaths],
        commandsRun: [...commandsRun],
        startedAt: params.startedAt,
        finishedAt,
        durationMs: finished - started,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
      };
    }
  }

  const finishedAt = new Date().toISOString();
  const started = new Date(startedAt).getTime();
  const finished = new Date(finishedAt).getTime();
  return {
    status: 'refreshed',
    reason: reasonForRefresh,
    artifactPaths: [...artifactPaths],
    commandsRun: [...commandsRun],
    startedAt: params.startedAt,
    finishedAt,
    durationMs: finished - started,
    exitCode: lastExitCode,
    stdout: lastStdout,
    stderr: lastStderr,
  };
}
