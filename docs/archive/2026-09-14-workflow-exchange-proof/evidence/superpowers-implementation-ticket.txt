---
status: in-progress
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

人間によるコミット固有の承認待ちのため、statusは`in-progress`のままとする。
