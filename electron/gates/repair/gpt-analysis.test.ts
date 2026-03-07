/**
 * Gate-S29: GPT Analysis Layer — Unit tests.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mapRepairContextToPrompt } from './gpt-analysis-mapper';
import { analyzeRepairContext } from './gpt-analysis';
import type { GPTAnalysisInput } from './gpt-analysis.types';

describe('Gate-S29: maps repair context to deterministic prompt', () => {
  it('produces prompt with required sections', () => {
    const input: GPTAnalysisInput = {
      failureSummary: 'Build failed on step test',
      failingStep: 'npm test',
      retryCount: 1,
      repairState: 'EVALUATOR_CHECK',
    };
    const prompt = mapRepairContextToPrompt(input);
    expect(prompt).toContain('You do NOT execute fixes');
    expect(prompt).toContain('You do NOT modify repositories');
    expect(prompt).toContain('Failure summary:');
    expect(prompt).toContain('Build failed on step test');
    expect(prompt).toContain('Failing step:');
    expect(prompt).toContain('npm test');
    expect(prompt).toContain('Retry count:');
    expect(prompt).toContain('1');
    expect(prompt).toContain('Repair state:');
    expect(prompt).toContain('EVALUATOR_CHECK');
    expect(prompt).toContain('Log excerpt:');
  });

  it('is deterministic for same input', () => {
    const input: GPTAnalysisInput = {
      failureSummary: 'Same',
      retryCount: 0,
      repairState: 'ANALYZE',
    };
    expect(mapRepairContextToPrompt(input)).toBe(mapRepairContextToPrompt(input));
  });

  it('truncates long log excerpt to 1500 chars', () => {
    const longLog = 'x'.repeat(2000);
    const prompt = mapRepairContextToPrompt({
      failureSummary: 'F',
      logExcerpt: longLog,
      retryCount: 0,
      repairState: 'IDLE',
    });
    expect(prompt).toContain('[truncated]');
    expect(prompt.length).toBeLessThan(2500);
  });
});

describe('Gate-S29: handles missing API key and returns fallback analysis', () => {
  const envKey = 'OPENAI_API_KEY';

  beforeEach(() => {
    vi.stubEnv(envKey, '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns fallback when OPENAI_API_KEY is not set', async () => {
    const result = await analyzeRepairContext({
      failureSummary: 'Any failure',
      retryCount: 0,
      repairState: 'ANALYZE',
    });
    expect(result.summary).toBe('GPT analysis unavailable. Fallback diagnostic mode active.');
    expect(result.hypotheses).toEqual(['Insufficient data for automated hypothesis']);
    expect(result.confidence).toBe(0);
    expect(result.requiresHuman).toBe(true);
  });
});

describe('Gate-S29: returns structured analysis result', () => {
  it('fallback result has all required fields', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const result = await analyzeRepairContext({
      failureSummary: 'F',
      retryCount: 0,
      repairState: 'ANALYZE',
    });
    vi.unstubAllEnvs();
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('hypotheses');
    expect(result).toHaveProperty('confidence');
    expect(result).toHaveProperty('requiresHuman');
    expect(typeof result.summary).toBe('string');
    expect(Array.isArray(result.hypotheses)).toBe(true);
    expect(typeof result.confidence).toBe('number');
    expect(typeof result.requiresHuman).toBe('boolean');
  });
});

describe('Gate-S29: gracefully handles malformed GPT response', () => {
  it('returns fallback when API returns invalid JSON', async () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test-key-for-mock');
    vi.mock('openai', () => ({
      default: class MockOpenAI {
        chat = {
          completions: {
            create: async () => ({
              choices: [{ message: { content: 'not valid json at all' } }],
            }),
          },
        };
      },
    }));
    const result = await analyzeRepairContext({
      failureSummary: 'F',
      retryCount: 0,
      repairState: 'ANALYZE',
    });
    vi.unstubAllEnvs();
    expect(result.summary).toBe('GPT analysis unavailable. Fallback diagnostic mode active.');
    expect(result.requiresHuman).toBe(true);
  });
});

describe('Gate-S29: ensures no execution authority is introduced', () => {
  it('result always has requiresHuman defined', async () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    const result = await analyzeRepairContext({
      failureSummary: 'F',
      retryCount: 0,
      repairState: 'ANALYZE',
    });
    vi.unstubAllEnvs();
    expect(result.requiresHuman).toBeDefined();
    expect(typeof result.requiresHuman).toBe('boolean');
  });

  it('prompt explicitly states no execution', () => {
    const prompt = mapRepairContextToPrompt({
      failureSummary: 'F',
      retryCount: 0,
      repairState: 'ANALYZE',
    });
    expect(prompt).toContain('You do NOT execute fixes');
    expect(prompt).toContain('You do NOT modify repositories');
  });
});
