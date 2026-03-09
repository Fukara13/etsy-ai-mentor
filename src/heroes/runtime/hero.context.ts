/**
 * HM-2: Lightweight execution context for hero runtime.
 * Generic; no external dependencies.
 */

export type HeroExecutionContext = {
  event: string
  subject?: string
  repository?: string
  pullRequestNumber?: number
  summary?: string
  signals?: string[]
  metadata?: Record<string, unknown>
}
