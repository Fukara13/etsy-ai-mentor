import type { GateState, GateStatus } from '../types'
import { GateBlockedError } from '../types'

type GateServiceDeps = {
  // Returns the current effective gate state snapshot used for IPC enforcement
  getCurrentGateState: () => GateState
  // TODO: In future, persist updates via dedicated persistence module
  setGateState?: (next: GateState) => void
}

export class GateService {
  constructor(private readonly deps: GateServiceDeps) {}

  async getGateState(): Promise<GateState> {
    return this.deps.getCurrentGateState()
  }

  async requireGate(gateId: string): Promise<void> {
    const state = this.deps.getCurrentGateState()
    const status = state[gateId]
    if (status !== 'OPEN' && status !== 'PASS') {
      throw new GateBlockedError(`Gate ${gateId} is not OPEN/PASS`, { gateId, status })
    }
  }

  async setGateStatus(gateId: string, status: GateStatus): Promise<void> {
    const state = this.deps.getCurrentGateState()
    const next: GateState = { ...state, [gateId]: status }
    if (this.deps.setGateState) {
      this.deps.setGateState(next)
    }
    // If no setter is wired yet, this is effectively a no-op but keeps API stable
  }
}

