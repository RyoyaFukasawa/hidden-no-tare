---
status: done
---

# 01: 新規Gitリポジトリ向け初期セットアップCLIを追加する

## 実現する振る舞い

新規Gitリポジトリで公開npmパッケージの`create-project-work-flow`を実行すると、利用者が選択したnpmまたはpnpmに合わせて、開発ワークフローの設定、テンプレート、検証入口、Node.js基盤を安全に生成できる。既存コードを含むリポジトリでは停止し、利用者の変更を上書きしない。

## 依存チケット

なし（すぐに着手可能）。ただし、ADR-0006の本文承認後に本実装へ移行する。

## 受け入れ条件

- [x] GitのHEADがあり、許可されたREADME/.gitignoreだけの新規リポジトリを初期化できる
- [x] 許可されない既存ファイル、HEADなし、所有ファイルの変更を検出して停止する
- [x] npmとpnpmを検出または選択でき、`--install`指定時だけ依存関係を導入する
- [x] CLI引数、対話入力、プロジェクト名初期値、`--dry-run`が仕様どおり動作する
- [x] `AGENTS.md`、`workflow.config.json`、テンプレート、検証スクリプト、package scripts・依存関係を生成できる
- [x] `projectChecks`を空で生成でき、生成後の`verify`と`workflow:prepare`が成功する
- [x] 同じ状態の再実行は成功扱いになり、差分がある再実行は上書きせず停止する
- [x] 固定版npmパッケージから所有ファイルだけを更新でき、利用者の変更や新規パスの衝突があれば停止する
- [x] npm / pnpm、install有無、衝突、失敗時ロールバックをfixtureで検証する
- [x] 初期セットアップの対象外と利用手順を現行仕様・READMEへ反映する

## 検証結果

実装後の検証結果:

- `npm run test:setup`: 15件成功。
- `npm run typecheck`: 成功。
- `npm run setup:build`: 成功。
- `npm test`: 230件成功。
- `npm run verify:contract`: 成功。
- `npm run verify`: 成功。
- `RUN_NPM_PACKAGE_FIXTURE=1 NPM_CONFIG_FETCH_RETRIES=0 NPM_CONFIG_FETCH_TIMEOUT=5000 npm run test:setup:package`: 一時レジストリ経由の固定版`npm create`・生成後`verify`/`workflow:prepare`・固定版`npm exec ... update --dry-run`が成功。
- `npm pack --dry-run ./packages/create-project-work-flow`: 公開内容を確認。
