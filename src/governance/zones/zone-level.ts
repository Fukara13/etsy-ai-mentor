/**
 * GH-2: Zone levels for governance gate classification.
 */

export type ZoneLevel = 'SAFE' | 'RESTRICTED' | 'RED';

export const ZONE_LEVELS = ['SAFE', 'RESTRICTED', 'RED'] as const;
