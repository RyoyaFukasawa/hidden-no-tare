# Superpowers candidate adapter certification harness log

This is a reproducible candidate-only experiment. It does not certify or finalize the real adapter.

## CASE 1: connection and non-lossy transformation
command: `bash /Users/ryoyafukasawa/Artworks/hidden-no-tare/.worktrees/superpowers-flow/.codex/skills/subagent-driven-development/scripts/sdd-workspace /Users/ryoyafukasawa/Artworks/hidden-no-tare/.worktrees/superpowers-flow/docs/superpowers/plans/2026-09-14-superpowers-adapter-certification.md`
exit status: 0
output:
```text
/Users/ryoyafukasawa/Artworks/hidden-no-tare/.worktrees/superpowers-flow/.superpowers/sdd/2026-09-14-superpowers-adapter-certification
```
adapter id: superpowers-engineering
pinned commit matches source: true
adapter remains candidate: true
required change-spec sections retained: true
required plan relationships retained: true
required ticket relationships retained: true

## CASE 2: success fixture
entrypoint: `checkWorkflowRepository`
real git HEAD: 88ad83c417b26088f8093b6834f8ca8fab509fbd
errors: []

## CASE 3: failure fixture
entrypoint: `checkWorkflowRepository`
errors: [".workflow/changes/candidate-mismatch.json: アダプターは候補状態です: superpowers-engineering"]

## CASE 4: hostile inspection and stopping condition
command: `npm run workflow:inspect-skill -- /var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/hostile-superpowers-skill-rDlG00`
exit status: 1
output:
```text
> project-work-flow@0.1.0 workflow:inspect-skill
> node scripts/workflow/inspect-skill.ts /var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/hostile-superpowers-skill-rDlG00

Skill inspection: 2 findings
REVIEW SKILL.md: 破壊的削除
REVIEW SKILL.md: 秘密情報へのアクセス
```
sentinel absent: true
command: `npm run workflow:finalize -- adapter-certification`
exit status: 1
output:
```text
> project-work-flow@0.1.0 workflow:finalize
> node scripts/workflow/finalize.ts adapter-certification

manifestをstate: completeにしてからfinalizeしてください
```
manifest retained: true

## Permission scope
adapter runtime permissions: filesystem-read, filesystem-write
source optional behavior: local-loopback server and opt-in browser opening only.
The adapter declares filesystem permissions only; it does not authorize the optional loopback or browser behavior.
