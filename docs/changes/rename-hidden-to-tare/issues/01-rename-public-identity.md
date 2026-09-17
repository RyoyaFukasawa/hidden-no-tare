---
status: ready-for-agent
---

# 01: 公開名をhidden-to-tareへ変更する

## 実現する振る舞い

リポジトリとフレームワークの公開名を`hidden-to-tare`へ統一し、npmのinitializer規約に沿った`create-hidden-to-tare`パッケージから、`npm create hidden-to-tare@<version>`で初期セットアップを実行できる。新パッケージの公開と動作確認後に、旧`create-project-work-flow`パッケージを削除する。

## 依存チケット

なし（すぐに着手可能）。ただし、名称変更のADR本文承認後に本実装へ移行する。

## 受け入れ条件

- [ ] GitHubリポジトリ名とリモートURLが`hidden-to-tare`になっている
- [ ] npmパッケージ`create-hidden-to-tare`の固定版を公開できる
- [ ] `npm create hidden-to-tare@<version>`で新規Gitリポジトリを初期化できる
- [ ] `npm exec --package create-hidden-to-tare@<version> -- hidden-to-tare update`で更新できる
- [ ] 旧`create-project-work-flow`パッケージを削除できる
- [ ] `npm run verify`と追加の公開パッケージ検証が成功する

## 検証結果

<!-- 実行したテスト・確認方法と結果を記載する。 -->
