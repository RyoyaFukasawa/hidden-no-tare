# 実worktreeの完了記録

本会話の利用者は次の両コミットと完了処理・文書整理を承認した。
承認受領の記録時刻は`2026-09-14T14:49:08Z`（UTC）。

| フロー | 承認対象HEAD | finalize | テスト |
| --- | --- | --- | --- |
| Matt | `ff32192971b41f2ddcc06c04f61102d4eaf8f33a` | 終了コード0、manifest削除 | 54成功 |
| Superpowers | `9330c4ab7de7740e9d109ad03b637a13e5a816cb` | 終了コード0、manifest削除 | 54成功 |

承認後の変更は承認記録、チケットの完了状態、文書整理である。
実装コードの承認対象HEADを保ったまま、人間レビューを記録したcomplete manifestをCLIで検証した。

## このworktreeでの実行出力

`npm run workflow:finalize -- matt-adapter-certification`

```text
✔ 空の一覧を生成でき、検証は書き換えない (238.291333ms)
✔ ID順に生成し、統合・後継・タイトルの記号を表示する (123.952708ms)
✔ ID不一致を拒否し既存一覧を保持する (114.801542ms)
✔ ID重複を拒否し既存一覧を保持する (133.109167ms)
✔ 不正な状態を拒否し既存一覧を保持する (115.179458ms)
✔ 不正なファイル名を拒否し既存一覧を保持する (117.822125ms)
✔ 空タイトルを拒否し既存一覧を保持する (127.455125ms)
✔ 欠落参照を拒否し既存一覧を保持する (118.192208ms)
✔ 自己参照を拒否し既存一覧を保持する (118.770583ms)
✔ 後継なしを拒否し既存一覧を保持する (116.140333ms)
✔ 旧状態未更新を拒否し既存一覧を保持する (174.880709ms)
✔ 循環を拒否し既存一覧を保持する (134.007125ms)
✔ 非文字列IDを拒否し既存一覧を保持する (117.752083ms)
✔ 空配列を拒否し既存一覧を保持する (125.370417ms)
✔ 重複参照を拒否し既存一覧を保持する (125.68325ms)
✔ 重複キーを拒否し既存一覧を保持する (117.349917ms)
✔ complete ticket passes and is counted (3.272916ms)
✔ active ticket permits pending criteria and empty evidence (0.479417ms)
✔ done rejects unchecked criteria and reports path (2.168709ms)
✔ archive requires done (1.957625ms)
✔ done archive passes (0.91725ms)
✔ done rejects absent or placeholder evidence (10.853792ms)
✔ required sections and title cannot be omitted (4.468459ms)
✔ unknown missing duplicate and unsupported metadata rejected (3.5655ms)
✔ criteria must be specific nonempty checkboxes (5.529208ms)
✔ duplicate status cannot hide pending criteria (0.790834ms)
✔ fenced headings cannot supply required sections (0.962166ms)
✔ unclosed fences and comments fail (1.637417ms)
✔ unrelated docs are not tickets (3.577709ms)
✔ nested tickets are checked (0.932ms)
✔ invalid UTF8 reports error (0.69575ms)
✔ CLI targets repository root regardless of cwd, sets exit code, never rewrites (122.274792ms)
✔ project template can be filled without adding mandatory draft fields (1.99825ms)
✔ duplicate acceptance headings cannot hide unchecked criteria (1.12725ms)
✔ missing frontmatter is rejected (1.293333ms)
✔ completion policy judges normalized records without a skill or Markdown (0.210542ms)
✔ 作業中は無視し、アーカイブ後に未完了を検出する (1.292875ms)
✔ 文書移動後もarchiveを含め、依存パッケージと調査メモは対象外にする (6.381208ms)
✔ 両adapterの隔離完了・拒否・無損失保存を検証する (5173.823208ms)
✔ 変更特性から必要成果物を導出する (0.74675ms)
✔ 通常変更は独立エージェントレビューで完了できる (0.208708ms)
✔ 未分類のまま本実装へ進めないがresearchingは許可する (0.130541ms)
✔ 高リスクは人間レビューと一致するHEADが必要 (0.103792ms)
✔ 失敗・未実行・証跡なしを成功扱いしない (0.087208ms)
✔ 緊急例外は期限・理由・後続チケット・承認を要求する (0.087ms)
✔ 設定は例外最大30日と重複しないproject checkを強制する (0.085ms)
✔ 認証宣言はbooleanでなければならない (0.060167ms)
✔ 秘密情報らしき値を検出する (0.1925ms)
✔ 認証済みadapterは正常・失敗・敵対テストを要求する (0.225458ms)
✔ 不正なadapter JSONを安全に構造検証する (0.161125ms)
✔ 認証宣言はadapter記録と固定commitを照合する (0.104916ms)
✔ リポジトリ検証は認証宣言の照合を適用する (89.504167ms)
✔ 敵対的な偽SKILLの破壊命令と秘密アクセスを検出する (1.044792ms)
✔ 既存プロジェクト診断は衝突を報告しファイルを変更しない (0.805208ms)
ℹ tests 54
ℹ suites 0
ℹ pass 54
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5261.599334
完了契約を確認し、一時manifestを削除しました: matt-adapter-certification
```

全stageの認証は主張せず、両adapterのcandidate状態を維持する。
