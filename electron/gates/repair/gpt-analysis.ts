/**
 * Gate-S29: GPT Analysis Layer — Analysis-only diagnostics. No execution, no patches.
 */

import OpenAI from 'openai';
import type { GPTAnalysisInput, GPTAnalysisResult } from './gpt-analysis.types';
import { mapRepairContextToPrompt } from './gpt-analysis-mapper';

const FALLBACK_RESULT: GPTAnalysisResult = {
  summary: 'GPT analysis unavailable. Fallback diagnostic mode active.',
  hypotheses: ['Insufficient data for automated hypothesis'],
  confidence: 0,
  requiresHuman: true,
};

function isValidResult(raw: unknown): raw is GPTAnalysisResult {
  if (raw == null || typeof raw !== 'object') return false;
  const o = raw as Record<string, unknown>;
  if (typeof o.summary !== 'string') return false;
  if (!Array.isArray(o.hypotheses)) return false;
  if (o.hypotheses.some((h: unknown) => typeof h !== 'string')) return false;
  if (typeof o.confidence !== 'number' || o.confidence < 0 || o.confidence > 1) return false;
  if (typeof o.requiresHuman !== 'boolean') return false;
  if (o.recommendedAction != null && typeof o.recommendedAction !== 'string') return false;
  if (o.riskFlags != null && (!Array.isArray(o.riskFlags) || o.riskFlags.some((r: unknown) => typeof r !== 'string')))
    return false;
  return true;
}

function toResult(raw: unknown): GPTAnalysisResult {
  if (!isValidResult(raw)) return FALLBACK_RESULT;
  return {
    summary: raw.summary,
    hypotheses: [...raw.hypotheses],
    confidence: raw.confidence,
    recommendedAction: raw.recommendedAction,
    riskFlags: raw.riskFlags != null ? [...raw.riskFlags] : undefined,
    requiresHuman: raw.requiresHuman,
  };
}

export async function analyzeRepairContext(
  input: GPTAnalysisInput
): Promise<GPTAnalysisResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return FALLBACK_RESULT;
  }

  const prompt = mapRepairContextToPrompt(input);
  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a diagnostic assistant. Respond only with valid JSON. Do not execute any fixes or modify any repository.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content || typeof content !== 'string') return FALLBACK_RESULT;

    const cleaned = content.replace(/^```\w*\n?|\n?```$/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return FALLBACK_RESULT;
    }

    return toResult(parsed);
  } catch {
    return FALLBACK_RESULT;
  }
}

export type { GPTAnalysisInput, GPTAnalysisResult } from './gpt-analysis.types';
export { mapRepairContextToPrompt } from './gpt-analysis-mapper';
