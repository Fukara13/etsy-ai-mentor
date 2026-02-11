import { GateId, GateStatus, GATE_REGISTRY } from './registry';

export type GateState = Record<GateId, GateStatus>;

const defaultState: GateState = {
  gate7: 'PASS',
  gate8: 'PASS',
  gate8_2: 'PASS',
  gate9: 'PASS',
  gate10: 'OPEN',
};

export function canOpen(gate: GateId, state: GateState): boolean {
  const deps = GATE_REGISTRY[gate].deps ?? [];
  return deps.every((d) => state[d] === 'PASS');
}

export function setStatus(state: GateState, gate: GateId, status: GateStatus): GateState {
  return { ...state, [gate]: status };
}

export function getStatus(state: GateState, gate: GateId): GateStatus {
  return state[gate];
}

export function getDefaultGateState(): GateState {
  return { ...defaultState };
}
