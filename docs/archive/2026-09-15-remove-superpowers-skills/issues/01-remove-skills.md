---
status: done
---

# 01: Superpowersの同梱SKILLを削除する

## 実現する振る舞い

利用者の指示に従い、プロジェクトのSuperpowers由来SKILL8種類と付属ファイルを削除する。
Matt系SKILL、Superpowersのadapter・比較実験は維持する。
個人領域と、別worktreeにある承認待ちの変更には触れない。

## 依存チケット

なし。ADR変更の最終SHA承認とは独立した、同梱SKILLの削除作業。

## 受け入れ条件

- [x] 出典記録にある8種類のSKILLとSuperpowersの出典・ライセンスファイルを削除する。
- [x] Matt系SKILLとadapterの内容を変更しない。
- [x] 通常のverifyと任意の登録検証が成功する。
- [x] 独立レビューで削除範囲を確認する。

## 検証結果

削除対象はGit追跡済みであり、履歴から復元可能。
rootのnpm run verifyは77テスト成功、文書・ADR・契約検査成功。verify:registrationは0エラー。
独立レビュー担当adr_approval_standardsが出典記録と26ファイルの削除範囲、
Matt系・adapter無変更とadapterのSKILL実体非依存を確認し、指摘なし。
adapterは宣言JSONであり、登録検証はSKILL実体の存在を要求せず、自動インストール・起動も行わない。
Gitコミット・mainへの他ブランチの取り込み・承認待ちADRの完了承認は行わない。
