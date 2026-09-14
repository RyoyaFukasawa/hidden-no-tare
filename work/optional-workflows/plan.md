# 独立した完了契約の実装計画

> 実行は合意済みのimplement・tddを使用する。プロジェクトの形式と完了条件を優先する。

**目的:** 外部SKILLを登録せず使える必須契約と、安全な完了判定を提供する。

**構成:** JSON入力境界で構造を検証し、完了判定で分類とGit状態を検査する。
登録・認証を明示的な任意入口へ分ける。固有の利用例テストは通常テストから独立させる。

**技術:** Node.js 24.12.0以上、TypeScript、node:test、Git、lychee。

**仕様:** [変更仕様](spec.md)。

## 共通制約

新規リポジトリが主対象。緊急例外は既定7日・最大30日。文書整理は承認前。
通常の検証から利用例を分離しても受け入れ条件は緩和しない。

## 1: 登録なしで使える契約

対象: scripts/workflow/{contract,prepare,check-contract,adapters}.ts、契約テスト、package.json。
公開境界: createManifest、checkWorkflowRepository、prepare CLI。

- [ ] `createManifest('sample', '概要')`を検証する失敗テストを追加する。
- [ ] `node --test --test-name-pattern='登録なし' scripts/workflow/contract.test.ts`でREDを確認する。
- [ ] workflowを任意にし、認証照合を任意コマンドへ分離する。比較実験はexamples側へ移す。
- [ ] 同じテストでGREEN、型検証を確認する。

## 2: 不正なJSONを拒否する契約

対象: scripts/workflow/{contract,io,schema}.tsと契約テスト。
公開境界: checkConfig(unknown)、checkManifest(unknown, config)、loadConfig/loadManifest。

- [ ] 欠落したtraits、文字列のclassificationConfirmed、誤った配列を与え、拒否を確認するテストを追加する。
- [ ] 対象テストのREDを確認し、構造検証を実装してGREENを確認する。
- [ ] riskがnullのcompleteを拒否するテストを追加し、RED→GREENを確認する。

## 3: 承認したコミットだけを完了する

対象: scripts/workflow/{check-contract,finalize}.ts、scripts/verify.ts、契約テスト。
公開境界: 一時Git内のcheckWorkflowRepository、verify、finalize CLI。

- [ ] 承認済みHEADで追跡ファイルを書き換え、未コミット変更エラーになるテストを追加する。
- [ ] RED後にGit statusのNUL区切りを検査し、staged・untracked・renameも順に検証する。
- [ ] 有効な未追跡マニフェストだけを例外にし、追跡済み・不正・別用途のJSONを拒否する。
- [ ] 検証がファイルを生成するCLIケースをREDにし、検証後にも承認境界を確認してGREENにする。

## 4: 新規利用者への導入案内

対象: scripts/workflow/diagnose.ts、scripts/docs-check/check.ts、README.md、AGENTS.md、docs/product、docs/adr。

- [ ] 診断が対象外まで安全と表示しないテストを追加し、RED→GREENを確認する。
- [ ] lycheeがないPATHでCLIを起動し、導入案内のある失敗になるテストを追加してRED→GREENを確認する。
- [ ] 必要ツールと利用例の任意性、承認の順序を文書化する。新ADRで0001全体を置き換え、一覧を生成する。

## 5: レビュー・整理・承認依頼

- [ ] npm run verifyと任意利用例の検証を実行する。利用例なしの複製でもverifyを実行する。
- [ ] code-reviewでmain a244af6との差分を仕様・規約の両面から独立レビューする。
- [ ] 指摘を解消し、証跡と受け入れ条件を記録して本書・仕様・チケットをarchiveへ移す。
- [ ] 整理後にnpm run verifyを実行し、feat: prefixでコミットする。
- [ ] コミットSHAを示して人間承認を求める。承認まではstate: reviewとしfinalizeしない。
