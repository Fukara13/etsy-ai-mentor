/**
 * OC-3: Default fs and process adapters for production runtime.
 */

import * as fs from 'fs';
import { spawn } from 'child_process';
import type { FsAdapter } from './refresh-project-understanding';
import type { ProcessRunner } from './run-project-understanding-refresh';

export function createDefaultFsAdapter(): FsAdapter {
  return {
    getStat: (filePath: string) =>
      new Promise((resolve) => {
        fs.stat(filePath, (err, stat) => {
          if (err || !stat) {
            resolve({ exists: false });
            return;
          }
          resolve({
            exists: true,
            mtimeMs: stat.mtimeMs,
          });
        });
      }),
  };
}

export function createDefaultProcessRunner(): ProcessRunner {
  return (params) =>
    new Promise((resolve) => {
      const proc = spawn(params.command, params.args, {
        cwd: params.cwd,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      proc.stdout?.on('data', (c: Buffer) => {
        stdout += c.toString();
      });
      proc.stderr?.on('data', (c: Buffer) => {
        stderr += c.toString();
      });
      proc.on('close', (code, _signal) => {
        resolve({
          exitCode: code ?? -1,
          stdout,
          stderr,
        });
      });
      proc.on('error', () => {
        resolve({ exitCode: -1, stdout, stderr });
      });
    });
}
