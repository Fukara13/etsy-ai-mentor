/**
 * OC-4: Default hero adapter for runtime. Wires registry, executor, runtime; advisory only.
 */

import { HeroRegistry } from '../../../src/heroes/core/hero.registry';
import { HeroExecutor } from '../../../src/heroes/core/hero.executor';
import { HeroRuntime } from '../../../src/heroes/runtime/hero.runtime';
import { registerAllHeroes } from '../../../src/heroes/heroes';
import type { HeroAdvisoryRunner } from './hero-runtime-invocation';
import type { HeroExecutionContext } from './hero-runtime-invocation';
import type { HeroExecutionOutput } from './hero-runtime-advisory';

function toExecutionOutput(result: {
  heroName: string;
  role: string;
  analysis: string;
  recommendations: string[];
  confidence: number;
  advice?: {
    summary?: string;
    analysis?: string;
    suggestedActions?: readonly { title: string }[];
  };
}): HeroExecutionOutput {
  return {
    heroName: result.heroName,
    role: result.role,
    analysis: result.analysis,
    recommendations: result.recommendations,
    confidence: result.confidence,
    advice: result.advice
      ? {
          summary: result.advice.summary,
          analysis: result.advice.analysis,
          suggestedActions: result.advice.suggestedActions,
        }
      : undefined,
  };
}

let defaultRunner: HeroAdvisoryRunner | null = null;

function getDefaultRunner(): HeroAdvisoryRunner {
  if (defaultRunner) return defaultRunner;
  const registry = new HeroRegistry();
  registerAllHeroes(registry);
  const executor = new HeroExecutor(registry);
  const runtime = new HeroRuntime(registry, executor);

  defaultRunner = async (
    heroId: string,
    context: HeroExecutionContext
  ): Promise<HeroExecutionOutput> => {
    const result = await runtime.run(heroId, context);
    return toExecutionOutput(result);
  };
  return defaultRunner;
}

/**
 * Returns the default advisory runner (registry + executor + runtime). Advisory only; no execution authority.
 */
export function createDefaultHeroAdvisoryRunner(): HeroAdvisoryRunner {
  return getDefaultRunner();
}
