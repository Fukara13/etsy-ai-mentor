import type { RepairRun } from './repair-run';
import type { RepairRunStatus } from './repair-run-status';

export type RepairRunLifecyclePhase =
  | 'not_started'
  | 'active'
  | 'completed'
  | 'escalated'
  | 'aborted';

export interface RepairRunLifecycleState {
  readonly phase: RepairRunLifecyclePhase;
  readonly isStarted: boolean;
  readonly isActive: boolean;
  readonly isCompleted: boolean;
  readonly isEscalated: boolean;
  readonly isAborted: boolean;
}

function derivePhase(status: RepairRunStatus, hasStarted: boolean): RepairRunLifecyclePhase {
  switch (status) {
    case 'running':
      return 'active';
    case 'completed':
      return 'completed';
    case 'escalated':
      return 'escalated';
    case 'aborted':
      return 'aborted';
    default:
      return hasStarted ? 'active' : 'not_started';
  }
}

export function deriveRepairRunLifecycleState(run: RepairRun): RepairRunLifecycleState {
  const hasStarted = run.startedAt.trim().length > 0;
  const phase = derivePhase(run.status, hasStarted);

  const isCompleted = phase === 'completed';
  const isEscalated = phase === 'escalated';
  const isAborted = phase === 'aborted';
  const isActive = phase === 'active';

  return {
    phase,
    isStarted: hasStarted,
    isActive,
    isCompleted,
    isEscalated,
    isAborted,
  };
}

