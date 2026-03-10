import { GateId, GateStatus, GATE_REGISTRY } from './registry';

export type GateState = Record<GateId, GateStatus>;

// Per-gate default statuses; registry drives which gates exist.
const DEFAULT_STATUSES: Partial<Record<GateId, GateStatus>> = {
  gate7: 'PASS',
  gate8: 'PASS',
  gate8_2: 'PASS',
  gate9: 'PASS',
  gate10: 'OPEN',
  gate11: 'OPEN',
};

// In-memory canonical gate state; derived from registry + DEFAULT_STATUSES.
const defaultState: GateState = (Object.keys(GATE_REGISTRY) as GateId[]).reduce(
  (acc, id) => {
    acc[id] = DEFAULT_STATUSES[id] ?? 'LOCKED';
    return acc;
  },
  {} as GateState,
);

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

// Returns a snapshot of the current in-memory gate state.
export function getDefaultGateState(): GateState {
  return { ...defaultState };
}

