/**
 * RE-8: Pure playbook resolver. Deterministic, immutable.
 */

import type { RepairOperatorDecisionSurface } from '../../repair-engine/operator/repair-operator-decision-surface'
import type { OperatorPlaybook } from './operator-playbook'
import type { OperatorPlaybookDecisionType } from './operator-playbook-decision-type'
import type { OperatorPlaybookChecklistItem } from './operator-playbook-checklist-item'

const HEADLINE_TO_DECISION: Record<string, OperatorPlaybookDecisionType> = {
  'Repair strategy recommended': 'strategy_ready',
  'Manual investigation required': 'manual_investigation',
  'Waiting for additional signal': 'insufficient_signal',
  'Escalation to human operator required': 'escalate',
  'Repair item blocked': 'blocked',
}

function resolveDecisionType(headline: string): OperatorPlaybookDecisionType {
  const type = HEADLINE_TO_DECISION[headline]
  if (!type) {
    throw new Error(`Unsupported operator decision surface state: ${headline}`)
  }
  return type
}

function playbookForStrategyReady(): Omit<OperatorPlaybook, 'operatorGuidance'> & {
  operatorGuidance: string[]
} {
  return {
    decisionType: 'strategy_ready',
    headline: 'Strategy ready for operator review',
    summary:
      'The proposed strategy must be reviewed by a human for safety and correctness before any application. No automatic execution occurs.',
    reviewChecklist: [
      { id: '1', label: 'Verify failing signal', description: 'Confirm the failing signal source and validity.', required: true },
      {
        id: '2',
        label: 'Check action consistency',
        description: 'Verify the recommended action aligns with reason codes.',
        required: true,
      },
      {
        id: '3',
        label: 'Review risk and confidence',
        description: 'Evaluate risk level and confidence values.',
        required: true,
      },
      {
        id: '4',
        label: 'Confirm human approval',
        description: 'Ensure human approval is required before application.',
        required: true,
      },
    ],
    riskNotes: [
      'Wrong strategy may worsen the problem.',
      'No automatic execution even with high confidence.',
    ],
    escalationRule: null,
    operatorGuidance: [
      'Read evidence first.',
      'Then evaluate action recommendation.',
      'Finally make human decision.',
    ],
  }
}

function playbookForManualInvestigation(): Omit<OperatorPlaybook, 'operatorGuidance'> & {
  operatorGuidance: string[]
} {
  return {
    decisionType: 'manual_investigation',
    headline: 'Manual investigation required',
    summary:
      'The signal did not produce a directly applicable strategy. Further manual investigation is needed before deciding.',
    reviewChecklist: [
      { id: '1', label: 'Review log/output source', description: 'Inspect the log and output sources.', required: true },
      { id: '2', label: 'Check for missing context', description: 'Identify any missing context.', required: true },
      { id: '3', label: 'Look for failure pattern', description: 'Check for repeated failure patterns.', required: false },
      {
        id: '4',
        label: 'Assess strategy need',
        description: 'Determine if a new strategy is needed after manual analysis.',
        required: true,
      },
    ],
    riskNotes: ['Avoid early decisions with incomplete context.', 'Do not approve based on assumptions.'],
    escalationRule: null,
    operatorGuidance: [
      'Gather failure context first.',
      'Clarify root cause.',
      'Then make new decision.',
    ],
  }
}

function playbookForInsufficientSignal(): Omit<OperatorPlaybook, 'operatorGuidance'> & {
  operatorGuidance: string[]
} {
  return {
    decisionType: 'insufficient_signal',
    headline: 'Insufficient signal for safe decision',
    summary:
      'Current data is insufficient for a safe decision. Wait for more evidence before acting.',
    reviewChecklist: [
      { id: '1', label: 'Check input completeness', description: 'Verify whether input signal is incomplete.', required: true },
      {
        id: '2',
        label: 'Assess telemetry need',
        description: 'Evaluate if more telemetry, logs, or test output is needed.',
        required: true,
      },
      {
        id: '3',
        label: 'Verify minimum evidence',
        description: 'Check if minimum evidence for decision is available.',
        required: true,
      },
    ],
    riskNotes: [
      'Deciding with insufficient data can be misleading.',
      'Do not proceed with repair direction under low visibility.',
    ],
    escalationRule: 'Do not approve action until stronger evidence is available.',
    operatorGuidance: [
      'Do not decide before data is complete.',
      'Increase visibility first.',
      'Then re-evaluate.',
    ],
  }
}

