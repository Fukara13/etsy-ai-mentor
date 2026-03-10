export type AppErrorCode = 'GATE_BLOCKED' | 'NOT_FOUND' | string

export interface AppError {
  code: AppErrorCode
  message: string
  // Optional machine-readable details for logging / UI
  details?: unknown
}

export class GateBlockedError extends Error implements AppError {
  code: AppErrorCode = 'GATE_BLOCKED'
  details?: unknown

  constructor(message = 'Operation blocked by gate', details?: unknown) {
    super(message)
    this.name = 'GateBlockedError'
    this.details = details
  }
}

export class NotFoundError extends Error implements AppError {
  code: AppErrorCode = 'NOT_FOUND'
  details?: unknown

  constructor(message = 'Resource not found', details?: unknown) {
    super(message)
    this.name = 'NotFoundError'
    this.details = details
  }
}

// Minimal gate state representation for the application layer.
export type GateStatus = 'LOCKED' | 'OPEN' | 'PASS'

export type GateState = Record<string, GateStatus>

