# Production-Grade System Architecture Report

**Project:** Etsy Mentor — Electron + React (TypeScript) Desktop Application  
**Updated:** 2026-03-04  
**Purpose:** Canonical description of the production-grade gate system, CI (sürekli entegrasyon) and GPT-based remediation stack.

---

## Table of Contents

1. [System Goal and Constraints](#1-system-goal-and-constraints)
2. [Canonical Architecture Flow](#2-canonical-architecture-flow)
3. [Triggers (tetikleyiciler) and Non-triggers](#3-triggers-tetikleyiciler-and-non-triggers)
4. [Gate Discipline and Snapshot / Rollback](#4-gate-discipline-and-snapshot--rollback)
5. [Current Gates and Status](#5-current-gates-and-status)
6. [Operational Model](#6-operational-model)
7. [CI & Workflow Summary](#7-ci--workflow-summary)
8. [Next Gate: S7 Stability Layer (planned)](#8-next-gate-s7-stability-layer-planned)
9. [Glossary / Terminology](#9-glossary--terminology)

---

## 1. System Goal and Constraints

- **Semi-autonomous (yarı otonom) AI development system**
  - The system is designed to assist with CI (sürekli entegrasyon) failure analysis and safe auto-remediation, not to fully own the pipeline.
  - AI agents propose patches and analyses; humans keep final authority.

- **Human governance (insan yönetişimi / governance)**  
  - No auto-merge is allowed in any gate.  
  - Repository owners / maintainers must review and approve merges.  
  - GPT and Jules operate *inside* this governance boundary.

- **Retry limit (yeniden deneme limiti)**  
  - Auto-remediation attempts are capped at **3** per PR.  
  - State is tracked by the gates system (e.g. `.gates/` artifacts) and workflow logic, not by human memory.

- **Cost control (maliyet kontrolü)**  
  - GPT workloads only run when:
    - The PR has the `gate-review` label, and
    - There is a CI failure (workflow_run (iş akışı koşusu) with `conclusion == failure`), or an explicit retry loop.  
  - No GPT usage is triggered on every PR by default; this keeps compute spend bounded.

- **Antigravity removed (bilinçli olarak çıkarıldı)**  
  - Any experimental “antigravity” or non-essential features were intentionally removed.  
  - The active system focuses on reliability, observability, and guardrailed automation.

---

## 2. Canonical Architecture Flow

High-level flow from code change to decision:

```text
Developer
   ↓
Pull Request (PR)
   ↓
CI (build + test + lint)
   ↓
Retry Controller S4 (workflow_run → gate-s4-retry-controller)
   ↓
Auto Remediation Guard S5 / S5.1 (gate-s5-auto-remediation)
   ↓
GPT Failure Analyzer S6 (gate-s6-gpt-failure-analyzer)
   ↓
Human Decision (merge / rollback / manual fix)
```

- **Developer**
  - Pushes branches and opens PRs targeting `main`.

- **CI (Gate-S2, Gate-S3 foundation)**  
  - Workflow `CI` in `.github/workflows/ci.yml`.  
  - Runs on:
    - `push` to `main`, `work/next`, `test/**`
    - `pull_request` to `main`
    - `workflow_dispatch` (manual trigger)
  - Performs deterministic install (`npm ci`), build, optional lint/test (`npm test` now wired via Vitest).

- **Retry Controller S4 (Gate-S4)**  
  - Implemented as a `workflow_run` (tetikleyici) controller (`gate-s4-retry-controller.yml`).  
  - Watches CI results and decides whether to trigger auto-remediation or halt, respecting retry counters and labels.

- **Auto Remediation Guard S5 / S5.1 (Gate-S5)**  
  - Workflow: `gate-s5-auto-remediation.yml`.  
  - Enforces:
    - PR context required (no workflow_run without PR).  
    - `gate-review` label required.  
    - Concurrency (eşzamanlılık) per-PR so that only one remediation run is active.  
    - Attempt tracking via `.gates/auto_remediation_attempt.txt` in the PR branch (max 3 attempts).  
    - Exhausted-comment logic at 3/3: posts a stable “Auto-remediation exhausted (3/3)” comment and stops further attempts.
  - Never performs merges; only pushes scoped remediation commits to the PR branch.

- **GPT Failure Analyzer S6 (Gate-S6)**  
  - Workflow: `gate-s6-gpt-failure-analyzer.yml`.  
  - Triggered by `workflow_run` on the `CI` workflow when `conclusion == failure`.  
  - Guards:
    - Requires PR context.
    - Requires `gate-review` label.
    - Requires `OPENAI_API_KEY` secret.
  - Collects compact logs (max ~12,000 characters), calls the OpenAI Responses API, and posts/updates a single structured PR comment with marker `<!-- AI_FAILURE_ANALYSIS:S6 -->`.
  - Analysis-only; no code changes, no patches, no merges.

- **Human Decision**
  - Maintainer inspects:
    - CI results,
    - S4/S5 state (attempt counter, exhausted comment),
    - S6 analysis comment.  
  - Maintainer then chooses merge, manual fix, or rollback (via git tags/branches).

This flow is the **canonical architecture**. Any future gates must fit into this pipeline rather than bypass it.

---

## 3. Triggers (tetikleyiciler) and Non-triggers

### 3.1 Triggers

- **PR events (pull_request tetikleyicisi)**  
  - Opening, updating, or reopening a PR targeting `main` triggers the `CI` workflow.  
  - The presence of the `gate-review` label is a logical gate for S5 and S6, not for CI itself.

- **Push events (push tetikleyicisi)**  
  - Branches:
    - `main`
    - `work/next`
    - `test/**`  
  - Trigger CI so gate behavior can be verified on working and test branches.

- **workflow_run (iş akışı koşusu) for S4, S5, S6**  
  - `gate-s4-retry-controller.yml`, `gate-s5-auto-remediation.yml`, and `gate-s6-gpt-failure-analyzer.yml` are triggered by `workflow_run` events of the `CI` workflow.  
  - They filter on:
    - `conclusion == failure`
    - repository matches (no forked head repos for remediation),
    - presence of `pull_requests[0]` for PR context.

- **Manual triggers (workflow_dispatch tetikleyicisi)**  
  - CI can be manually re-run via `workflow_dispatch`.  
  - The gates leverage existing `workflow_run` semantics rather than custom webhooks.

### 3.2 Non-triggers (explicitly NOT triggers)

- **Cursor**  
  - Cursor (the IDE/agent environment) is **not** a trigger source.  
  - No gate or workflow starts purely because Cursor suggests/edits something.  
  - Only GitHub events (push, pull_request, workflow_run, workflow_dispatch) can initiate automation.

- **Local scripts / dev seeds**  
  - Local commands or `GATE_DEV_SEED` environment overrides gates in development, but do **not** trigger CI or remediation by themselves.

---

## 4. Gate Discipline and Snapshot / Rollback

### 4.1 Gate discipline (gate disiplini)

- **Scope freeze (kapsam dondurma)**  
  - Each gate (S1…S6) is implemented against a frozen, documented scope.  
  - During execution of a gate, new unrelated features are not added to avoid moving targets.

- **One gate at a time**  
  - Only one major gate (e.g. S5.1, S6) should be considered “in-flight” for implementation.  
  - Parallel work is allowed only if it does not affect gate invariants.

- **Definition of Done per gate**  
  - Each gate has explicit DoD, typically including:
    - CI behavior,
    - guardrails (permissions, labels),
    - failure modes and logging,
    - documentation updates (this document, gate docs under `docs/gates/`),
    - tag creation (e.g. `gate-s6-pass`).

### 4.2 Snapshot / rollback (anlık görüntü ve geri alma)

The system relies on **git tags** and **branches** for rollback, not on hidden automation.

#### Snapshot commands (tagging)

Example snapshot commands (run locally with appropriate permissions):

```bash
# Create a gate snapshot tag after successful verification
git tag gate-s6-pass
git push origin gate-s6-pass
```

Historical examples include tags:

- `gate-8-pass`
- `gate-8-2-pass`
- `gate-9-pass`
- `gate-10-pass`
- `gate-11-pass`
- **`gate-s6-pass`** (current S6 snapshot)

#### Rollback commands

Rollback is explicit and human-driven:

- **Preferred path — revert via PR (önerilen yol):**

  ```bash
  # Create a revert commit locally and open a PR as usual
  git checkout main
  git revert <problematic-commit-or-merge-sha>
  git push origin main
  # Then open a PR / complete existing PR through normal review
  ```

- **Break-glass (acil durum) path — force rollback to tag:**

  ```bash
  # Hard reset local main to a known-good gate tag
  git checkout main
  git reset --hard gate-9-pass

  # Push rollback (force required; must be a conscious governance decision)
  git push --force-with-lease origin main
  ```

Rollback to other tags or creating recovery branches (e.g. `recover-from-gate-A`) follows the same manual pattern. The system does **not** auto-rollback.

---

## 5. Current Gates and Status

As of this document, the following gates in the CI / remediation stack are **PASS**:

- **S1** — Baseline workspace and repo health.
- **S2** — CI workflow foundation (deterministic `npm ci`, build).
- **S3** — Deterministic test baseline (deterministik test altyapısı).
- **S4** — Retry controller (S4) for CI failures.
- **S5** — Auto-remediation guard.
- **S5.1** — Hardened S5:  
  - Concurrency per PR,  
  - Attempt tracking via `.gates/auto_remediation_attempt.txt`,  
  - Exhausted comment + early exit at 3/3.
- **S6** — GPT Failure Analyzer (analysis-only).

### 5.1 Tags (etiketler)

#### A) Current canonical gate tags (S1–S6 series)

These tags represent the **canonical** snapshots for the S1–S6 gate series:

- `gate-8-pass`
- `gate-8-2-pass`
- `gate-9-pass`
- `gate-10-pass`
- `gate-11-pass`
- **`gate-s6-pass`** — indicates that Gate-S6 has passed and was pushed to origin.

#### B) Legacy / historical tags

These tags are **historical** and kept for traceability, but are not part of the current S1–S6 canonical series:

- `gate-A-pass`
- `gate-A-recovered`

Together, these tags are the canonical source of truth for which gates were fully verified at a given point in history.

---

## 6. Operational Model

The system distinguishes roles and responsibilities across the toolchain:

- **CI = technical verification (teknik doğrulama)**
  - Compiles, builds, runs tests, and optional lint.  
  - Answered question: “Does the code *build and test* correctly?”

- **GPT = logical analysis (mantıksal analiz)**  
  - Gate-S6 uses the OpenAI Responses API to:
    - Ingest compact CI logs,
    - Produce structured JSON with fields such as `failure_type`, `root_cause`, `suggested_fix`, `risk_level`, `confidence`, `key_evidence`.  
  - Answered question: “What likely went wrong and how should we fix it?”  
  - Strictly **analysis-only**; it does not patch code or merge.

- **Jules = patch apply (yama uygulama)**  
  - Jules (the patch agent) is responsible for generating and applying concrete code changes under human governance.  
  - Jules is not wired into S6 directly; it operates when humans approve remediation work.

- **Human = merge / rollback decisions**  
  - Humans:
    - Interpret CI + S4/S5/S6 outputs,
    - Decide whether to merge, further patch, or rollback,  
    - Create and push gate tags (`gate-s6-pass`, etc.).  
  - The system is **semi-autonomous** by design; there is no fully automatic promotion to `main`.

---

## 7. CI & Workflow Summary

### 7.1 CI workflow (`CI`)

Location: `.github/workflows/ci.yml`

- **Triggers:**
  - `push` on `main`, `work/next`, `test/**`
  - `pull_request` on `main`
  - `workflow_dispatch` (manual run)
- **Concurrency:**
  - `ci-${{ github.head_ref || github.run_id }}` with `cancel-in-progress: true` (per-PR CI queueing).
- **Permissions:**
  - `contents: read`
- **Steps (simplified):**
  - Checkout
  - Optional force-fail hook for Gate-S5.1 testing (guarded by `.gates/force_ci_fail.txt`)
  - Setup Node 20.x
  - `npm ci`
  - `npm run build`
  - `npm run lint --if-present`
  - `npm test --if-present` (Vitest).

### 7.2 Gate S4 – Retry Controller (`gate-s4-retry-controller.yml`)

- `on: workflow_run` for `CI` workflow.
- Encodes retry semantics, attempt counting at the *controller* level (distinct from S5’s auto-remediation attempts).
- S4 counters represent the **CI-level retry policy**, not remediation attempts.

### 7.3 Gate S5 / S5.1 – Auto Remediation (`gate-s5-auto-remediation.yml`)

- `on: workflow_run` for `CI` failures.  
- Guards:
  - PR context required.
  - `gate-review` label required.
  - Repository ownership check for safety (no remediation on forks).
- Core behaviors:
  - Checks out PR head.
  - Bumps `.gates/auto_remediation_attempt.txt` to track attempts.
  - S5 counters are the **remediation attempt file** values in `.gates/auto_remediation_attempt.txt`.
  - S4 and S5 counters are both capped at **3** and must not diverge for the same PR.
  - If new attempt >= 3:
    - Posts **idempotent** exhausted comment:
      `Auto-remediation exhausted (3/3). Manual intervention required.`
    - Exits without further actions.  
  - Otherwise, performs the scoped remediation (e.g. removing a known failure marker) and pushes a remediation commit.

### 7.4 Gate S6 – GPT Failure Analyzer (`gate-s6-gpt-failure-analyzer.yml`)

- `on: workflow_run` for `CI` failures.  
- Guards:
  - PR context present.
  - `gate-review` label present.
  - `OPENAI_API_KEY` secret present; optional `OPENAI_MODEL` repo variable.  
- Steps (high level):
  1. Download and unzip CI logs for the specific run.
  2. Build a compact log (`scripts/gate-s6/compact_ci_logs.sh`), capped at ~12k characters and focused on error-like lines + recent tail.
  3. Call OpenAI Responses API:
     - Model is configurable via `OPENAI_MODEL`; the default is defined inside the Gate-S6 workflow itself.  
     - Response is constrained to a fixed JSON schema with keys:
       `failure_type`, `root_cause`, `suggested_fix`, `risk_level`, `confidence`, `key_evidence`.
  4. Render a Markdown PR comment:
     - Title: “AI Failure Analysis (Gate-S6)”
     - Summary table (failure type, root cause, suggested fix, risk, confidence)
     - Bullet list of key evidence
     - Marker `<!-- AI_FAILURE_ANALYSIS:S6 -->`
     - Footer: “Analysis-only. No changes were applied.”
  5. Idempotent update:
     - If a comment containing the marker exists, it is **PATCH**’ed.
     - Otherwise, a new comment is created.
  6. **DoD evidence:** Every successful S6 run must leave at least one PR comment containing the marker `<!-- AI_FAILURE_ANALYSIS:S6 -->` on the associated PR.

---

## 8. Next Gate: S7 Stability Layer (planned)

> **Status:** Planned backlog, **not implemented yet**. This section defines intent only.

Gate-S7 aims to harden the system around long-lived stability concerns rather than single-run correctness.

- **Loop protection (döngü koruması)**  
  - Detect and break pathological loops between:
    - CI ↔ S4 ↔ S5 ↔ S6,
    - PR updates that keep re-triggering the same failing cycle.  
  - Guardrail examples (conceptual):
    - Rate limits for how often the same PR can enter remediation within a timeframe.
    - Detection of repeated identical failure signatures without progress.

- **Cost leak detection (maliyet sızıntısı tespiti)**  
  - Monitor GPT and CI usage to detect:
    - PRs that consume disproportionate GPT tokens,
    - High retry counts with no convergence.  
  - Potential outputs:
    - Flagging “cost hotspots” to maintainers,
    - Recommending manual intervention instead of further automation.

- **Gate health check (gate sağlık kontrolü)**  
  - Periodic or on-demand health checks for:
    - CI reliability,
    - S4/S5/S6 success/failure ratios,
    - Secret configuration (e.g. `OPENAI_API_KEY` presence).  
  - Goals:
    - Detect misconfigurations early,
    - Provide a summary dashboard of gate states.

- **Actor / bot ignore rules (bot aktör filtreleme)**  
  - Define which actors (users, bots, integrations) are allowed to:
    - Trigger remediation,
    - Consume GPT budget,
    - Affect gate state.  
  - Example patterns:
    - Ignore runs from certain automation-only branches.
    - Restrict remediation to human-authored PRs.

Again: **S7 is not yet built.** This section documents the intended direction only and must not be interpreted as live behavior.

---

## 9. Glossary / Terminology

- **Trigger (tetikleyici)** — An event in GitHub Actions (`push`, `pull_request`, `workflow_run`, `workflow_dispatch`) that starts a workflow.
- **workflow_run (iş akışı koşusu)** — A GitHub Actions event describing the completion of another workflow; used by S4, S5, S6.
- **Governance (yönetişim)** — The human-controlled rules and processes (no auto-merge, explicit tags, explicit rollback) that limit what automation is allowed to do.
- **Gate (kapı)** — A named milestone (S1, S2, …, S6, planned S7) with a specific scope, DoD, and usually one or more workflows.
- **Remediation (iyileştirme / otomatik düzeltme)** — Automated code or config change proposed/applied by agents (e.g. S5) under strict constraints.
- **Analysis-only (sadece analiz)** — A gate or workflow (e.g. S6) that is allowed to comment and summarize, but not allowed to modify code or merge branches.

---

*This report reflects the architecture **after** Gate-S6 pass (`gate-s6-pass`) and is the current source of truth for gate behavior and CI/GPT integration.*