function playbookForEscalate(): Omit<OperatorPlaybook, 'operatorGuidance'> & {
  operatorGuidance: string[]
} {
  return {
    decisionType: 'escalate',
    headline: 'Escalation to human authority recommended',
    summary:
      'Due to risk, uncertainty, or impact scope, direct human authority review is required before proceeding.',
    reviewChecklist: [
      { id: '1', label: 'Review escalation reason codes', description: 'Inspect escalation reason codes.', required: true },
      {
        id: '2',
        label: 'Check risk consistency',
        description: 'Verify risk level aligns with recommended escalation.',
        required: true,
      },
      {
        id: '3',
        label: 'Assess system boundaries',
        description: 'Evaluate if this exceeds system boundaries.',
        required: true,
      },
      {
        id: '4',
        label: 'Confirm human authority',
        description: 'Ensure no progress without human authority.',
        required: true,
      },
    ],
    riskNotes: ['High impact scope may apply.', 'Decisions may be hard to reverse.'],
    escalationRule: 'Escalate before any approval or execution-oriented follow-up.',
    operatorGuidance: [
      'Correctness over speed in this case.',
      'Delegate decision authority to the appropriate human operator.',
    ],
  }
}

function playbookForBlocked(): Omit<OperatorPlaybook, 'operatorGuidance'> & {
  operatorGuidance: string[]
} {
  return {
    decisionType: 'blocked',
    headline: 'Decision path blocked pending human review',
    summary:
      'The system has intentionally halted. Progress requires human review before continuing.',
    reviewChecklist: [
      { id: '1', label: 'Identify block reason', description: 'Check the reason for the block.', required: true },
      { id: '2', label: 'Verify human approval', description: 'Confirm human approval is required.', required: true },
      {
        id: '3',
        label: 'Review block source',
        description: 'Determine if block is due to security, risk, or uncertainty.',
        required: true,
      },
      {
        id: '4',
        label: 'Determine next decision',
        description: 'Identify what additional decision is needed to proceed.',
        required: true,
      },
    ],
    riskNotes: [
      'Block mechanism serves a security purpose.',
      'Flow must not progress until block is lifted.',
    ],
    escalationRule: 'Blocked state must remain until explicit human review is completed.',
    operatorGuidance: [
      'This may be a controlled halt, not an error.',
      'Resolve block reason first, then decide.',
    ],
  }
}

export class OperatorPlaybookResolver {
  resolve(surface: RepairOperatorDecisionSurface): OperatorPlaybook {
    const decisionType = resolveDecisionType(surface.headline)

    let base: Omit<OperatorPlaybook, 'operatorGuidance'> & { operatorGuidance: string[] }
    switch (decisionType) {
      case 'strategy_ready':
        base = playbookForStrategyReady()
        break
      case 'manual_investigation':
        base = playbookForManualInvestigation()
        break
      case 'insufficient_signal':
        base = playbookForInsufficientSignal()
        break
      case 'escalate':
        base = playbookForEscalate()
        break
      case 'blocked':
        base = playbookForBlocked()
        break
      default: {
        const _: never = decisionType
        throw new Error(`Unsupported operator decision surface state: ${decisionType}`)
      }
    }

    const guidance = [...base.operatorGuidance, ...surface.operatorGuidance]
    return {
      ...base,
      operatorGuidance: guidance,
    }
  }
}
