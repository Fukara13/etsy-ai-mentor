/**
 * OC-3: Project Understanding auto-refresh runtime adapter.
 */

export { shouldRefreshProjectUnderstanding } from './should-refresh-project-understanding';
export type {
  ShouldRefreshInput,
  ShouldRefreshOutput,
  ShouldRefreshReason,
  ArtifactStat,
} from './should-refresh-project-understanding';

export { refreshProjectUnderstanding } from './refresh-project-understanding';
export type { FsAdapter } from './refresh-project-understanding';

export {
  runProjectUnderstandingRefresh,
  PROJECT_UNDERSTANDING_REFRESH_COMMANDS,
} from './run-project-understanding-refresh';
export type { ProcessRunner } from './run-project-understanding-refresh';

export type {
  ProjectUnderstandingRefreshResult,
  ProjectUnderstandingRefreshReason,
  ProjectUnderstandingRefreshStatus,
} from './project-understanding-refresh-result';

export {
  createDefaultFsAdapter,
  createDefaultProcessRunner,
} from './default-runtime-adapters';
