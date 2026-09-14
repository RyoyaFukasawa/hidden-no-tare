# Adapter lifecycle experiment

Scope: isolated contract fixtures using real adapter records and historical outputs. Real workflow human approval remains separate.

## matt-pocock-engineering

workflow pin: d574778f94cf620fcc8ce741584093bc650a61d3
historical output commit: ef242ac855ef531ebedcee8071a8578d0f178d94

content preserved: true

source and archived SHA-256: b048ce056f084e8795581641c22124df8b78cae8c8836a88e37977413b1e6039

### prepare

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/prepare.ts boundary 文書移動fixture Matt Pocock engineering flow d574778f94cf620fcc8ce741584093bc650a61d3 matt-pocock-engineering
exit status: 0

~~~text
researching状態のmanifestを作成しました: /private/var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/adapter-lifecycle-uvTw8Q/.workflow/changes/boundary.json
~~~

### review must stop

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 1

~~~text
manifestをstate: completeにしてからfinalizeしてください
~~~

review refused with manifest retained: true

### missing evidence

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 1

~~~text
> project-work-flow@0.1.0 verify:contract
> node scripts/workflow/check-contract.ts && node scripts/completion-check/check-work-items.ts && node scripts/adr/check.ts && node scripts/docs-check/check.ts markdown && node scripts/docs-check/check.ts links

Workflow contract: 1 errors
ERROR .workflow/changes/boundary.json: 検証証跡がありません: document-copy
~~~

missing evidence refused: true

### unassigned output

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 1

~~~text
> project-work-flow@0.1.0 verify:contract
> node scripts/workflow/check-contract.ts && node scripts/completion-check/check-work-items.ts && node scripts/adr/check.ts && node scripts/docs-check/check.ts markdown && node scripts/docs-check/check.ts links

Workflow contract: 0 errors
Work items: 3 checked, 0 errors
ADRと一覧の検証に成功しました。
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: :AGENTS.md :docs/adr/0001-exchangeable-workflow-contract.md :docs/adr/README.md :docs/agents/domain.md :docs/archive/2026-09-14-exchangeable-workflow/change-spec.md :docs/archive/2026-09-14-exchangeable-workflow/issues/01-repair-root-paths.md :docs/archive/2026-09-14-exchangeable-workflow/issues/02-workflow-contract.md :docs/archive/2026-09-14-exchangeable-workflow/original-plan.md :docs/archive/adapter-lifecycle-fixture/change-spec.md :docs/archive/adapter-lifecycle-fixture/issues/copy.md :docs/product/exchangeable-development-workflow.md :docs/templates/README.md :docs/templates/adr.md :docs/templates/change-spec.md :docs/templates/product-spec.md :docs/templates/ticket.md
Linting: 16 files
Summary: 0 issues in 0 files
🔍 19 Total (in 1ms) 🔗 17 Unique ✅ 12 OK 🚫 0 Errors 👻 7 Excluded


> project-work-flow@0.1.0 verify:project
> node scripts/workflow/verify-project.ts

Project check: document-copy-fixture
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected

  [
    'spec.md',
+   'unassigned.md'
  ]

    at file:///private/var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/adapter-lifecycle-uvTw8Q/check-copy.mjs:4:8
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:643:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: [ 'spec.md', 'unassigned.md' ],
  expected: [ 'spec.md' ],
  operator: 'deepStrictEqual',
  diff: 'simple'
}

Node.js v24.19.0
~~~

unassigned output refused and preserved: true

### complete fixture

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 0

~~~text
> project-work-flow@0.1.0 verify:contract
> node scripts/workflow/check-contract.ts && node scripts/completion-check/check-work-items.ts && node scripts/adr/check.ts && node scripts/docs-check/check.ts markdown && node scripts/docs-check/check.ts links

Workflow contract: 0 errors
Work items: 3 checked, 0 errors
ADRと一覧の検証に成功しました。
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: :AGENTS.md :docs/adr/0001-exchangeable-workflow-contract.md :docs/adr/README.md :docs/agents/domain.md :docs/archive/2026-09-14-exchangeable-workflow/change-spec.md :docs/archive/2026-09-14-exchangeable-workflow/issues/01-repair-root-paths.md :docs/archive/2026-09-14-exchangeable-workflow/issues/02-workflow-contract.md :docs/archive/2026-09-14-exchangeable-workflow/original-plan.md :docs/archive/adapter-lifecycle-fixture/change-spec.md :docs/archive/adapter-lifecycle-fixture/issues/copy.md :docs/product/exchangeable-development-workflow.md :docs/templates/README.md :docs/templates/adr.md :docs/templates/change-spec.md :docs/templates/product-spec.md :docs/templates/ticket.md :rejected-output.md
Linting: 17 files
Summary: 0 issues in 0 files
🔍 19 Total (in 1ms) 🔗 17 Unique ✅ 12 OK 🚫 0 Errors 👻 7 Excluded


