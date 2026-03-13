/**
 * GH-7: Normalized PR file change.
 */

import type { PrFileChangeStatus } from './pr-file-change-status';

export interface PrFileChange {
  readonly path: string;
  readonly previousPath?: string;
  readonly status: PrFileChangeStatus;
  readonly additions: number;
  readonly deletions: number;
  readonly changes: number;
}
