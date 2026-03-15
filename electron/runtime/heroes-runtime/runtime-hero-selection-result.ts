/**
 * OC-4: Result of hero selection. Either eligible hero ids or skipped with reason.
 */

export type RuntimeHeroSelectionResult =
  | { eligible: true; heroIds: readonly string[]; reason: string }
  | { eligible: false; reason: string };
