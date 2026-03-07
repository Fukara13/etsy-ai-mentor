/**
 * Gate-S10: Guardian Policy Checks
 * Validates patches before they proceed. Only Jules produces patches; Guardian validates.
 * Blocks: forbidden paths, workflow changes, dependency changes, test-skip edits, oversized diff.
 */

import type { GuardianDecision } from './types';

/** Default forbidden paths (sensitive or high-risk). */
const FORBIDDEN_PATH_PATTERNS = [
  /\.env$/i,
  /\.env\./i,
  /secrets?\//i,
  /\.pem$/i,
  /\.key$/i,
  /config\/prod/i,
];

/** Workflow file patterns. */
const WORKFLOW_PATTERNS = [
  /\.github\/workflows\/.+\.ya?ml$/i,
  /\.github\/workflows\/.+\.yml$/i,
];

/** Dependency file patterns. */
const DEPENDENCY_PATTERNS = [
  /package\.json$/i,
  /package-lock\.json$/i,
  /yarn\.lock$/i,
  /pnpm-lock\.yaml$/i,
  /requirements\.txt$/i,
  /Cargo\.toml$/i,
];

/** Test-skip / bypass style patterns in diff. */
const TEST_SKIP_PATTERNS = [
  /\.skip\s*\(/i,
  /\.only\s*\(/i,
  /it\.skip/i,
  /describe\.skip/i,
  /test\.skip/i,
  /@skip|# skip/i,
  /--skip-tests/i,
  /skip.*test|test.*skip/i,
];

export type GuardianInput = {
  /** Changed file paths (e.g. from patch). */
  paths: readonly string[];
  /** Raw diff text for test-skip detection. */
  diffText?: string;
  /** Optional: max file count (0 = no limit). */
  maxFileCount?: number;
  /** Optional: max diff size in chars (0 = no limit). */
  maxDiffSize?: number;
};

/** Check if any path matches forbidden patterns. */
function checkForbiddenPaths(paths: readonly string[]): string[] {
  const violations: string[] = [];
  for (const p of paths) {
    for (const re of FORBIDDEN_PATH_PATTERNS) {
      if (re.test(p)) {
        violations.push(`Forbidden path: ${p}`);
        break;
      }
    }
  }
  return violations;
}

/** Check if workflow files are changed. */
function checkWorkflowChanges(paths: readonly string[]): string[] {
  const violations: string[] = [];
  for (const p of paths) {
    for (const re of WORKFLOW_PATTERNS) {
      if (re.test(p)) {
        violations.push(`Workflow file change: ${p}`);
        break;
      }
    }
  }
  return violations;
}

/** Check if dependency files are changed. */
function checkDependencyChanges(paths: readonly string[]): string[] {
  const violations: string[] = [];
  for (const p of paths) {
    for (const re of DEPENDENCY_PATTERNS) {
      if (re.test(p)) {
        violations.push(`Dependency file change: ${p}`);
        break;
      }
    }
  }
  return violations;
}

/** Check for test-skip / bypass style edits in diff. */
function checkTestSkipEdits(diffText: string): string[] {
  const violations: string[] = [];
  for (const re of TEST_SKIP_PATTERNS) {
    if (re.test(diffText)) {
      violations.push(`Suspicious test-skip/bypass pattern in diff`);
      break;
    }
  }
  return violations;
}

/** Check oversized diff / excessive file count if limits are set. */
function checkSizeLimits(
  input: GuardianInput,
  violations: string[]
): void {
  if (input.maxFileCount != null && input.maxFileCount > 0) {
    if (input.paths.length > input.maxFileCount) {
      violations.push(
        `Excessive file count: ${input.paths.length} > ${input.maxFileCount}`
      );
    }
  }
  if (
    input.maxDiffSize != null &&
    input.maxDiffSize > 0 &&
    input.diffText != null
  ) {
    if (input.diffText.length > input.maxDiffSize) {
      violations.push(
        `Oversized diff: ${input.diffText.length} > ${input.maxDiffSize}`
      );
    }
  }
}

/** Run all Guardian policy checks. */
export function runGuardian(input: GuardianInput): GuardianDecision {
  const violations: string[] = [];

  violations.push(...checkForbiddenPaths(input.paths));
  violations.push(...checkWorkflowChanges(input.paths));
  violations.push(...checkDependencyChanges(input.paths));
  if (input.diffText) {
    violations.push(...checkTestSkipEdits(input.diffText));
  }
  checkSizeLimits(input, violations);

  return {
    allowed: violations.length === 0,
    reason:
      violations.length > 0
        ? `Guardian blocked: ${violations.join('; ')}`
        : 'Guardian passed',
    violations,
  };
}
