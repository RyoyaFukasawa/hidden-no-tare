---
status: done
---

# 01: 配布テンプレートからフレームワーク固有ADRを除外する

## 実現する振る舞い

`npm create hidden-to-tare`で新規アプリを初期化したとき、生成先の`docs/adr/`にhidden-to-tare自身のADR本体が作られず、空のADR一覧から利用者が自分の判断を記録できる。既存導入先の更新では、利用者の既存ADRを自動削除しない。

## 依存チケット

なし（すぐに着手可能）。

## 受け入れ条件

- [x] npmテンプレートからADR-0004〜0007の本体が除外されている
- [x] npmテンプレートに空のADR一覧が含まれ、ADR検証が成功する
- [x] 配布元リポジトリのADR本体と一覧が保持されている
- [x] 既存導入先の更新で利用者の既存ADRを自動削除しない
- [x] npm pack、初期化、更新、verify、型検査、テストが成功する

## 検証結果

- `npm run typecheck`：成功。
- `npm run test:setup`：16件すべて成功。新規生成時の`docs/adr/README.md`が空一覧であること、旧0.1.0マニフェストが所有していた0004〜0007を0.1.1更新で保持し、新マニフェストから所有を外すことを確認。
- `npm test`：全テスト成功。
- `npm run verify`：契約、プロジェクト、作業項目、ADR、docs配置、Markdown、リンクの検証に成功。
- `RUN_NPM_PACKAGE_FIXTURE=1 npm run test:setup:package`：ローカルレジストリ経由のnpm create/npm exec境界テストに成功。tarballにADR一覧だけが含まれることを確認。
- `npm pack --dry-run`：`create-hidden-to-tare@0.1.1`にADR-0004〜0007本体が含まれないことを確認。
- 独立Specレビュー（`review_spec`）：PASS。
- 独立Standardsレビュー（`review_standards`）：PASS。
- 実装コミット：`f4d2f38`。
