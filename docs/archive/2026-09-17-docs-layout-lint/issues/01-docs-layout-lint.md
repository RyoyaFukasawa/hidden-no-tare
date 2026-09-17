---
status: done
---

# 01: docs直下の許可ディレクトリだけを検査するlintを追加する

## 実現する振る舞い

`docs/`直下に`adr/`、`archive/`、`product/`、`templates/`以外のエントリがある場合、docs配置lintが理由を表示して失敗する。許可された4ディレクトリだけの場合は成功し、`npm run verify`と新規プロジェクト用テンプレートの検証から利用できる。

## 依存チケット

なし（すぐに着手可能）。

## 受け入れ条件

- [x] `docs/`直下の許可外ディレクトリを検出して失敗する
- [x] `docs/`直下の通常ファイルを検出して失敗する
- [x] 許可された4ディレクトリだけで成功する
- [x] `npm run verify`からdocs配置lintを実行する
- [x] 新規プロジェクト用テンプレートにdocs配置lintとテストを含める

## 検証結果

- `npm run lint:docs-layout`が`Docs layout: 0 errors`で成功した。
- `npm test`（237件）で許可外ディレクトリ・通常ファイル・シンボリックリンクと`verify`の失敗伝播を確認した。
- `npm run verify`で`check-layout.ts`が実行され、成功した。
- 生成テンプレートへlint・テストを同梱し、`RUN_NPM_PACKAGE_FIXTURE=1 npm run test:setup:package`で確認した。
