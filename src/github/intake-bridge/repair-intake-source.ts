/**
 * GH-9: Repair intake source types.
 */

export type RepairIntakeSource = 'GITHUB_BACKBONE';

export const REPAIR_INTAKE_SOURCES: readonly RepairIntakeSource[] = [
  'GITHUB_BACKBONE',
] as const;
