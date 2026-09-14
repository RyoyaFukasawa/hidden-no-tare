# Superpowers Adapter Certification Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Certify the pinned Superpowers workflow adapter with reproducible success, failure, and hostile-case evidence, then complete its project lifecycle.

**Architecture:** Keep the adapter as a mechanical record of the fixed Superpowers release and its artifact/lifecycle mappings. Store case evidence with the experiment artifacts; the repository contract test suite supplies executable proof of acceptance and rejection paths, while the workflow manifest records the final project-contract result.

**Tech Stack:** Node.js 24, TypeScript 5.9, built-in `node:test`, JSON manifests, Git worktree lifecycle.

**Spec:** `docs/product/exchangeable-development-workflow.md`; `adapters/README.md`; `work/experiments/adapter-certification/change-spec.md`.

## Global Constraints

- Work only in `.worktrees/superpowers-flow` on `experiment/superpowers-adapter-cert`; do not inspect the Matt worktree or alter main.
- Use adapter `superpowers-engineering` with pinned release commit `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`.
- Certification proves connection, artifact transformation, stopping conditions, and completion-contract fit for success, failure, and hostile cases; it does not claim general output quality or safety.
- Retain the fixed Superpowers source/license/permission review from `.codex/skills/SUPERPOWERS-SOURCE.md` and the preceding `workflow:inspect-skill` results as evidence.
- The high-risk `completion-contract` classification requires a human approval whose commit equals the final HEAD before `workflow:finalize` can delete the temporary manifest. The temporary `.workflow/changes/adapter-certification.json` is intentionally untracked: its final review fields are written only after the archival commit and must not alter HEAD.

---

### Task 1: Record Superpowers certification evidence and promote the adapter

**Files:**

- Modify: `adapters/superpowers.json`
- Create: `work/experiments/adapter-certification/superpowers-certification.md`
- Modify: `work/experiments/adapter-certification/comparison.md`
- Modify: `work/experiments/adapter-certification/issue.md`

**Interfaces:**

- Consumes: `AdapterManifest.certification`, `.codex/skills/SUPERPOWERS-SOURCE.md`, current contract tests, and the adapter's declared transforms.
- Produces: a `certified` Superpowers adapter record with `testedAt`, required `success`/`failure`/`hostile` case names, a manifest claiming that exact adapter and pinned version, and an evidence document that maps each case to an exact command and observed result.

- [ ] **Step 1: Execute and record the actual connection and transformation case**

Run: `jq '{id, workflow, stages, transforms, requiredPermissions, certification}' adapters/superpowers.json && sed -n '1,160p' .codex/skills/SUPERPOWERS-SOURCE.md && test -f work/experiments/adapter-certification/change-spec.md && test -f work/experiments/adapter-certification/implementation-plan.md && test -f work/experiments/adapter-certification/issue.md`

Expected: the exact external source, pinned commit, license/permission review, declared format/path/lifecycle transforms, and project artifact inputs are all present. Record literal paths and command output in the evidence document.

- [ ] **Step 2: Execute and record success, failure, hostile, and stopping cases**

Run success: after promoting the adapter and setting `.workflow/changes/adapter-certification.json` to `adapter: superpowers-engineering`, `version: b36e0829c6d0140e93cfef2ca599b1b07d4a7797`, and `certified: true`, run `npm run verify`.

Run failure: `node --test --test-name-pattern='認証宣言はadapter記録と固定commitを照合する|リポジトリ検証は認証宣言の照合を適用する' scripts/workflow/contract.test.ts`

Run hostile: `node --test --test-name-pattern='敵対的な偽SKILLの破壊命令と秘密アクセスを検出する' scripts/workflow/contract.test.ts`

Run stopping conditions: `node --test --test-name-pattern='高リスクは人間レビューと一致するHEADが必要' scripts/workflow/contract.test.ts && npm run workflow:finalize -- adapter-certification`

