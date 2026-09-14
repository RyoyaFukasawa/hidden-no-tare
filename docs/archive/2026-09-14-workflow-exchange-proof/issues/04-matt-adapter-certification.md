---
status: done
---

# 実験: アダプター認証宣言を照合する

## 実現する振る舞い

認証済みを名乗る作業マニフェストを、アダプター記録と固定コミットに照合する。

## 依存チケット

なし（すぐに着手可能）

## 受け入れ条件

- [x] `certified: false`は認証記録がなくても許可される
- [x] `certified: true`は認証済みアダプターとの一致時だけ許可される
- [x] ID不存在、候補状態、コミット不一致は個別のエラーになる
- [x] 現行仕様が新しい強制動作を説明する
- [x] `npm run verify`が成功する

## 検証結果

- RED: `node --test scripts/workflow/contract.test.ts`は、
  `checkCertificationClaim`が未exportであるため失敗した。これは認証宣言照合機能の
  未実装による期待どおりの失敗である。
- 境界RED: `node --test scripts/workflow/contract.test.ts`は4件失敗した。
  `workflow.certified`の非boolean値、未知の`certification.status`、falsy値による
  照合迂回、無効なオンディスクadapterの除外が未実装であることによる期待どおりの失敗である。
- GREEN: `node --test scripts/workflow/contract.test.ts`は14件すべて成功した。
- `npm run typecheck`はTypeScriptのエラーなく成功した。
- `npm run verify`は、契約検証0エラー、作業項目2件・0エラー、Markdown 0件、
  プロジェクトチェック52件すべて成功で終了した。
- Adapter runtime RED: `node --test scripts/workflow/contract.test.ts`は2件失敗した。
  `checkAdapter(null)`が例外を送出し、重複した有効adapter IDが任意に照合対象へ残る
  既存の境界不足による期待どおりの失敗である。
- Adapter runtime GREEN: `node --test scripts/workflow/contract.test.ts`は15件すべて成功した。
- `npm run verify`は、契約検証0エラー、作業項目2件・0エラー、Markdown 0件、
  プロジェクトチェック53件すべて成功で終了した。
- Transform endpoint RED: `node --test scripts/workflow/contract.test.ts`は1件失敗した。
  空文字列または空白だけの`from`・`to`を含む変換が許可される既存の境界不足による
  期待どおりの失敗である。
- Transform endpoint GREEN: `node --test scripts/workflow/contract.test.ts`は15件すべて成功した。
- `npm run verify`は、契約検証0エラー、作業項目2件・0エラー、Markdown 0件、
  プロジェクトチェック53件すべて成功で終了した。

- 人間承認：利用者が2026-09-14に`6f7134a`のmain反映を承認した。
- main反映：同じ差分を`2351b98`としてcherry-pickした。
- アダプター認証は、成功・失敗・敵対ケースを含むワークフロー全体の証跡が
  未完成のため保留する。

## 再開後の検証とレビュー

- RED: finalize成功を要求する回帰テストは旧ハーネスで失敗した。
- GREEN: 隔離Git repoで両adapterの完了・証跡欠落拒否・未配置出力拒否・敵対命令の導入前停止を確認した。
- `npm run verify`: 54テスト成功。CLIは実worktreeのmanifestに触れず、完了後もテストを再実行できる。
- 修正ハーネスの独立Standardsレビューは指摘なし。結果の範囲は[比較記録](../comparison.md)に明記した。
- 人間承認：本会話の利用者が`ff32192971b41f2ddcc06c04f61102d4eaf8f33a`と完了処理・文書整理を承認した。
- 承認受領の記録時刻（UTC）：`2026-09-14T14:49:08Z`。
- 実manifestの固定版とadapter記録の一致、および`certified: false`の候補状態を確認した。
- 保存したケース証跡の範囲は[比較記録](../comparison.md)と[lifecycle結果](../matt-lifecycle-results.md)に示す。
  全stageの認証status昇格を意味しない。
- `npm run workflow:finalize -- matt-adapter-certification`は終了コード0で完了し、一時manifestを削除した。
  詳細は[完了記録](../matt-finalization-results.md)を参照する。
