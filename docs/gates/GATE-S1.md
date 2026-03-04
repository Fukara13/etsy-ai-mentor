# Gate-S1: Repo Security Baseline

**Goal:** Establish a production-grade repository security baseline.

**Scope:** Branch protection, CODEOWNERS, PR template, security documentation. No CI workflows (those are Gate-S2).

---

## Definition of Done (DoD)

- [ ] `.github/CODEOWNERS` exists; placeholder owner replaced with real username/team.
- [ ] `.github/pull_request_template.md` exists and is used for new PRs.
- [ ] `SECURITY_BASELINE.md` exists in repo root.
- [ ] Branch protection rule for `main` is configured per SECURITY_BASELINE.md.
- [ ] CODEOWNERS review is required for merges.
- [ ] At least 1 approval required before merge.
- [ ] Auto-merge is disabled for `main`.
- [ ] Force pushes and branch deletion are disabled on `main`.
- [ ] README contains a "Repo Safety" section linking to SECURITY_BASELINE.md.

---

## Step-by-Step GitHub UI Settings Checklist

### 1. Branch Protection (main)

1. Go to **Repository → Settings → Branches**.
2. Click **Add branch protection rule** (or edit existing rule for `main`).
3. **Branch name pattern:** `main`
4. Enable and set:
   - **Require a pull request before merging:** ON
   - **Require approvals:** 1
   - **Require review from Code Owners:** ON
   - **Require status checks to pass before merging:** ON *(add checks in Gate-S2)*
   - **Require branches to be up to date before merging:** ON (optional but recommended)
   - **Restrict who can push to matching branches:** ON → add owner(s)
   - **Dismiss stale pull request approvals when new commits are pushed:** ON
   - **Require conversation resolution before merging:** ON
   - **Do not allow bypassing the above settings:** ON
   - **Allow force pushes:** OFF
   - **Allow deletion:** OFF
5. Save.

### 2. Workflow Permissions (Actions)

1. Go to **Repository → Settings → Actions → General**.
2. Under **Workflow permissions:**
   - Select **Read repository contents and packages permissions**.
3. Save.

### 3. CODEOWNERS

1. Ensure `.github/CODEOWNERS` is committed.
2. Replace `@OWNER_GITHUB_USERNAME` with your GitHub username or team (e.g. `@your-org/security`).
3. CODEOWNERS will be auto-enforced when "Require review from Code Owners" is enabled in branch protection.

### 4. Auto-Merge

1. In each PR, do **not** enable "Enable auto-merge".
2. Merges must be manual to satisfy the security baseline.

### 5. Pull Request Template

1. Ensure `.github/pull_request_template.md` is committed.
2. New PRs will automatically use this template.

---

## Verification Steps

### Confirm branch protection

1. Create a test branch, make a commit, and try to push directly to `main`.
   - **Expected:** Push is rejected (branch is protected).
2. Open a PR from the test branch to `main`.
   - **Expected:** Merge button is disabled until:
     - At least 1 approval.
     - CODEOWNERS review (if CODEOWNERS file is valid and reviewer is assigned).
     - All required status checks pass (when Gate-S2 adds them).
     - All conversations are resolved.

### Confirm CODEOWNERS

1. Open a PR that touches any file.
2. **Expected:** CODEOWNERS reviewer is auto-requested (if usernames in CODEOWNERS are valid).

### Confirm PR template

1. Open a new PR.
2. **Expected:** PR description is pre-filled with the pull_request_template.md content.

### Confirm no auto-merge

1. In a PR with all checks passing and approvals in place, check the merge dropdown.
2. **Expected:** "Enable auto-merge" is available but should not be used per policy.
