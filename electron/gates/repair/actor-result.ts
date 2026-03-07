/**
 * Gate-S22: Normalized actor result.
 */

import type { RepairEvent } from './repair-event';
import type { ActorName } from './actor-runtime.types';
import type { ActorRawOutput } from './actor-runtime.types';

export type NormalizedActorResult = {
  readonly actor: ActorName;
  readonly status: 'ok' | 'blocked' | 'requires_human';
  readonly recommendedEvent?: RepairEvent;
  readonly reason: string;
  readonly blocked: boolean;
  readonly requiresHuman: boolean;
  readonly terminal: boolean;
  readonly retryIntent?: boolean;
};

export function normalizeActorResult(raw: ActorRawOutput): NormalizedActorResult {
  const blocked = raw.blocked ?? false;
  const requiresHuman = raw.requiresHuman ?? false;
  const terminal = raw.terminal ?? false;
  const event = raw.event as RepairEvent | undefined;

  let status: 'ok' | 'blocked' | 'requires_human' = 'ok';
  if (blocked) status = 'blocked';
  else if (requiresHuman || terminal) status = 'requires_human';

  return {
    actor: raw.actor,
    status,
    recommendedEvent: event,
    reason: raw.reason ?? '',
    blocked,
    requiresHuman,
    terminal,
    retryIntent: raw.ok,
  };
}
