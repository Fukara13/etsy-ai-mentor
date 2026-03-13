/**
 * GH-1: Deterministic risk classification for repair actions.
 * Pure function, no I/O, no mutation.
 */

import type { RiskLevel } from './risk-level';
import type { RiskClassification } from './risk-classification';

export interface RepairActionContext {
  readonly actionType: string;
  readonly targetPath: string;
  readonly isProduction: boolean;
  readonly touchesCoreEngine: boolean;
  readonly touchesSecrets: boolean;
  readonly isDestructive: boolean;
  readonly requiresNetwork: boolean;
  readonly description: string;
}

const ACTION_LOW = ['test', 'documentation', 'format'] as const;
const ACTION_MEDIUM = ['dependency', 'refactor', 'build'] as const;

function matchesAction(context: RepairActionContext, list: readonly string[]): boolean {
  const t = context.actionType.toLowerCase().trim();
  return list.some((a) => t === a);
}

function createClassification(
  level: RiskLevel,
  reason: string,
  requiresHumanApproval: boolean
): RiskClassification {
  return Object.freeze({
    level,
    requiresHumanApproval,
    reason,
  });
}

/**
 * Classifies risk for a proposed repair action.
 * Deterministic, pure, side-effect free.
 */
export function classifyRisk(context: RepairActionContext): RiskClassification {
  if (context.touchesSecrets) {
    return createClassification(
      'CRITICAL',
      'Access to secrets requires human approval',
      true
    );
  }
  if (context.isDestructive) {
    return createClassification(
      'CRITICAL',
      'Destructive repository actions require human approval',
      true
    );
  }
  if (context.isProduction) {
    return createClassification(
      'CRITICAL',
      'Production environment mutations require human approval',
      true
    );
  }
  if (context.touchesCoreEngine) {
    return createClassification(
      'HIGH',
      'Changes to core engine require human approval',
      true
    );
  }
  if (matchesAction(context, ACTION_MEDIUM)) {
    return createClassification(
      'MEDIUM',
      'Non-trivial change requires human review',
      true
    );
  }
  if (matchesAction(context, ACTION_LOW)) {
    return createClassification(
      'LOW',
      'Low-risk change; automated approval allowed',
      false
    );
  }

  return createClassification(
    'MEDIUM',
    'Unknown action type; conservative classification',
    true
  );
}