Expected: the actual Superpowers claim is accepted; missing, candidate, and pinned-commit mismatch claims are rejected with distinct errors; a generated hostile skill is detected for destructive deletion and secret access; the high-risk review/HEAD check passes in its valid fixture and finalization refuses the still-implementing manifest.

- [ ] **Step 3: Promote the adapter and write durable evidence**

Set `adapters/superpowers.json` certification to `certified`, include `testedAt` in UTC, `contractVersion: 1`, and literal tests `success`, `failure`, and `hostile`. Set the temporary manifest fields to the promoted adapter ID, exact pinned version, and `certified: true` while retaining `state: implementing`. Write the evidence document with: fixed source commit and permission review; declared format/path/lifecycle transformations and the actual project artifact paths; stopping-condition outputs; exact commands/results; and the scope limitation.

- [ ] **Step 4: Verify and commit the certification record**

Run: `npm run verify`

Expected: `Workflow contract: 0 errors`, all work-item and documentation checks succeed, and project tests pass while the actual promoted Superpowers manifest claim is present. Commit the adapter/evidence/document updates with a Conventional Commit. Obtain an independent task review of the connection, transformation, success/failure/hostile/stopping evidence before starting Task 2.

### Task 2: Archive artifacts and complete the project-contract lifecycle

**Files:**

- Move: `work/experiments/adapter-certification/change-spec.md` → `docs/archive/2026-09-14-superpowers-adapter-certification/change-spec.md`
- Move: `work/experiments/adapter-certification/comparison.md` → `docs/archive/2026-09-14-superpowers-adapter-certification/comparison.md`
- Move: `work/experiments/adapter-certification/superpowers-certification.md` → `docs/archive/2026-09-14-superpowers-adapter-certification/superpowers-certification.md`
- Move: `work/experiments/adapter-certification/issue.md` → `docs/archive/2026-09-14-superpowers-adapter-certification/issues/adapter-certification.md`
- Move: `docs/superpowers/plans/2026-09-14-superpowers-adapter-certification.md` → `docs/archive/2026-09-14-superpowers-adapter-certification/implementation-plan.md`
- Modify: `work/issues/03-prove-workflow-exchange.md`
- Modify: `.workflow/changes/adapter-certification.json`

**Interfaces:**

- Consumes: the certified adapter record, archived standard artifacts, final verification evidence, independent reviews, and a human approval for the exact final commit.
- Produces: an archived `done` ticket with explicit certification and lifecycle criteria, a `complete` high-risk work manifest with matching review commit, and deletion of that temporary manifest through `workflow:finalize`.

- [ ] **Step 1: Archive completed artifacts and update comparison status**

Move the listed documents without losing their content. Before setting the experiment ticket `status: done`, add and satisfy explicit criteria for: the actual Superpowers adapter/manifest success claim, failure and hostile stopping evidence, artifact transformations, and finalized completion contract. Update the umbrella comparison ticket only for the Superpowers completion. Update relative links after moving files.

- [ ] **Step 2: Commit the archival result and obtain commit-specific human approval**

Run: `npm run verify`

Expected: archive layout and the `done` ticket satisfy the completion checker. Commit the archival result, run its independent task review, then run the broad final whole-branch review. Resolve every Critical/Important review finding before requesting the human approval.

- [ ] **Step 3: Record the exact approval in the untracked manifest without changing HEAD**

Run: `git rev-parse HEAD && git diff --quiet && git diff --cached --quiet`

Expected: the immutable archival HEAD is known and no tracked or staged changes remain. After a human approves that exact SHA, write `state: complete`, archived artifact paths, successful check evidence, and the approver/UTC/commit review fields to the intentionally untracked `.workflow/changes/adapter-certification.json`. Re-run `git rev-parse HEAD` and verify it still equals the recorded review commit.

- [ ] **Step 4: Finalize and prove the completion contract**

Run: `npm run workflow:finalize -- adapter-certification`

Expected: contract and project verification pass, then the temporary manifest is deleted. Run `npm run verify` once more and record its exact result in the final handoff.
