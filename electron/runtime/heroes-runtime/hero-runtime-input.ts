/**
 * OC-4: Runtime input for hero advisory. Safe context only; no raw payloads.
 */

export type HeroRuntimeInput = {
  readonly eventCategory: string;
  readonly eventKind: string;
  readonly action?: string;
  readonly summary?: string;
  readonly repositoryFullName?: string;
  readonly subjectId?: string;
  readonly deliveryId?: string;
  readonly changedFilePaths?: readonly string[];
  readonly hasArtifactBundle?: boolean;
};
