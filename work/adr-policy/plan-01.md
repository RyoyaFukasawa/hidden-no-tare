# ADR本文承認と移行 Implementation Plan

> 実行は利用者指定のMatt系implement・tddを使う。外部手順よりプロジェクト契約を優先する。

**Goal:** 01の草案・本文承認検証と承認済み移行を完結させる。

**Architecture:** ADR検証器で状態、本文ハッシュ、承認メタデータを一元検査する。
既存CLIの終了コードと生成一覧を維持し、依存マニフェストとの接続は02に残す。

**Tech Stack:** Node.js >=24.12.0、TypeScript、node:test、標準crypto、Git。

**Spec:** [変更仕様](spec.md)、[チケット01](issues/01-adr-approval-and-migration.md)。

## Global Constraints

- テスト境界は合意済みのADR検証・verify CLI。実際の一時Gitリポジトリを使用する。
- 新ADR本文と移行案は利用者が選択肢1で承認済み。本文は一切変えない。
- 承認記録日時は承認応答を確認したUTC時刻を記録する。最終SHA承認とは別扱い。
- 既存の参照不備・循環・一覧更新漏れ検出は維持する。旧ADRの承認記録は創作しない。
- 高リスクの通常変更。02は未着手とする。mainへの反映・push・finalizeは行わない。

## Task 1: 草案の作成と検証

変更：`scripts/adr/adr.ts`、`scripts/adr/adr.test.ts`。
インターフェース：`run('generate' | 'check')`は維持。

- [x] 一時Git fixtureにDraftを配置し、generate・checkが成功するテストを追加。

```ts
f.put('0001-draft.md', adr('0001', 'Draft'));
assert.equal(f.run('generate').status, 0);
assert.equal(f.run('check').status, 0);
```

- [x] `node --test --test-name-pattern='草案' scripts/adr/adr.test.ts`で不正状態による失敗を見る。
- [x] 状態集合にDraftを追加。テストを再実行し、既存テストも通す。

## Task 2: 永続承認と本文一致

変更：同じADR実装・テストファイル。
メタデータはフラットな`approvedBy`・`approvedAt`・`approvedBodySha256`とし、
各値をJSON文字列として解析する。既存の未知キー・重複キー拒否を維持する。
日時は実在するUTC ISO日時、SHAは小文字64桁。Draftには承認記録を付けない。
Accepted・Superseded・Deprecatedには3項目を必須とする。

本文はfrontmatterの終了行の改行直後からEOFまで。UTF-8のバイト列をSHA-256で比較する。
空行・コメント・末尾改行・CRLFを正規化しない。タイトル解析とハッシュ計算は区別する。

- [x] 固定本文と独立に計算した既知SHAの承認済みfixtureで成功テストを追加し、失敗を見る。

```ts
const body = '\n# ADR-0001: Approval fixture\n\nBody.\n';
const hash = 'de79e697f08e2691c08eb1356da8a5024422c8e54756c72cd17ee9843b6e81c3';
```

- [x] メタデータの読み取りと形式検証を実装し、成功テストを通す。
- [x] Acceptedのみの記録を拒否する失敗テストを追加し、承認必須を実装する。
- [x] 本文の誤字・空白・リンク・コメント・改行変更を拒否するテストを一件ずつ追加する。
  ハッシュ比較を実装し、失敗時に一覧と原文を保持することを検証する。
- [x] 欠落、空値、型不正、重複、未知キー、不正日時、ハッシュ形式をテーブルで検証する。
- [x] 状態・承認メタデータだけの有効な更新は本文不一致にならないことを確認する。
- [x] `npm run typecheck`と`node --test scripts/adr/adr.test.ts`を実行する。

## Task 3: 草案の置き換え関係とverify

変更：ADR実装・テスト、`scripts/workflow/repository.test.ts`。
Draftのsupersedesは提案関係であり、旧ADRをまだSupersededにしない。
正式な後継欄には非Draftだけを表示する。草案を含む循環・自己参照・欠落は拒否する。
Draftを他ADRの置き換え対象にはしない。

- [x] Acceptedとそれを置き換えるDraftの共存成功テストを追加して失敗を見る。
- [x] 提案と成立済みの参照を区別し、承認後の新Accepted＋旧Supersededの成功を確認する。
- [x] Draft対象の置き換え拒否テストを追加して最小修正する。
- [x] 既存不正グラフテストに有効なfixture承認を付け、診断が承認不備に隠れないよう確認する。
- [x] 実Git fixtureのresearchingで有効草案を置き、`scripts/verify.ts`の成功を確認する。
- [x] 形式不正草案・承認不備・本文変更でverifyが拒否し、ファイルを保持することを確認する。

```ts
const result = spawnSync(process.execPath, ['scripts/verify.ts'], {
  cwd: root, encoding: 'utf8',
});
assert.equal(result.status, 0, result.stdout + result.stderr);
```

## Task 4: 承認済みの移行と文書同期

変更：`docs/adr/`、`docs/product/exchangeable-development-workflow.md`、
`docs/templates/adr.md`、`docs/templates/README.md`、`docs/agents/domain.md`、`AGENTS.md`、`README.md`。

- [x] 承認済み0004本文をそのまま配置し、承認者・記録日時・SHAをメタデータへ記録する。
- [x] 移行案どおり0001〜0003を削除し、現在の仕様リンクを0004へ更新する。
- [x] 3条件、曖昧なら作成前確認、Draftの利用、本文承認手順、再承認・ハッシュ範囲を記載する。
- [x] 依存する実装停止は指示・レビューで運用し、CLIへの接続は02であると明示する。
- [x] `npm run adr:generate`を実行し、旧コミットの内容が`git show`で読めることを確認する。
- [x] 作業文書のMarkdownとリンク、`npm run verify`を実行する。

## Task 5: 独立レビュー・整理・コミット

- [ ] code-reviewで変更開始点`5de52d991601aa0e7994bba6c4b6d36d4d08916f`からレビューする。
- [ ] Standards・Specの独立レビューを並列で実施し、指摘はTDDで修正する。
- [ ] 達成項目だけチェックし、01をdoneにして完了文書をarchiveへ移す。
  共有仕様と02は作業中として残す。参照を更新する。
- [ ] 整理後に`npm run verify`。最終SHA承認は一時マニフェストへ分離する。
- [ ] `git add`に対象を明示し、`feat: validate ADR body approvals and migrate decisions`でコミット。
- [ ] ユーザーへ結果と最終SHAを提示し、人間承認前はcomplete・finalizeにしない。
