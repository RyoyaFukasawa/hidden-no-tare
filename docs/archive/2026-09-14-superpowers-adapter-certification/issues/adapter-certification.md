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
- [x] `superpowers-engineering`の固定コミットと認証宣言を実マニフェストで照合できる
- [x] 成功・失敗・敵対・停止条件の認証証跡を保存する

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

このworktreeでは、mainの契約修正を取り込んだ後に、成功・失敗・敵対ケースの
認証証跡とコミット固有の最終レビューを追加するまで、statusは`in-progress`のままとする。

## アダプター認証の証跡

- `superpowers-engineering`を固定コミット
  `b36e0829c6d0140e93cfef2ca599b1b07d4a7797`で`certified`へ昇格した。
- `npm run verify`は`Workflow contract: 0 errors`、作業項目2件・0エラー、
  プロジェクトテスト53件成功で終了した。
- 成功・失敗・敵対・停止条件のコマンドと出力は
  [Superpowersアダプター認証](../superpowers-certification.md)に記録した。
- 一時マニフェストは、独立レビューとコミット固有の人間承認を待つ`state: review`である。
  停止条件により、承認前の`workflow:finalize`は
  `manifestをstate: completeにしてからfinalizeしてください`と拒否した。
- 認証は外部SKILLの出力品質または完全な安全性を保証しない。コミット固有の独立レビューと
  高リスクの人間承認は、Task 2以降の完了ライフサイクルで必要である。
