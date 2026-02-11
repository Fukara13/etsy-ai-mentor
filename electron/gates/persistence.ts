import { GateId, GateStatus, GATE_REGISTRY } from './registry';
import { GateState, getDefaultGateState } from './store';
import { getSetting, setSetting } from '../db';

const SETTINGS_KEY = 'gates.state.v1';

type PersistedGateState = {
  version: 1;
  updatedAt: string;
  states: Partial<Record<GateId, GateStatus>>;
};

function sanitizeStates(input: unknown): Partial<Record<GateId, GateStatus>> {
  const out: Partial<Record<GateId, GateStatus>> = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (!(k in GATE_REGISTRY)) continue;
    if (v === 'LOCKED' || v === 'OPEN' || v === 'PASS') {
      out[k as GateId] = v;
    }
  }
  return out;
}

function parsePersisted(raw: string | undefined): PersistedGateState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PersistedGateState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      !parsed.states ||
      typeof parsed.states !== 'object'
    ) {
      console.warn('[gates] invalid persisted gate state shape; using defaults');
      return null;
    }
    return parsed;
  } catch {
    console.warn('[gates] failed to parse persisted gate state; using defaults');
    return null;
  }
}

function applyDevSeed(base: GateState): GateState {
  if (process.env.NODE_ENV === 'production') return base;
  const seed = process.env.GATE_DEV_SEED;
  if (!seed) return base;

  const overrides: Partial<Record<GateId, GateStatus>> = {};
  const tokens = seed.split(/[;,]/).map((s) => s.trim()).filter(Boolean);
  for (const token of tokens) {
    const parts = token.split('=');
    if (parts.length !== 2) continue;
    const rawKey = parts[0];
    const rawVal = parts[1];
    if (!rawKey || !rawVal) continue;
    const key = rawKey.trim();
    const val = rawVal.trim().toUpperCase();
    if (!(key in GATE_REGISTRY)) continue;
    if (val === 'LOCKED' || val === 'OPEN' || val === 'PASS') {
      overrides[key as GateId] = val as GateStatus;
    }
  }
  if (Object.keys(overrides).length === 0) return base;
  const next: GateState = { ...base, ...overrides };
  console.log('[gates] applying dev seed to gate state:', overrides);
  // persist seed-applied state immediately for dev convenience
  saveGateState(next);
  return next;
}

export function loadGateState(): GateState {
  const raw = getSetting(SETTINGS_KEY);
  const persisted = parsePersisted(raw);
  let base = getDefaultGateState();
  if (persisted) {
    const sanitized = sanitizeStates(persisted.states);
    base = { ...base, ...sanitized };
    console.log('[gates] loaded persisted gate state:', sanitized);
  } else {
    console.log('[gates] no valid persisted gate state, using defaults');
  }
  // Apply optional dev seed (non-production only)
  base = applyDevSeed(base);
  return base;
}

export function saveGateState(state: GateState): void {
  const payload: PersistedGateState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    states: state,
  };
  setSetting(SETTINGS_KEY, JSON.stringify(payload));
}

