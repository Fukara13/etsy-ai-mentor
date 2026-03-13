/**
 * GH-7: Input shape for PR inspection.
 */

export interface PullRequestInspectionInput {
  readonly pullRequest: {
    readonly number: number;
    readonly title: string;
    readonly state: string;
    readonly draft?: boolean;
    readonly mergeable?: boolean | null;
    readonly head: { readonly ref: string };
    readonly base: { readonly ref: string };
  };
  readonly repository: { readonly fullName: string };
  readonly files?: readonly {
    readonly filename: string;
    readonly previous_filename?: string;
    readonly status?: string;
    readonly additions?: number;
    readonly deletions?: number;
    readonly changes?: number;
  }[];
}
