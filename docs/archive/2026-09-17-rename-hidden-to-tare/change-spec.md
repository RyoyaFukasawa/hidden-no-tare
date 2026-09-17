# hidden-to-tareへの公開名変更

## 課題

リポジトリは`hidden-no-tare`、npmパッケージは`create-project-work-flow`という別の名前で公開されている。利用者がプロジェクトを識別し、初期セットアップを実行するときに、名前の対応を覚える必要がある。

## 解決策

リポジトリ、フレームワーク名、CLI名を`hidden-to-tare`へ統一する。npmの`npm create <name>`規約に合わせ、公開パッケージは`create-hidden-to-tare`とし、利用者は`npm create hidden-to-tare@<version>`で固定版を実行する。既存の`create-project-work-flow`公開物は新しい公開物の動作確認後に削除する。

## ユーザーストーリー

1. 開発者として、リポジトリとCLIの名前を一致させるために、`hidden-to-tare`という名前でプロジェクトを識別したい。
2. 開発者として、別プロジェクトへ初期セットアップを導入するために、`npm create hidden-to-tare@<version>`を実行したい。
3. 開発者として、更新時にも同じ名前を使うために、`npm exec --package create-hidden-to-tare@<version> -- hidden-to-tare update`を実行したい。
4. 開発者として、既存の導入契約を壊さないために、新パッケージ公開後に初期化・更新・検証が成功したことを確認したい。

## 実装判断

- npmのinitializer規約に合わせ、パッケージ名は`create-hidden-to-tare`、実行バイナリは`hidden-to-tare`とする。
- ルートのプロジェクト名、セットアップマニフェストのフレームワーク名、テンプレート内の導入・更新手順を`hidden-to-tare`へ変更する。
- パッケージの固定版、テンプレートの所有ハッシュ、再実行・更新時の利用者変更検出、原子的な展開とロールバックの契約は維持する。
- 旧パッケージは新パッケージの公開とレジストリ検証が完了した後に削除する。旧パッケージの利用者向け互換期間は設けない。
- GitHubリポジトリを`hidden-no-tare`から`hidden-to-tare`へ変更する。GitHubのリポジトリ移転後にリモートURLとREADMEのリンクを確認する。

## テスト方針

- package metadata、CLIヘルプ、初期化、更新、再実行、利用者変更の停止を新しいパッケージ名とCLI名で検証する。
- 公開前に`npm pack --dry-run`で`create-hidden-to-tare`の同梱内容を確認する。
- 公開後にレジストリから`npm create hidden-to-tare@<version>`相当のCLIを取得し、ヘルプと新規リポジトリ初期化を確認する。
- 既存の`npm run verify`、型検査、テスト、ドキュメント検査を実行する。

## 対象外

- 新規リポジトリのみを対象とする初期セットアップの適用範囲変更。
- `projectChecks`、接続、外部SKILLの設計変更。
- 旧パッケージから新パッケージへの自動移行処理。

## 補足

`npm create hidden-to-tare`の実体はnpmの規約により`create-hidden-to-tare`パッケージを取得する。パッケージ名と利用者向けコマンドを混同しないよう、READMEと現行仕様に両方を記載する。
