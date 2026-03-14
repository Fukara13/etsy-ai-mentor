/**
 * GH-6: Input shape for GitHub webhook intake.
 */

export interface GitHubWebhookInput {
  readonly eventKind: string;
  readonly deliveryId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}
