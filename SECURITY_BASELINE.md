# Repository Security Baseline (Gate-S1)

This document defines the production-grade security baseline for this repository. All contributors must adhere to these policies.

---

## Branch Protection Rules (main)

Configure under **Settings → Branches → Add branch protection rule** (for `main`):

| Setting | Required Value |
|---------|----------------|
| **Require a pull request before merging** | ✅ Enabled |
| **Required approvals** | 1 or more |
| **Require review from Code Owners** | ✅ Enabled |
| **Require status checks to pass** | ✅ Enabled — require "CI" (Gate-S2 workflow) |
| **Require branches to be up to date** | ✅ Enabled (recommended) |
| **Restrict who can push to matching branches** | ✅ Enabled — owner(s) only |
| **Dismiss stale pull request approvals when new commits are pushed** | ✅ Enabled |
| **Require conversation resolution before merging** | ✅ Enabled |
| **Do not allow bypassing the above settings** | ✅ Enabled |
| **Allow force pushes** | ❌ Disabled |
| **Allow deletions** | ❌ Disabled |

**Status check (Gate-S2):** In branch protection, add **CI** as a required status check. This is the Gate-S2 workflow that runs build (and optionally lint/test) on PRs.

---

## Merge Policy

- **No merge without PR** — Direct pushes to `main` are blocked.
- **No merge without owner approval** — At least one approval from a CODEOWNERS reviewer is required.
- **Auto-merge disabled** — Do not enable GitHub’s auto-merge for `main`. Merges must be manual and intentional.

---

## Gate-Review Label

- **Label:** `gate-review`
- **Usage:** Indicates that a manual owner review has been applied.
- **Policy:** Owner-only. Only designated CODEOWNERS should add this label; it signals that the PR has passed human security/review checks.
- **Workflow:** Add `gate-review` after owner review; required before merge when enforced by branch protection or team policy.

---

## GitHub Actions Permissions

- **Default (repo-level):** Read-only for `contents`. Configure under **Settings → Actions → General → Workflow permissions**.
- **Workflow-level:** Grant write permissions only when necessary (e.g., future Gate-S5 deployments). Prefer least-privilege scoping per job.

---

## Secrets Policy

| Rule | Description |
|------|-------------|
| **Use GitHub Secrets** | Store API keys, tokens, and credentials in **Settings → Secrets and variables → Actions**. Never commit them. |
| **Never expose to untrusted PR contexts** | Do not run workflows that pass secrets to code from forks or untrusted PRs. |
| **GPT key** | OpenAI/GPT API key must live in GitHub Secrets or local `.env` only — never in the repository. |

---

## Related

- **Gate-S1 Definition:** [docs/gates/GATE-S1.md](docs/gates/GATE-S1.md)
- **CODEOWNERS:** [.github/CODEOWNERS](.github/CODEOWNERS)
- **PR Template:** [.github/pull_request_template.md](.github/pull_request_template.md)
