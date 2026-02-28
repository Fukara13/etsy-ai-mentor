# Gate-S2: GitHub CI Workflow (Build)

**Goal:** Create a minimal, reliable GitHub CI pipeline that runs on Pull Requests.

**Scope:** Deterministic install, build, optional lint/test. No GPT, no auto-fix, no auto-merge.

---

## Definition of Done (DoD)

- [ ] `.github/workflows/ci.yml` exists.
- [ ] Workflow runs on `pull_request` (opened, synchronize, reopened) and `workflow_dispatch`.
- [ ] `npm ci` is used for deterministic install.
- [ ] `npm run build` runs and must succeed.
- [ ] Lint and test run only if scripts exist in `package.json` (via `--if-present`).
- [ ] Permissions: `contents: read` only; no write permissions.
- [ ] Node.js LTS (20.x) is used.
- [ ] Concurrency: cancel-in-progress for same PR.
- [ ] Branch protection requires "CI" status check (configure in GitHub UI).
- [ ] `SECURITY_BASELINE.md` documents the CI status check name.

---

## What CI Does

| Step | Action |
|------|--------|
| Checkout | Clones the repository |
| Setup Node.js | Uses Node 20.x with npm cache |
| Install | `npm ci` — deterministic install from lockfile |
| Build | `npm run build` — must succeed |
| Lint | `npm run lint --if-present` — runs only if lint script exists |
| Test | `npm test --if-present` — runs only if test script exists |

---

## What CI Does Not Do

- **No GPT integration** — No LLM calls, no AI analysis.
- **No Jules / Cursor integration** — No automated patch agents.
- **No auto-fix** — No automatic code modification.
- **No auto-merge** — Merges remain manual.
- **No retry controller** — That belongs to Gate-S5.
- **No secrets usage** — No API keys or credentials in this workflow.
- **No artifact upload** — Build outputs stay local; kept minimal.

---

## How to Read Failures

| Failure | Likely Cause | Action |
|---------|--------------|--------|
| **Install dependencies** | Lockfile mismatch, registry issue | Run `npm ci` locally; ensure `package-lock.json` is committed and in sync with `package.json` |
| **Build** | TypeScript errors, Vite build errors, missing deps | Run `npm run build` locally and fix errors |
| **Lint** | Lint script reported issues | Run `npm run lint` locally and fix |
| **Test** | Test script reported failures | Run `npm test` locally and fix |

---

## Tie-In to Gate-Review and Retry Controller

- **Gate-review:** Owners should verify CI is green before adding the `gate-review` label. CI is a required status check for merge.
- **Retry Controller (Gate-S5):** When introduced, the Retry Controller may re-run CI or trigger remediation workflows. CI remains the source of truth for build/test status.

---

## Related

- **Security Baseline:** [SECURITY_BASELINE.md](../../SECURITY_BASELINE.md) — requires "CI" status check
- **Gate-S1:** [GATE-S1.md](GATE-S1.md) — branch protection and CODEOWNERS
