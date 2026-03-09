/**
 * HM-5: Action suggestion contract.
 */

export type HeroActionSuggestion = {
  actionType: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high'
  blockedByHumanApproval: boolean
}
