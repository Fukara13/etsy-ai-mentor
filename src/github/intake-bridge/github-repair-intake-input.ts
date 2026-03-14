/**
 * GH-9: Bridge input combining GitHub Backbone artifacts.
 */

import type { GitHubBackboneEvent } from '../event-intake';
import type { PullRequestInspectionResult } from '../pr-inspection';
import type { PrIntelligenceResult } from '../pr-intelligence';

export interface GitHubRepairIntakeInput {
  readonly backboneEvent: GitHubBackboneEvent;
  readonly inspectionResult?: PullRequestInspectionResult;
  readonly intelligenceResult?: PrIntelligenceResult;
}
