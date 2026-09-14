# 比較実験の終了手順

- [x] 過去の実装チケットを出典コミット付きで保存する。
- [x] 両adapterの隔離した完了・拒否・導入前停止を再実行する。
- [x] 修正ハーネスの独立レビューと各worktreeのverifyを行う。
- [x] 確定コミットに対する人間承認を記録する。
- [x] 両実作業のmanifestを完了してfinalizeを実行する。
- [x] 比較チケットを完了し、完了文書をarchiveへ移して参照を更新する。
- [x] 統合後のverifyを実行する。

アダプター全stageの認証はこの境界実験で保証していないためcandidateを維持する。
現在の証跡は[比較記録](comparison.md)と[lifecycle結果](lifecycle-results.md)を参照する。
