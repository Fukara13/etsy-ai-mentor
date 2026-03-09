/**
 * HM-2: Normalized runtime output.
 * Maps from HeroResult + context event.
 */

export type HeroExecutionResult = {
  heroName: string
  role: string
  contextEvent: string
  analysis: string
  recommendations: string[]
  confidence: number
}
