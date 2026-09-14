# ワークフロー比較と完了前レビュー

## 実装実験の記録

| フロー | 実装コミット | 当時の検証 |
| --- | --- | --- |
| Matt Pocock | `ef242ac855ef531ebedcee8071a8578d0f178d94` | チケットに55テスト成功を記録 |
| Superpowers | `6f7134a206f01dac07f5e12545f76d13095c76d8` | チケットに52テスト成功を記録 |

共通基点は`bda2223`。同じ課題の実装成果物はGit履歴に残っている。
最新のコードではmainの境界検証修正を取り込み、現在の検証結果を別に記録する。
実装成果物の存在と全SKILL工程の実行証明は区別する。

原本チケットを[matt版](evidence/matt-implementation-ticket.txt)と
[Superpowers版](evidence/superpowers-implementation-ticket.txt)に保存した。
それぞれ上記コミットのissue.mdそのもので、Matt版の17件／55件の検証と二軸レビュー、
Superpowers版の14件／52件の検証を追跡できる。これらは当時の未完了状態を含む
証跡のスナップショットであり、現在の完了チケットとして扱わない。

## 保存と変換の対応

変更仕様の原文を各実装コミットの
`work/experiments/adapter-certification/change-spec.md`から取り出し、
`scripts/workflow/fixtures/{matt,superpowers}-change-spec.md`に保存した。
両ファイルは元のGit blobとバイト単位で同じである。fixtureは通常cloneでも再実行でき、
過去の実験ブランチを実行時に必要としない。

| 対象 | 実験で行う変換 | 保持を検査する情報 |
| --- | --- | --- |
| 変更仕様 | 元の出力から隔離repoのarchiveへコピー | 原文全体とSHA-256 |
| fixtureチケット | プロジェクト形式でarchiveに保存 | 条件・検証根拠・done形式 |
| lifecycle | 各実adapterでprepareからfinalizeへ接続 | 完了ゲートとmanifest削除 |

## 再実行

`node scripts/workflow/adapter-certification-harness.ts work/experiments/adapter-certification/lifecycle-results.md`

実行結果は[lifecycle-results.md](lifecycle-results.md)に、コマンド・終了コードとともに保存する。
一時Git repoに本物の検証CLIを配置して次を実行する。

- reviewのままfinalizeすると拒否される。
- completeでも検証証跡を欠けば拒否され、manifestが残る。
- fixtureのproject checkが未配置出力を検出すると拒否され、出力とmanifestが残る。
- 正常時はfinalizeがmanifestを削除し、その後のverifyも通る。
- 敵対的な命令を含む導入候補はinspect-skillが指摘し、接続前に停止する。

未配置出力の検査はこのfixtureのproject checkである。あらゆるSKILL出力の
意味的欠落を汎用CLIが自動検出するという主張ではない。
fixtureのreviewは通常リスクの文書保存テスト用データであり、
今回の高リスク実作業に対する人間承認を代用しない。

## レビュー結果と残作業

以前のハーネスには、ファイル存在を工程実行とみなす判定、researching状態を
正常完了とみなす判定、作業中repoのfinalizeをテストから呼ぶ不具合があった。
これらの旧認証結果は撤回した。旧fixtureはGit履歴に残るが現行証跡には使用しない。

修正版の独立Standardsレビューは、隔離したlifecycle境界実験の範囲で指摘なし。
Specレビューに従い、過去の実装記録と今回の境界テストの範囲を分けて記載した。

実作業のmanifestはreview、adapterはcandidateである。
人間が確定コミットを承認した後に実作業のfinalizeを実行し、両方の完了を確認して
上位チケットと完了文書をarchiveへ整理する。現時点では全フロー認証完了と報告しない。
