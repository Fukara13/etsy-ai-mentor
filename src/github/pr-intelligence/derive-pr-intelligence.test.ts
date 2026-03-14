import { describe, expect, it } from 'vitest';
import { inspectPullRequest } from '../pr-inspection';
import {
  derivePrIntelligence,
  type PrIntelligenceInput,
} from './derive-pr-intelligence';

function inspection(overrides: Partial<Parameters<typeof inspectPullRequest>[0]> = {}) {
  return inspectPullRequest({
    pullRequest: {
      number: 1,
      title: 'Test',
      state: 'open',
      head: { ref: 'main' },
      base: { ref: 'main' },
    },
    repository: { fullName: 'org/repo' },
    files: [],
    ...overrides,
  });
}

function input(insp: ReturnType<typeof inspection>): PrIntelligenceInput {
  return { inspection: insp };
}

describe('derivePrIntelligence', () => {
  it('tiny docs-only PR => LOW complexity, not risky', () => {
    const insp = inspection({
      files: [{ filename: 'README.md', status: 'modified', additions: 5, deletions: 2 }],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reviewComplexity).toBe('LOW');
    expect(result.risky).toBe(false);
    expect(result.sizeBand).toBe('TINY');
    expect(result.signals.touchesDocs).toBe(true);
  });

  it('dependency change => risky', () => {
    const insp = inspection({
      files: [{ filename: 'package.json', status: 'modified', additions: 1, deletions: 1 }],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.risky).toBe(true);
    expect(result.signals.touchesDependencies).toBe(true);
  });

  it('workflow file change => HIGH complexity, risky', () => {
    const insp = inspection({
      files: [
        {
          filename: '.github/workflows/ci.yml',
          status: 'modified',
          additions: 3,
          deletions: 1,
        },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reviewComplexity).toBe('HIGH');
    expect(result.risky).toBe(true);
    expect(result.signals.touchesGithubWorkflow).toBe(true);
  });

  it('core path change => HIGH complexity, risky', () => {
    const insp = inspection({
      files: [
        {
          filename: 'src/repair-engine/queue/repair-queue.ts',
          status: 'modified',
          additions: 5,
          deletions: 2,
        },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reviewComplexity).toBe('HIGH');
    expect(result.risky).toBe(true);
    expect(result.signals.touchesCorePaths).toBe(true);
  });

  it('medium test/source change => MEDIUM complexity', () => {
    const insp = inspection({
      files: [
        { filename: 'src/foo.ts', status: 'modified', additions: 30, deletions: 10, changes: 40 },
        { filename: 'src/foo.test.ts', status: 'modified', additions: 20, deletions: 5, changes: 25 },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reviewComplexity).toBe('MEDIUM');
    expect(result.sizeBand).toBe('MEDIUM');
    expect(result.signals.touchesSource).toBe(true);
    expect(result.signals.touchesTests).toBe(true);
    expect(result.signals.isCrossAreaChange).toBe(true);
  });

  it('file removals => risky', () => {
    const insp = inspection({
      files: [{ filename: 'old-file.ts', status: 'removed', additions: 0, deletions: 10 }],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.risky).toBe(true);
    expect(result.signals.hasFileRemovals).toBe(true);
  });

  it('renamed files => MEDIUM or above', () => {
    const insp = inspection({
      files: [
        {
          filename: 'new-name.ts',
          previous_filename: 'old-name.ts',
          status: 'renamed',
          additions: 5,
          deletions: 5,
        },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reviewComplexity).toBe('MEDIUM');
    expect(result.signals.hasRenames).toBe(true);
  });

  it('unknown file status => HIGH complexity, risky', () => {
    const insp = inspection({
      files: [{ filename: 'x.ts', status: 'unknown', additions: 1, deletions: 0 }],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reviewComplexity).toBe('HIGH');
    expect(result.risky).toBe(true);
    expect(result.signals.hasUnknownFileStatus).toBe(true);
  });

  it('cross-area change detection', () => {
    const insp = inspection({
      files: [
        { filename: 'package.json', status: 'modified', additions: 1, deletions: 0 },
        { filename: 'src/bar.ts', status: 'modified', additions: 5, deletions: 0 },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.signals.isCrossAreaChange).toBe(true);
    expect(result.signals.touchesDependencies).toBe(true);
    expect(result.signals.touchesSource).toBe(true);
  });

  it('empty files list conservative handling', () => {
    const insp = inspection({ files: [] });
    const result = derivePrIntelligence(input(insp));

    expect(result.sizeBand).toBe('TINY');
    expect(result.reviewComplexity).toBe('LOW');
    expect(result.risky).toBe(false);
    expect(result.totals.totalChangedFiles).toBe(0);
  });

  it('deterministic output', () => {
    const insp = inspection({
      files: [
        { filename: 'src/foo.ts', status: 'modified', additions: 20, deletions: 5 },
      ],
    });
    const a = derivePrIntelligence(input(insp));
    const b = derivePrIntelligence(input(insp));

    expect(a).toEqual(b);
  });

  it('does not mutate input', () => {
    const insp = inspection({
      files: [{ filename: 'a.ts', status: 'modified', additions: 1, deletions: 0 }],
    });
    const before = structuredClone(insp);
    derivePrIntelligence(input(insp));
    expect(insp).toEqual(before);
  });

  it('totals preserved exactly', () => {
    const insp = inspection({
      files: [
        { filename: 'a.ts', status: 'modified', additions: 10, deletions: 3 },
        { filename: 'b.ts', status: 'modified', additions: 5, deletions: 2 },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.totals.totalChangedFiles).toBe(insp.totalChangedFiles);
    expect(result.totals.totalAdditions).toBe(insp.totalAdditions);
    expect(result.totals.totalDeletions).toBe(insp.totalDeletions);
    expect(result.totals.totalChanges).toBe(insp.totalChanges);
  });

  it('reasons include active signals only', () => {
    const insp = inspection({
      files: [
        { filename: '.github/workflows/build.yml', status: 'modified', additions: 2, deletions: 0 },
      ],
    });
    const result = derivePrIntelligence(input(insp));

    expect(result.reasons).toContain('Touches GitHub workflow files');
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
