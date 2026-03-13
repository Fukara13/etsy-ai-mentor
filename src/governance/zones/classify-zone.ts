/**
 * GH-2: Deterministic zone classifier (SAFE / RESTRICTED / RED).
 * Pure, no I/O, no mutation.
 */

import type { RepairActionContext } from '../risk';
import type { ZoneLevel } from './zone-level';
import type { ZoneClassification } from './zone-classification';

const ACTION_SAFE = ['test', 'documentation', 'format'] as const;
const ACTION_RESTRICTED = ['dependency', 'refactor', 'build'] as const;

function matchesAction(context: RepairActionContext, list: readonly string[]): boolean {
  const t = context.actionType.toLowerCase().trim();
  return list.some((a) => t === a);
}

function createClassification(
  zone: ZoneLevel,
  reason: string
): ZoneClassification {
  const isSafe = zone === 'SAFE';
  const isRed = zone === 'RED';
  return Object.freeze({
    zone,
    allowsAiExecution: isSafe,
    requiresHumanApproval: !isSafe,
    requiresEscalation: isRed,
    reason,
  });
}

/**
 * Classifies context into governance zone.
 * Priority: RED > RESTRICTED > SAFE.
 */
export function classifyZone(context: RepairActionContext): ZoneClassification {
  if (context.touchesSecrets) {
    return createClassification('RED', 'Access to secrets is RED zone');
  }
  if (context.isDestructive) {
    return createClassification('RED', 'Destructive actions are RED zone');
  }
  if (context.isProduction) {
    return createClassification('RED', 'Production environment is RED zone');
  }
  if (context.touchesCoreEngine) {
    return createClassification('RESTRICTED', 'Core engine changes require human approval');
  }
  if (matchesAction(context, ACTION_RESTRICTED)) {
    return createClassification('RESTRICTED', 'Non-trivial change requires human review');
  }
  if (matchesAction(context, ACTION_SAFE)) {
    return createClassification('SAFE', 'Low-risk change; AI execution allowed');
  }

  return createClassification('RESTRICTED', 'Unknown action type; conservative classification');
}
