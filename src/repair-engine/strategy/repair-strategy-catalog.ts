/**
 * RE-3: Deterministic in-memory catalog of repair strategies.
 */

import type { RepairStrategy } from '../contracts/repair-strategy'

const STRATEGY_TEST_FIX: RepairStrategy = {
  id: 'strategy_test_fix',
  type: 'test_fix',
  title: 'Test repair strategy',
  description: 'Focus on isolating and fixing failing tests.',
  rationale:
    'CI failures often stem from test failures. Validate test output, fix assertions or test setup, then rerun.',
  suggestedActions: [
    'Inspect failing test output',
    'Verify test setup and fixtures',
    'Fix assertions or mock expectations',
    'Rerun tests after changes',
  ],
  applicableEventTypes: ['CI_FAILURE'],
  needsHumanReview: true,
  blockedByHumanApproval: true,
}

const STRATEGY_DEPENDENCY_FIX: RepairStrategy = {
  id: 'strategy_dependency_fix',
  type: 'dependency_fix',
  title: 'Dependency repair strategy',
  description: 'Address dependency-related CI or build failures.',
  rationale:
    'CI failures may be caused by version mismatch, lockfile drift, or peer dependency issues.',
  suggestedActions: [
    'Verify package.json and lockfile consistency',
    'Check for version drift between local and CI',
    'Review recent dependency changes',
    'Run clean install in isolated environment',
  ],
  applicableEventTypes: ['CI_FAILURE'],
  needsHumanReview: true,
  blockedByHumanApproval: true,
}

const STRATEGY_CONFIGURATION_FIX: RepairStrategy = {
  id: 'strategy_configuration_fix',
  type: 'configuration_fix',
  title: 'Configuration review strategy',
  description: 'Review configuration changes introduced in the PR.',
  rationale: 'PR updates may alter config. Validate changes before merge.',
  suggestedActions: [
    'Review configuration file changes',
    'Verify environment variable usage',
    'Check for sensitive or unsafe config',
    'Validate config syntax and semantics',
  ],
  applicableEventTypes: ['PR_UPDATED'],
  needsHumanReview: true,
  blockedByHumanApproval: true,
}

const STRATEGY_MANUAL_INVESTIGATION: RepairStrategy = {
  id: 'strategy_manual_investigation',
  type: 'manual_investigation',
  title: 'Manual investigation strategy',
  description: 'Human-driven analysis and decision path.',
  rationale:
    'Manual analysis requested. Gather context, identify root cause, and propose a safe repair plan before acting.',
  suggestedActions: [
    'Gather failure context and logs',
    'Identify probable root cause area',
    'Propose minimal repair plan',
    'Request human approval before any changes',
  ],
  applicableEventTypes: ['MANUAL_ANALYSIS_REQUESTED'],
  needsHumanReview: true,
  blockedByHumanApproval: true,
}

/** Catalog entries. Readonly. */
export const REPAIR_STRATEGY_CATALOG: readonly RepairStrategy[] = [
  STRATEGY_TEST_FIX,
  STRATEGY_DEPENDENCY_FIX,
  STRATEGY_CONFIGURATION_FIX,
  STRATEGY_MANUAL_INVESTIGATION,
]

export { STRATEGY_TEST_FIX, STRATEGY_DEPENDENCY_FIX, STRATEGY_CONFIGURATION_FIX, STRATEGY_MANUAL_INVESTIGATION }
