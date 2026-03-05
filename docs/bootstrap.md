# Project Bootstrap Mode

## Overview

Gate S8 is **documentation only**. No workflows, scripts, or source code are modified. This document describes how to reuse the "AI Dev Engine" in a new repository: copy the `.github/workflows` folder and `.gates` conventions as-is, then follow this bootstrap procedure. The system is **controlled**: no auto-merge, owner approval required for merges, **retry limit 3** per PR, and automation stops when exhausted (manual intervention required). Workflows are reused by copying them; no edits to workflow YAML are required for basic bootstrap.

## What gets reused from this repo

- `.github/workflows/` — Copy the entire folder. It typically includes a main CI workflow, a retry controller (reacts to CI failure), an auto-remediation workflow (up to 3 attempts per PR), optionally a GPT failure analyzer, and a stability-layer guard. Exact file names depend on the source repo; copy the folder as-is.
- `.gates/` conventions:
  - `.gates/auto_remediation_attempt.txt` — Stores the remediation attempt count (1, 2, or 3). Workflows read/write this on the PR branch. When it reaches 3, remediation stops.
  - `.gates/force_ci_fail.txt` — Optional. If present in the repo root, some CI workflows may force a failure for testing. Remove or leave empty for normal runs.
- Concepts: `workflow_run` triggers, `gate-review` label (required for remediation), PR context guards, bot actor filter, retry cap.

## Required folders and files

In the target (new) repository:

| Item | Action |
|------|--------|
| `.github/workflows/` | **Required.** Copy entire folder from source repo. |
| `.gates/` | **Required.** Create the folder. You generally only need to ensure it exists; workflows create and manage `.gates/auto_remediation_attempt.txt` on the PR branch. |
| `package.json` (or equivalent) | **Optional.** Include if your workflows expect build/test scripts. Add scripts (e.g. `build`, `test`) that match the CI workflow steps. |

Other repo-specific files (e.g. `README`, lockfiles) are optional; add what your project needs.

## Required GitHub repository settings

1. **Actions enabled**
   - Settings → Actions → General → "Actions permissions" → Allow workflows.

2. **Workflow permissions**
   - Set to **"Read and write permissions"** if any workflow needs to push (e.g. auto-remediation). Otherwise "Read" is sufficient for CI-only setups.

3. **Allow GitHub Actions to create and approve pull requests**
   - Enable only if your workflows require it (e.g. bots that create or approve PRs). Most setups do not need this.

4. **Branch protection (main)**
   - **Required checks:** The required status check name(s) must exactly match the `name:` of your CI workflow(s). Check the workflow YAML for the `name:` field.
   - **Owner approval required:** Require PR review before merge.
   - **Auto-merge disabled:** Do not enable auto-merge; humans must approve merges.

## How to copy the workflows

**Option A — Copy from a cloned source repo**

macOS/Linux:

```bash
git clone https://github.com/owner/source-repo.git source-repo
cd source-repo

# Ensure .github/workflows exists
ls -la .github/workflows

# Copy to target repo (adjust TARGET_PATH)
TARGET_PATH="/path/to/target-repo"
mkdir -p "$TARGET_PATH/.github"
cp -r .github/workflows "$TARGET_PATH/.github/"
```

Windows PowerShell:

```powershell
git clone https://github.com/owner/source-repo.git source-repo
cd source-repo

# Ensure .github/workflows exists
Get-ChildItem .github/workflows

# Copy to target repo (adjust TARGET_PATH)
$TARGET_PATH = "C:\path\to\target-repo"
New-Item -ItemType Directory -Force -Path "$TARGET_PATH\.github"
Copy-Item -Recurse -Force .github/workflows "$TARGET_PATH\.github\"
```

**Option B — Download ZIP and copy**

