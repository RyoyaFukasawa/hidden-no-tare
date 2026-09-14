# 実worktreeの完了記録

本会話の利用者は次の両コミットと完了処理・文書整理を承認した。
承認受領の記録時刻は`2026-09-14T14:49:08Z`（UTC）。

| フロー | 承認対象HEAD | finalize | テスト |
| --- | --- | --- | --- |
| Matt | `ff32192971b41f2ddcc06c04f61102d4eaf8f33a` | 終了コード0、manifest削除 | 54成功 |
| Superpowers | `9330c4ab7de7740e9d109ad03b637a13e5a816cb` | 終了コード0、manifest削除 | 54成功 |

承認後に承認記録、チケットの完了状態、文書整理を反映した。
実装コードの承認対象HEADを保ったまま、人間レビューを記録したcomplete manifestをCLIで検証した。
finalize成功後、作業ディレクトリを再作成しないようテスト用CLIの既定出力先を一時領域へ変更した。

## このworktreeでの実行出力

`npm run workflow:finalize -- adapter-certification`

```text
✔ 空の一覧を生成でき、検証は書き換えない (285.6125ms)
✔ ID順に生成し、統合・後継・タイトルの記号を表示する (130.172209ms)
✔ ID不一致を拒否し既存一覧を保持する (117.533167ms)
✔ ID重複を拒否し既存一覧を保持する (126.694584ms)
✔ 不正な状態を拒否し既存一覧を保持する (113.390209ms)
✔ 不正なファイル名を拒否し既存一覧を保持する (114.542416ms)
✔ 空タイトルを拒否し既存一覧を保持する (114.927166ms)
✔ 欠落参照を拒否し既存一覧を保持する (114.999708ms)
✔ 自己参照を拒否し既存一覧を保持する (116.543417ms)
✔ 後継なしを拒否し既存一覧を保持する (114.792334ms)
✔ 旧状態未更新を拒否し既存一覧を保持する (124.861875ms)
✔ 循環を拒否し既存一覧を保持する (125.557042ms)
✔ 非文字列IDを拒否し既存一覧を保持する (113.906625ms)
✔ 空配列を拒否し既存一覧を保持する (110.827708ms)
✔ 重複参照を拒否し既存一覧を保持する (113.684083ms)
✔ 重複キーを拒否し既存一覧を保持する (114.87025ms)
✔ complete ticket passes and is counted (6.393708ms)
✔ active ticket permits pending criteria and empty evidence (0.195959ms)
✔ done rejects unchecked criteria and reports path (1.236292ms)
✔ archive requires done (0.889417ms)
✔ done archive passes (0.856792ms)
✔ done rejects absent or placeholder evidence (11.282792ms)
✔ required sections and title cannot be omitted (4.014375ms)
✔ unknown missing duplicate and unsupported metadata rejected (3.659542ms)
✔ criteria must be specific nonempty checkboxes (5.6495ms)
✔ duplicate status cannot hide pending criteria (0.877459ms)
✔ fenced headings cannot supply required sections (0.86125ms)
✔ unclosed fences and comments fail (2.652417ms)
✔ unrelated docs are not tickets (5.92ms)
✔ nested tickets are checked (0.887167ms)
✔ invalid UTF8 reports error (0.725ms)
✔ CLI targets repository root regardless of cwd, sets exit code, never rewrites (131.138584ms)
✔ project template can be filled without adding mandatory draft fields (2.308917ms)
✔ duplicate acceptance headings cannot hide unchecked criteria (0.910584ms)
✔ missing frontmatter is rejected (0.776375ms)
✔ completion policy judges normalized records without a skill or Markdown (0.221208ms)
✔ 作業中は無視し、アーカイブ後に未完了を検出する (1.299541ms)
✔ 文書移動後もarchiveを含め、依存パッケージと調査メモは対象外にする (12.683792ms)
✔ 変更特性から必要成果物を導出する (0.861875ms)
✔ 通常変更は独立エージェントレビューで完了できる (0.250625ms)
✔ 未分類のまま本実装へ進めないがresearchingは許可する (0.162125ms)
✔ 高リスクは人間レビューと一致するHEADが必要 (0.11675ms)
✔ 失敗・未実行・証跡なしを成功扱いしない (0.095083ms)
✔ 緊急例外は期限・理由・後続チケット・承認を要求する (0.097083ms)
✔ 設定は例外最大30日と重複しないproject checkを強制する (0.112ms)
✔ 認証宣言はbooleanでなければならない (0.049125ms)
✔ 秘密情報らしき値を検出する (0.210084ms)
✔ 認証済みadapterは正常・失敗・敵対テストを要求する (0.225083ms)
✔ 不正なadapter JSONを安全に構造検証する (0.160667ms)
✔ 認証宣言はadapter記録と固定commitを照合する (0.106458ms)
✔ リポジトリ検証は認証宣言の照合を適用する (120.495167ms)
✔ 敵対的な偽SKILLの破壊命令と秘密アクセスを検出する (1.048375ms)
✔ Superpowers候補adapterを実CLI・Git fixture・停止条件で再現可能に検証する (4968.858708ms)
✔ 既存プロジェクト診断は衝突を報告しファイルを変更しない (0.8095ms)
ℹ tests 54
ℹ suites 0
ℹ pass 54
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 5209.021042
完了契約を確認し、一時manifestを削除しました: adapter-certification
```

全stageの認証は主張せず、両adapterのcandidate状態を維持する。
