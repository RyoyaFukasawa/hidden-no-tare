# Adapter Certification Claim Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject a manifest's certified claim unless it matches a certified adapter and its pinned commit.

**Architecture:** Add a pure adapter-claim check beside adapter validation, then feed the adapters already loaded by repository validation into each manifest check. Keep filesystem parsing outside the pure rule.

**Tech Stack:** Node.js 24, TypeScript 5.9, built-in `node:test`.

**Spec:** `docs/archive/2026-09-14-workflow-exchange-proof/change-spec.md`

## Global Constraints

- The project contract and templates override external workflow artifact locations.
- Use strict red-green TDD and observe the failing test before production changes.
- `certified: false` remains valid without a matching certified adapter.
- Error messages distinguish missing adapter, candidate adapter, and commit mismatch.
- Finish with `npm run verify` and a Conventional Commit.

---

### Task 1: Enforce adapter certification claims

**Files:**

- Modify: `scripts/workflow/adapters.ts`
- Modify: `scripts/workflow/check-contract.ts`
- Modify: `scripts/workflow/contract.test.ts`
- Modify: `docs/product/exchangeable-development-workflow.md`
- Modify: `docs/archive/2026-09-14-workflow-exchange-proof/issues/04-superpowers-adapter-certification.md`

**Interfaces:**

- Consumes: `WorkflowManifest.workflow.adapter`, `WorkflowManifest.workflow.version`, and `WorkflowManifest.workflow.certified`.
- Produces: `checkCertificationClaim(manifest, adapters): string[]` or an equivalently named pure public function.

- [x] **Step 1: Write failing behavior tests**

Add table-driven tests with literal expected error fragments for missing adapter, candidate adapter, and commit mismatch. Add passing cases for `certified: false` and a matching certified adapter.

- [x] **Step 2: Run the focused test and verify RED**

Run `node --test scripts/workflow/contract.test.ts`. Confirm failure is caused by the missing certification-claim behavior.

- [x] **Step 3: Implement the minimal pure rule**

Only enforce adapter lookup and commit equality when the manifest claims `certified: true`. Return distinct Japanese errors for each failure mode.

- [x] **Step 4: Connect repository validation**

Load and validate `adapters/*.json` once, retain valid parsed adapters, and apply the pure certification-claim rule to every work manifest.

- [x] **Step 5: Verify GREEN and regressions**

Run `node --test scripts/workflow/contract.test.ts`, then `npm run verify`.

- [x] **Step 6: Update durable and working documentation**

Document the enforced relationship in the current product spec. Check every satisfied acceptance criterion in the experiment ticket and record the exact verification commands and results.

- [x] **Step 7: Commit**

Commit all branch changes with `feat: verify workflow certification claims`.
