/**
 * GH-7: PR file change status types.
 */

export type PrFileChangeStatus =
  | 'added'
  | 'modified'
  | 'removed'
  | 'renamed'
  | 'copied'
  | 'changed'
  | 'unknown';

export const PR_FILE_CHANGE_STATUSES: readonly PrFileChangeStatus[] = [
  'added',
  'modified',
  'removed',
  'renamed',
  'copied',
  'changed',
  'unknown',
] as const;
