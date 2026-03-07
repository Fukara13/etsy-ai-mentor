/**
 * Gate-S20: Safety policy constants.
 */

export const ALLOWED_ACTIONS = new Set([
  'retry_ci',
  'request_human_intervention',
  'noop',
] as const);

export const FORBIDDEN_ACTIONS = new Set([
  'apply_patch',
  'modify_workflow',
  'repo_write',
  'force_push',
  'merge_pr',
  'delete_artifact',
] as const);

export const TERMINAL_STATES = new Set(['EXHAUSTED', 'HUMAN'] as const);

export const DEFAULT_MAX_RETRIES = 3;

export function isTerminalState(state: string): boolean {
  return TERMINAL_STATES.has(state as 'EXHAUSTED' | 'HUMAN');
}

export function isForbiddenAction(action: string): boolean {
  return (FORBIDDEN_ACTIONS as Set<string>).has(action);
}

export function isAllowedAction(action: string): boolean {
  return (ALLOWED_ACTIONS as Set<string>).has(action);
}
