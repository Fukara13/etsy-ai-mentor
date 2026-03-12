import { describe, it, expect } from 'vitest';

import {
  buildEventLogEntry,
  buildEventLog,
  appendEventLogEntry,
} from './event-log-builder';
import type { EventLogEntryInput } from './event-log-entry-input';
import type { EventLog } from './event-log';

const MINIMAL_INPUT: EventLogEntryInput = {
  entityType: 'repair_run',
  entityId: 'run-1',
  eventType: 'created',
  reasonCode: 'strategy_selected',
  phase: 'received',
  status: 'pending',
  sequence: 0,
};

describe('buildEventLogEntry', () => {
  it('builds a single immutable entry from minimal valid input', () => {
    const entry = buildEventLogEntry(MINIMAL_INPUT);

    expect(entry.entityType).toBe('repair_run');
    expect(entry.entityId).toBe('run-1');
    expect(entry.eventType).toBe('created');
    expect(entry.reasonCode).toBe('strategy_selected');
    expect(entry.phase).toBe('received');
    expect(entry.status).toBe('pending');
    expect(entry.sequence).toBe(0);
    expect(Object.isFrozen(entry)).toBe(true);
  });

  it('defaults payload and metadata to empty objects', () => {
    const entry = buildEventLogEntry(MINIMAL_INPUT);

    expect(entry.payload).toEqual({});
    expect(entry.metadata).toEqual({});
    expect(Object.isFrozen(entry.payload)).toBe(true);
    expect(Object.isFrozen(entry.metadata)).toBe(true);
  });

  it('deeply freezes nested payload and metadata', () => {
    const input: EventLogEntryInput = {
      ...MINIMAL_INPUT,
      payload: { nested: { key: 'value' } },
      metadata: { arr: [1, 2] },
    };

    const entry = buildEventLogEntry(input);

    expect(Object.isFrozen(entry.payload)).toBe(true);
    expect(Object.isFrozen((entry.payload as { nested: { key: string } }).nested)).toBe(true);
    expect(Object.isFrozen(entry.metadata)).toBe(true);
    expect(Object.isFrozen((entry.metadata as { arr: number[] }).arr)).toBe(true);
  });

  it('rejects blank entityId', () => {
    expect(() =>
      buildEventLogEntry({ ...MINIMAL_INPUT, entityId: '   ' })
    ).toThrow('EventLogEntry requires non-empty entityId.');
  });

  it('rejects blank reasonCode', () => {
    expect(() =>
      buildEventLogEntry({ ...MINIMAL_INPUT, reasonCode: '\t' })
    ).toThrow('EventLogEntry requires non-empty reasonCode.');
  });

  it('rejects blank phase', () => {
    expect(() =>
      buildEventLogEntry({ ...MINIMAL_INPUT, phase: '' })
    ).toThrow('EventLogEntry requires non-empty phase.');
  });

  it('rejects blank status', () => {
    expect(() =>
      buildEventLogEntry({ ...MINIMAL_INPUT, status: '  ' })
    ).toThrow('EventLogEntry requires non-empty status.');
  });

  it('rejects negative sequence', () => {
    expect(() =>
      buildEventLogEntry({ ...MINIMAL_INPUT, sequence: -1 })
    ).toThrow('EventLogEntry requires non-negative sequence.');
  });

  it('rejects non-integer sequence', () => {
    expect(() =>
      buildEventLogEntry({ ...MINIMAL_INPUT, sequence: 1.5 })
    ).toThrow('EventLogEntry requires integer sequence.');
  });

  it('does not mutate input payload object', () => {
    const payload = { key: 'original', nested: { x: 1 } };
    const input: EventLogEntryInput = {
      ...MINIMAL_INPUT,
      payload,
    };

    buildEventLogEntry(input);

    expect(payload).toEqual({ key: 'original', nested: { x: 1 } });
    expect((payload.nested as { x: number }).x).toBe(1);
  });
});

describe('buildEventLog', () => {
  it('preserves exact order', () => {
    const inputs: EventLogEntryInput[] = [
      { ...MINIMAL_INPUT, sequence: 0, entityId: 'a' },
      { ...MINIMAL_INPUT, sequence: 1, entityId: 'b' },
      { ...MINIMAL_INPUT, sequence: 2, entityId: 'c' },
    ];

    const log = buildEventLog(inputs);

    expect(log.entries).toHaveLength(3);
    expect(log.entries[0].entityId).toBe('a');
    expect(log.entries[1].entityId).toBe('b');
    expect(log.entries[2].entityId).toBe('c');
  });

  it('returns immutable entries array and immutable log', () => {
    const log = buildEventLog([MINIMAL_INPUT]);

    expect(Object.isFrozen(log)).toBe(true);
    expect(Object.isFrozen(log.entries)).toBe(true);
  });
});

describe('appendEventLogEntry', () => {
  it('appends without mutating original log', () => {
    const log = buildEventLog([MINIMAL_INPUT]);
    const snapshot = JSON.parse(JSON.stringify(log));

    const extended = appendEventLogEntry(log, {
      ...MINIMAL_INPUT,
      sequence: 1,
      entityId: 'run-2',
    });

    expect(log).toEqual(snapshot);
    expect(log.entries).toHaveLength(1);
    expect(extended.entries).toHaveLength(2);
    expect(extended.entries[1].entityId).toBe('run-2');
  });

  it('preserves previous entries unchanged', () => {
    const firstInput: EventLogEntryInput = {
      ...MINIMAL_INPUT,
      sequence: 0,
      entityId: 'run-1',
    };
    const log = buildEventLog([firstInput]);
    const firstEntry = log.entries[0];

    const extended = appendEventLogEntry(log, {
      ...MINIMAL_INPUT,
      sequence: 1,
      entityId: 'run-2',
    });

    expect(extended.entries[0]).toBe(firstEntry);
    expect(extended.entries[0].entityId).toBe('run-1');
  });
});
