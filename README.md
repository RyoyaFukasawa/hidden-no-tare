# Exchangeable Development Workflow

外部の開発SKILLやエージェントを交換しながら、プロジェクトに残す仕様、
受け入れ条件、検証証跡、承認、アーカイブの契約を維持するテンプレートです。

このリポジトリは開発SKILLそのものを再実装しません。外部ワークフローを
交換可能な実装として接続し、決定論的なCLIで完了条件を検証します。

## 基本コマンド

```sh
npm run workflow:prepare -- <change-id> <summary> <workflow> <commit> <adapter>
npm run workflow:inspect-skill -- <skill-directory>
npm run workflow:diagnose -- <existing-project>
npm run verify:contract
npm run verify:project
npm run verify
```

新しい変更は`researching`状態から始まります。変更特性とリスクが確定するまで、
調査と試作だけを行います。詳しい契約は
[交換可能な開発ワークフロー](docs/product/exchangeable-development-workflow.md)を参照してください。

## 文書

- [文書索引](docs/index.md)
- [設計判断](docs/adr/README.md)
- [成果物テンプレート](docs/templates/README.md)
