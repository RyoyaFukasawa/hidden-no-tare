# 開発ルール

パスとコマンドはリポジトリルート基準。
開発手順は選択した外部SKILLに任せるが、成果物・完了条件はプロジェクトが所有する。
[現行仕様](docs/product/exchangeable-development-workflow.md)、テンプレート、
`workflow.config.json`、検証CLIを外部SKILLより優先する。設定と指示の不一致を放置しない。

## 作業の入口

- `npm run workflow:prepare -- <change-id> <summary>`で一時マニフェストを作る。
  変更特性とリスクが確定するまでは調査・試作だけとする。
- 作業中の変更仕様とチケットは`.workflow/work/<change-id>/`へ置き、`docs/`直下には
  `adr/`、`archive/`、`product/`、`templates/`だけを作成する。
- 関連する現行仕様と設計判断を先に読む。`docs/archive/`は必要な過去の経緯だけ検索する。
  文書の形式・保存・移管は[文書の管理](docs/product/exchangeable-development-workflow.md#文書の管理)に従う。
- 誤字・コメント・整形だけのチケット省略も、分類理由・検証・独立レビューは必須。
  適用範囲と否定時の戻し方は[必要成果物](docs/product/exchangeable-development-workflow.md#必要成果物)に従う。

## 判断・完了のゲート

- ADRは[選別と本文承認](docs/product/exchangeable-development-workflow.md#adrの選別と本文承認)に従う。
  会話の設計合意だけで採用しない。未承認の判断に依存する本実装を止め、依存をマニフェストに宣言する。
  採用済み判断の変更・本文修正・一覧再生成も同節に従い、承認記録を創作しない。
- 受け入れ条件を緩めず、確認できた項目だけチェックする。独立レビュー後にdoneとし、完了文書を整理する。
- [リスクとレビュー](docs/product/exchangeable-development-workflow.md#リスクとレビュー)に従い、
  検証・独立レビュー・文書整理を済ませたコミットを承認対象にする。高リスクは人間がSHAを承認する。
  承認後は有効な未追跡マニフェストだけ更新し、追加変更には再承認を求める。マニフェストはコミットしない。
- 完了報告前に`npm run verify`。必要な追加検証も実行し、失敗・未実行を成功扱いしない。
  要約を読み、詳細ログは必要時だけ参照する。[検証](docs/product/exchangeable-development-workflow.md#検証)に従う。
  skillの完了宣言ではなく[完了契約](scripts/completion-check/completion.ts)と検証CLIで判断する。
- 承認後は`npm run workflow:finalize -- <change-id>`で完了を確認する。
  未コミット変更・未移管資料を残した完了は拒否される。並行作業は別worktreeに分ける。

## 外部接続・導入

- 登録・認証・同梱例は任意。`verify:registration`と`verify:examples`は通常検証から独立する。
  導入前は出所・ライセンス・固定コミット・権限を確認し、`workflow:inspect-skill`の指摘をレビューする。
- 接続は`npm run workflow:connection -- attach|detach <id>`で明示実行する。
  [所有・撤去規則](docs/product/exchangeable-development-workflow.md#外部接続の専用領域)に従い、使う接続の情報だけ読む。
  verifyは診断ログ以外を生成・変更しない。アダプターは形式・パス・状態だけ変換し、意味的不足を創作しない。
- 新規リポジトリ向けが主対象。既存導入前は`npm run workflow:diagnose -- <project>`。
  6ファイルの限定比較で安全性は保証しない。既存ファイルを自動上書き・マージせず、提案差分の承認後に適用する。
