/**
 * OC-3: Tests for shouldRefreshProjectUnderstanding.
 */

import { describe, it, expect } from 'vitest';
import { shouldRefreshProjectUnderstanding } from './should-refresh-project-understanding';

const nowMs = 10000;
const windowMs = 5000;
const artifactPaths = ['/repo/.ai-devos/dep.json', '/repo/.ai-devos/mod.json'];

describe('shouldRefreshProjectUnderstanding', () => {
  it('returns force-refresh when forceRefresh=true', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs - 1000 },
        { path: artifactPaths[1], exists: true, mtimeMs: nowMs - 1000 },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
      forceRefresh: true,
    });
    expect(out.shouldRefresh).toBe(true);
    expect(out.reason).toBe('force-refresh');
  });

  it('returns missing-artifact when any artifact missing', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs },
        { path: artifactPaths[1], exists: false },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
    });
    expect(out.shouldRefresh).toBe(true);
    expect(out.reason).toBe('missing-artifact');
  });

  it('returns stale-artifact when artifact older than freshness window', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs - windowMs - 1 },
        { path: artifactPaths[1], exists: true, mtimeMs: nowMs },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
    });
    expect(out.shouldRefresh).toBe(true);
    expect(out.reason).toBe('stale-artifact');
  });

  it('returns event-requires-refresh for push', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs - 1 },
        { path: artifactPaths[1], exists: true, mtimeMs: nowMs - 1 },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
      eventCategory: 'PUSH',
    });
    expect(out.shouldRefresh).toBe(true);
    expect(out.reason).toBe('event-requires-refresh');
  });

  it('returns event-requires-refresh for pull_request', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs - 1 },
        { path: artifactPaths[1], exists: true, mtimeMs: nowMs - 1 },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
      eventName: 'pull_request',
    });
    expect(out.shouldRefresh).toBe(true);
    expect(out.reason).toBe('event-requires-refresh');
  });

  it('returns event-requires-refresh for workflow_run', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs - 1 },
        { path: artifactPaths[1], exists: true, mtimeMs: nowMs - 1 },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
      eventCategory: 'WORKFLOW_RUN_FAILURE',
    });
    expect(out.shouldRefresh).toBe(true);
    expect(out.reason).toBe('event-requires-refresh');
  });

  it('returns fresh-enough when artifacts present and recent', () => {
    const out = shouldRefreshProjectUnderstanding({
      artifactPaths,
      artifactStats: [
        { path: artifactPaths[0], exists: true, mtimeMs: nowMs - 1000 },
        { path: artifactPaths[1], exists: true, mtimeMs: nowMs - 1000 },
      ],
      nowMs,
      freshnessWindowMs: windowMs,
    });
    expect(out.shouldRefresh).toBe(false);
    expect(out.reason).toBe('fresh-enough');
  });
});
