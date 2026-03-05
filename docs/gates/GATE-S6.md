# Gate-S6: GPT Failure Analyzer

**Goal:** When CI fails and the PR has the `gate-review` label, collect compact CI logs, call OpenAI to analyze, and post/update a single structured PR comment. Analysis-only; no code changes or auto-merge.

---

## Required secrets

| Secret | Description |
|--------|-------------|
| `OPENAI_API_KEY` | **Required.** OpenAI API key for the Responses API. Set in repository **Settings → Secrets and variables → Actions**. |

## Optional configuration

| Variable / env | Description |
|----------------|-------------|
| `OPENAI_MODEL` | **Optional.** Repository variable (or env) to override the model. Default: `gpt-4.1`. |

---

## Behavior

- **Trigger:** `workflow_run` when the **CI** workflow completes with `conclusion == 'failure'`.
- **Guards:** Exits without error if there is no PR context, if the PR does not have the `gate-review` label, or if `OPENAI_API_KEY` is missing.
- **Output:** One PR comment (created or updated) with marker `<!-- AI_FAILURE_ANALYSIS:S6 -->`, containing failure type, root cause, suggested fix, risk, confidence, and key evidence. Comment is idempotent (same comment is updated on re-runs).
