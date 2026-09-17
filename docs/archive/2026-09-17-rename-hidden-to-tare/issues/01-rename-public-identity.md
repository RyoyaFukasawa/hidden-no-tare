---
status: done
---

# 01: 公開名をhidden-to-tareへ変更する

## 実現する振る舞い

リポジトリとフレームワークの公開名を`hidden-to-tare`へ統一し、npmのinitializer規約に沿った`create-hidden-to-tare`パッケージから、`npm create hidden-to-tare@<version>`で初期セットアップを実行できる。新パッケージの公開と動作確認後に、旧`create-project-work-flow`パッケージを削除する。

## 依存チケット

なし（すぐに着手可能）。ただし、名称変更のADR本文承認後に本実装へ移行する。

## 受け入れ条件

- [x] GitHubリポジトリ名とリモートURLが`hidden-to-tare`になっている
- [x] npmパッケージ`create-hidden-to-tare`の固定版を公開できる
- [x] `npm create hidden-to-tare@<version>`で新規Gitリポジトリを初期化できる
- [x] `npm exec --package create-hidden-to-tare@<version> -- hidden-to-tare update`で更新できる
- [x] 旧`create-project-work-flow`パッケージを削除できる
- [x] `npm run verify`と追加の公開パッケージ検証が成功する

## 検証結果

- `gh repo view`で`RyoyaFukasawa/hidden-to-tare`と新URLを確認した。
- `npm view create-hidden-to-tare version dist.tarball --json`で`0.1.0`を確認した。
- 公開registryから新規Gitリポジトリへ`npm create hidden-to-tare@0.1.0`を実行し、`hidden-to-tare update --dry-run`も成功した。
- `npm view create-project-work-flow version`がunpublishedの404を返すことを確認した。
- `npm test`（237件）、`npm run typecheck`、`npm run verify`、`npm run verify:examples`、`npm run lint:docs-layout`、`npm pack --dry-run`が成功した。
