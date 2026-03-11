export type ExecutionPhase =
  | 'received'
  | 'analyzing'
  | 'planning'
  | 'awaiting_operator'
  | 'executing'
  | 'completed'
  | 'escalated'
  | 'aborted';

