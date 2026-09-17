---
status: Accepted
supersedes: ["0006"]
approvedBy: "repository-user"
approvedAt: "2026-09-17T02:00:21Z"
approvedBodySha256: "110ee8884eaec1161fb2ed3bd96e9c2afda91adbe4d052962e4c3904bc75a4bd"
---

# ADR-0007: 公開パッケージとCLIをhidden-to-tareへ変更する

## 背景

ADR-0006で初期セットアップCLIを公開npmパッケージとして配布した。現在のGitHubリポジトリは`hidden-no-tare`、npmパッケージは`create-project-work-flow`、CLIとフレームワーク名は`project-work-flow`であり、公開名が分かれている。npmのinitializer規約では、利用者が`npm create hidden-to-tare`を実行するには`create-hidden-to-tare`パッケージが必要になる。

## 決定と理由

GitHubリポジトリとフレームワークの公開名を`hidden-to-tare`へ統一し、npmパッケージを`create-hidden-to-tare`、実行バイナリを`hidden-to-tare`とする。これにより、利用者向けの初期セットアップコマンドを`npm create hidden-to-tare@<version>`として名前を揃えられる。

比較した代案は、既存の`create-project-work-flow`を維持する案と、npmパッケージを`hidden-to-tare`として`npm exec`だけで実行する案である。前者はリポジトリ名との不一致を残し、後者は`npm create hidden-to-tare`というinitializerの自然な利用方法を提供できない。`create-hidden-to-tare`を採用するとnpmの`create`規約に従える一方、旧パッケージからの自動移行と互換期間は持たず、公開パッケージの削除と利用者への切り替えが必要になる。

## 影響

- 新しい固定版は`create-hidden-to-tare`として公開し、初期化は`npm create hidden-to-tare@<version>`、更新は`npm exec --package create-hidden-to-tare@<version> -- hidden-to-tare update`で行う。
- セットアップマニフェスト、テンプレート、README、現行仕様は新しいパッケージ名とCLI名を記録する。
- `create-project-work-flow`は新パッケージの公開・動作確認後に削除するため、旧コマンドは継続提供しない。
- 公開名変更は公開APIとサプライチェーンに影響するため、移行コミットとnpmレジストリの検証を完了条件に含める。