> project-work-flow@0.1.0 verify:project
> node scripts/workflow/verify-project.ts

Project check: document-copy-fixture
Exact source bytes retained; no unassigned outputs
完了契約を確認し、一時manifestを削除しました: boundary
~~~

successful finalize: true

### verify after finalize

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/verify.ts
exit status: 0

~~~text
Workflow contract: 0 errors
Work items: 3 checked, 0 errors
ADRと一覧の検証に成功しました。
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: :AGENTS.md :docs/adr/0001-exchangeable-workflow-contract.md :docs/adr/README.md :docs/agents/domain.md :docs/archive/2026-09-14-exchangeable-workflow/change-spec.md :docs/archive/2026-09-14-exchangeable-workflow/issues/01-repair-root-paths.md :docs/archive/2026-09-14-exchangeable-workflow/issues/02-workflow-contract.md :docs/archive/2026-09-14-exchangeable-workflow/original-plan.md :docs/archive/adapter-lifecycle-fixture/change-spec.md :docs/archive/adapter-lifecycle-fixture/issues/copy.md :docs/product/exchangeable-development-workflow.md :docs/templates/README.md :docs/templates/adr.md :docs/templates/change-spec.md :docs/templates/product-spec.md :docs/templates/ticket.md :rejected-output.md
Linting: 17 files
Summary: 0 issues in 0 files
🔍 19 Total (in 1ms) 🔗 17 Unique ✅ 12 OK 🚫 0 Errors 👻 7 Excluded

Project check: document-copy-fixture
Exact source bytes retained; no unassigned outputs
Verification passed (contract, project checks, work items, ADRs and Markdown/links).
~~~

verification after finalization: true

### hostile preflight

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/inspect-skill.ts /var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/adapter-lifecycle-uvTw8Q/hostile
exit status: 1

~~~text
Skill inspection: 2 findings
REVIEW SKILL.md: 破壊的削除
REVIEW SKILL.md: 秘密情報へのアクセス
~~~

hostile preflight refused: true

all lifecycle commands isolated: true

## superpowers-engineering

workflow pin: b36e0829c6d0140e93cfef2ca599b1b07d4a7797
historical output commit: 6f7134a206f01dac07f5e12545f76d13095c76d8

content preserved: true

source and archived SHA-256: 3f1109b8fcbe472bb13062dff794e009ce8af65ecfed2057e79f88bd956a8894

### prepare

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/prepare.ts boundary 文書移動fixture Superpowers engineering flow b36e0829c6d0140e93cfef2ca599b1b07d4a7797 superpowers-engineering
exit status: 0

~~~text
researching状態のmanifestを作成しました: /private/var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/adapter-lifecycle-bd4J07/.workflow/changes/boundary.json
~~~

### review must stop

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 1

~~~text
manifestをstate: completeにしてからfinalizeしてください
~~~

review refused with manifest retained: true

### missing evidence

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 1

~~~text
> project-work-flow@0.1.0 verify:contract
> node scripts/workflow/check-contract.ts && node scripts/completion-check/check-work-items.ts && node scripts/adr/check.ts && node scripts/docs-check/check.ts markdown && node scripts/docs-check/check.ts links

Workflow contract: 1 errors
ERROR .workflow/changes/boundary.json: 検証証跡がありません: document-copy
~~~

missing evidence refused: true

### unassigned output

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 1

~~~text
> project-work-flow@0.1.0 verify:contract
> node scripts/workflow/check-contract.ts && node scripts/completion-check/check-work-items.ts && node scripts/adr/check.ts && node scripts/docs-check/check.ts markdown && node scripts/docs-check/check.ts links

Workflow contract: 0 errors
Work items: 3 checked, 0 errors
ADRと一覧の検証に成功しました。
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: :AGENTS.md :docs/adr/0001-exchangeable-workflow-contract.md :docs/adr/README.md :docs/agents/domain.md :docs/archive/2026-09-14-exchangeable-workflow/change-spec.md :docs/archive/2026-09-14-exchangeable-workflow/issues/01-repair-root-paths.md :docs/archive/2026-09-14-exchangeable-workflow/issues/02-workflow-contract.md :docs/archive/2026-09-14-exchangeable-workflow/original-plan.md :docs/archive/adapter-lifecycle-fixture/change-spec.md :docs/archive/adapter-lifecycle-fixture/issues/copy.md :docs/product/exchangeable-development-workflow.md :docs/templates/README.md :docs/templates/adr.md :docs/templates/change-spec.md :docs/templates/product-spec.md :docs/templates/ticket.md
Linting: 16 files
Summary: 0 issues in 0 files
🔍 19 Total (in 1ms) 🔗 17 Unique ✅ 12 OK 🚫 0 Errors 👻 7 Excluded


