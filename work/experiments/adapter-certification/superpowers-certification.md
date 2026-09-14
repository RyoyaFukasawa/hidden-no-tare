# Superpowersアダプター候補の認証実験

`superpowers-engineering`は候補（`candidate`）のままであり、認証済みでも完了済みでもない。
この実験は、昇格前に固定ソースを実行し、契約の成功・失敗・敵対・停止条件を再現するための
証跡である。

## 再実行

```sh
node scripts/workflow/adapter-certification-harness.ts work/experiments/adapter-certification/superpowers-certification-harness.log.md
```

ハーネス本体は
[`scripts/workflow/adapter-certification-harness.ts`](../../../scripts/workflow/adapter-certification-harness.ts)
であり、生成済みの実行記録は
[`superpowers-certification-harness.log.md`](superpowers-certification-harness.log.md)に保存する。

このハーネスは以下を行う。

- 実在する固定版の`subagent-driven-development/scripts/sdd-workspace`を、現行計画に対して実行し、
  adapter ID、固定コミット、成果物の必須節と相互参照を確認する。
- 実在するadapterをfixture内だけで認証済みにした実Gitリポジトリと、候補のままの失敗fixtureを
  `checkWorkflowRepository`へ渡す。
- 破壊・秘密アクセスを指示する一時SKILLを実際の`workflow:inspect-skill` CLIで検査し、sentinelが
  作られないことを確認する。さらに不完全な現行manifestへの`workflow:finalize`が拒否され、
  manifestが残ることを確認する。

## 権限の扱い

adapterが実行時に宣言する権限は`filesystem-read`と`filesystem-write`だけである。固定ソースの
文書には、任意のローカルループバック・サーバーと明示的opt-inのブラウザー起動もあるが、
adapterがその挙動を許可するという主張ではない。詳細なコマンド、終了ステータス、結果はログを
正本とする。

## 未解決事項

この候補を認証済みに昇格するには、別途の人間レビューと完了契約の手続きが必要である。本実験は
ticketの未完了条件をチェックせず、manifestを削除せず、adapterの`certification`を更新しない。
