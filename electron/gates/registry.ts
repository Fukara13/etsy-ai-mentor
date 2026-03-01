export type GateId = 'gate7' | 'gate8' | 'gate8_2' | 'gate9' | 'gate10' | 'gate11' | 'gate12';

export type GateStatus = 'LOCKED' | 'OPEN' | 'PASS';

export type GateDef = {
  id: GateId;
  title: string;
  description: string;
  deps?: GateId[]; // dependencies (bağımlılıklar)
};

export const GATE_REGISTRY: Record<GateId, GateDef> = {
  gate7: {
    id: 'gate7',
    title: 'Gate 7',
    description: 'Neutral listing recognition + back navigation.',
  },
  gate8: {
    id: 'gate8',
    title: 'Gate 8',
    description: 'Git security setup.',
  },
  gate8_2: {
    id: 'gate8_2',
    title: 'Gate 8.2',
    description: 'Stop tracking dist-electron + ignore.',
    deps: ['gate8'],
  },
  gate9: {
    id: 'gate9',
    title: 'Gate 9',
    description: 'Repo hygiene + ignore + line endings.',
    deps: ['gate8_2'],
  },
  gate10: {
    id: 'gate10',
    title: 'Gate 10',
    description: 'Gate motor enforcement (state-driven).',
    deps: ['gate9'],
  },
  gate11: {
    id: 'gate11',
    title: 'Persistence',
    description: 'Gate state persistence.',
    deps: ['gate10'],
  },
  gate12: {
    id: 'gate12',
    title: 'Listing Builder MVP',
    description: 'Manual listing content construction and management.',
    deps: ['gate11'],
  },
};

asd