> project-work-flow@0.1.0 verify:project
> node scripts/workflow/verify-project.ts

Project check: document-copy-fixture
node:internal/modules/run_main:107
    triggerUncaughtException(
    ^

AssertionError [ERR_ASSERTION]: Expected values to be strictly deep-equal:
+ actual - expected

  [
    'spec.md',
+   'unassigned.md'
  ]

    at file:///private/var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/adapter-lifecycle-bd4J07/check-copy.mjs:4:8
    at ModuleJob.run (node:internal/modules/esm/module_job:439:25)
    at async node:internal/modules/esm/loader:643:26
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:101:5) {
  generatedMessage: true,
  code: 'ERR_ASSERTION',
  actual: [ 'spec.md', 'unassigned.md' ],
  expected: [ 'spec.md' ],
  operator: 'deepStrictEqual',
  diff: 'simple'
}

Node.js v24.19.0
~~~

unassigned output refused and preserved: true

### complete fixture

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/finalize.ts boundary
exit status: 0

~~~text
> project-work-flow@0.1.0 verify:contract
> node scripts/workflow/check-contract.ts && node scripts/completion-check/check-work-items.ts && node scripts/adr/check.ts && node scripts/docs-check/check.ts markdown && node scripts/docs-check/check.ts links

Workflow contract: 0 errors
Work items: 3 checked, 0 errors
ADRと一覧の検証に成功しました。
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: :AGENTS.md :docs/adr/0001-exchangeable-workflow-contract.md :docs/adr/README.md :docs/agents/domain.md :docs/archive/2026-09-14-exchangeable-workflow/change-spec.md :docs/archive/2026-09-14-exchangeable-workflow/issues/01-repair-root-paths.md :docs/archive/2026-09-14-exchangeable-workflow/issues/02-workflow-contract.md :docs/archive/2026-09-14-exchangeable-workflow/original-plan.md :docs/archive/adapter-lifecycle-fixture/change-spec.md :docs/archive/adapter-lifecycle-fixture/issues/copy.md :docs/product/exchangeable-development-workflow.md :docs/templates/README.md :docs/templates/adr.md :docs/templates/change-spec.md :docs/templates/product-spec.md :docs/templates/ticket.md :rejected-output.md
Linting: 17 files
Summary: 0 issues in 0 files
🔍 19 Total (in 1ms) 🔗 17 Unique ✅ 12 OK 🚫 0 Errors 👻 7 Excluded


> project-work-flow@0.1.0 verify:project
> node scripts/workflow/verify-project.ts

Project check: document-copy-fixture
Exact source bytes retained; no unassigned outputs
完了契約を確認し、一時manifestを削除しました: boundary
~~~

successful finalize: true

### verify after finalize

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/verify.ts
exit status: 0

~~~text
Workflow contract: 0 errors
Work items: 3 checked, 0 errors
ADRと一覧の検証に成功しました。
markdownlint-cli2 v0.23.2 (markdownlint v0.41.1)
Finding: :AGENTS.md :docs/adr/0001-exchangeable-workflow-contract.md :docs/adr/README.md :docs/agents/domain.md :docs/archive/2026-09-14-exchangeable-workflow/change-spec.md :docs/archive/2026-09-14-exchangeable-workflow/issues/01-repair-root-paths.md :docs/archive/2026-09-14-exchangeable-workflow/issues/02-workflow-contract.md :docs/archive/2026-09-14-exchangeable-workflow/original-plan.md :docs/archive/adapter-lifecycle-fixture/change-spec.md :docs/archive/adapter-lifecycle-fixture/issues/copy.md :docs/product/exchangeable-development-workflow.md :docs/templates/README.md :docs/templates/adr.md :docs/templates/change-spec.md :docs/templates/product-spec.md :docs/templates/ticket.md :rejected-output.md
Linting: 17 files
Summary: 0 issues in 0 files
🔍 19 Total (in 1ms) 🔗 17 Unique ✅ 12 OK 🚫 0 Errors 👻 7 Excluded

Project check: document-copy-fixture
Exact source bytes retained; no unassigned outputs
Verification passed (contract, project checks, work items, ADRs and Markdown/links).
~~~

verification after finalization: true

### hostile preflight

command: /Users/ryoyafukasawa/.local/share/mise/installs/node/24.19.0/bin/node scripts/workflow/inspect-skill.ts /var/folders/l0/0n80njsj3w72t0s54ygy36z40000gn/T/adapter-lifecycle-bd4J07/hostile
exit status: 1

~~~text
Skill inspection: 2 findings
REVIEW SKILL.md: 破壊的削除
REVIEW SKILL.md: 秘密情報へのアクセス
~~~

hostile preflight refused: true

all lifecycle commands isolated: true