1. Download the source repo as a ZIP from GitHub.
2. Extract and navigate to the repo folder.
3. Copy the `.github/workflows` folder into your target repo:
   - macOS/Linux: `cp -r .github/workflows /path/to/target-repo/.github/`
   - Windows: `robocopy .github\workflows C:\path\to\target-repo\.github\workflows /E` or use File Explorer to copy the `workflows` folder into `target-repo\.github\`.

## How to initialize the .gates system

1. **Create the `.gates` folder** in the target repo:

   ```bash
   mkdir -p .gates
   ```

2. **Optional:** Add `.gitkeep` so the empty folder is tracked in git:

   ```bash
   touch .gates/.gitkeep
   ```

3. **Commit and push:**

   ```bash
   git add .gates/
   git commit -m "chore: add .gates folder for automation"
   git push
   ```

**Attempt counter behavior:**
- `.gates/auto_remediation_attempt.txt` is **created and updated by workflows** on the PR branch. You do not create it manually.
- The counter **resets per PR branch**: each new PR branch starts without the file (treated as 0). To reset on an existing branch, delete the file and push, or open a new branch.

**force_ci_fail usage (optional):** Some CI workflows check for `.gates/force_ci_fail.txt` to force a failure for testing. Create it with `echo "" > .gates/force_ci_fail.txt`, push, run validation, then **delete it and push** to return to normal CI behavior.

## How to run CI locally

Install dependencies, then run the same commands your CI workflow uses:

```bash
npm ci
npm run build
npm run lint --if-present
npm test --if-present
```

Adjust commands to your package manager (e.g. `pnpm`, `yarn`). Check the `run:` steps in your CI workflow file to match exactly.

## How to validate Retry Controller (3 attempts)

**Safe fail induction methods:**

1. **Temporary failing test (recommended):** Add a minimal failing assertion and revert after validation. Example for Vitest: change `expect(1 + 1).toBe(2)` to `expect(1 + 1).toBe(999)` in a test file, push, validate, then revert the change and push.
2. **force_ci_fail (only if your CI supports it):** Create `.gates/force_ci_fail.txt` on the PR branch and push. Remove it after validation.

**Expected results:**
- CI fails.
- Retry/remediation workflow triggers.
- Up to **3 total attempts**; after 3, the workflow stops and posts an "Auto-remediation exhausted (3/3). Manual intervention required." comment.
- No further automation; manual fix or revert is required.

**Where to verify:**
- **PR → Checks** tab: see CI and related workflow runs.
- **Actions** tab: list of workflow runs and their logs.

## How to validate Stability Layer (guards)

Perform these three validation checks:

1. **Without `gate-review` label:** Open a PR **without** the `gate-review` label and trigger a CI failure. Remediation should **NOT** run (workflows that require the label will exit early).
2. **With `gate-review` label:** Add the `gate-review` label to the PR. Remediation **can** run when CI fails (if other guards pass).
3. **When attempt = 3:** After 3 remediation attempts, the workflow should stop and post an exhausted note on the PR. No further remediation commits should be pushed.

**How to confirm via logs and comments:**
- Go to **Actions** → select a stability-layer workflow run → View logs. Look for keywords: "Stability Layer active (S7)", "Event validated", "PR context validated", "Actor validated", "Retry limit check passed".
- On the PR, check for the exhausted comment: "Auto-remediation exhausted (3/3). Manual intervention required."

## Troubleshooting

- **Actions disabled**
  - **Cause:** Repository or organization has Actions turned off.
  - **Fix:** Settings → Actions → General → Allow workflows.

- **Missing permissions**
  - **Cause:** Workflow permissions are read-only but a workflow needs to push.
  - **Fix:** Settings → Actions → General → Workflow permissions → Read and write permissions.

- **Workflow not triggered**
  - **Cause:** Triggers do not match (e.g. PR targets a branch the workflow does not run on).
  - **Fix:** Check the workflow `on:` section; ensure the PR targets the expected branch (e.g. `main`).

- **Checks show 0**
  - **Cause:** No workflows in repo, Actions disabled, or workflows in the wrong path.
  - **Fix:** Copy `.github/workflows/` from source; enable Actions; ensure workflow files are in `.github/workflows/` and have valid YAML.

- **Branch protection / required checks mismatch**
  - **Cause:** Branch protection requires a status check whose name does not match any workflow `name:`.
  - **Fix:** In branch protection, set the required check name to the `name:` of your main CI workflow (e.g. `CI`).

- **Secrets or variables missing**
  - **Cause:** A workflow uses a secret or variable that is not set.
  - **Fix:** Add the secret in Settings → Secrets and variables → Actions. Only add what your workflows require (e.g. `OPENAI_API_KEY` for GPT-based workflows).

- **Remediation or analyzer not running on CI fail**
  - **Cause:** No PR context (e.g. push to branch with no PR) or missing `gate-review` label.
  - **Fix:** Open a PR; add the `gate-review` label; ensure the run is associated with that PR.

## Minimal checklist (copy/paste)

- [ ] Create new repo (or use existing)
- [ ] Make initial commit (e.g. README, package.json, basic project structure)
- [ ] Copy `.github/workflows/` from source repo to target repo (Option A or B)
- [ ] Create `.gates/` folder (optionally add `.gitkeep`)
- [ ] Commit and push `.gates/`
- [ ] Enable Actions in repository settings
- [ ] Set workflow permissions to Read and write (if any workflow pushes)
- [ ] Add `OPENAI_API_KEY` secret only if your workflows require it
- [ ] Add `build` and `test` scripts to package.json if CI expects them
- [ ] Open PR targeting `main`
- [ ] Add `gate-review` label to the PR
- [ ] Confirm Checks appear and run on the PR
- [ ] (Optional) Induce CI failure via temporary failing test or `force_ci_fail.txt`
- [ ] (Optional) Verify retry up to 3 attempts, then exhausted message
- [ ] (Optional) Revert failing change or remove `force_ci_fail.txt` after validation
