# 開発ルール

パスとコマンドは、アプリのリポジトリルートを基準とする。

## 交換可能な開発ワークフロー

- 開発手順には、その時点で選択した外部SKILLを使用してよい。外部SKILLより
  [現行仕様](docs/product/exchangeable-development-workflow.md)、プロジェクトの
  テンプレート、`workflow.config.json`、検証CLIを優先する。
- 変更開始時は`npm run workflow:prepare -- <change-id> <summary> <workflow> <commit> <adapter>`で
  作業マニフェストを作る。未分類の変更は`researching`として調査と試作だけを行う。
- 外部SKILL導入前に、出所・ライセンス・固定コミット・権限を確認し、
  `npm run workflow:inspect-skill -- <directory>`の指摘をレビューする。
- アダプターはパス・形式・ライフサイクルの変換だけを担う。意味に関わる不足を
  創作せず、外部フローへ差し戻す。
- 機械可読な設定を正本とする。エージェント固有の指示と設定の不一致を放置しない。
- 既存プロジェクトへの導入前は`npm run workflow:diagnose -- <project>`を実行する。
  既存ファイルを自動マージまたは上書きせず、提案差分を利用者が承認してから適用する。

## 文書・テンプレート

現行仕様・関連する設計判断を先に読む。`docs/archive/`は過去の経緯が必要な場合だけ検索し、現在の仕様として扱わない。

| 作成する文書 | テンプレート |
| --- | --- |
| 現行仕様 | [product-spec.md](docs/templates/product-spec.md) |
| 変更仕様 | [change-spec.md](docs/templates/change-spec.md) |
| チケット | [ticket.md](docs/templates/ticket.md) |
| ADR | [adr.md](docs/templates/adr.md) |

- **成果物の形式・完了条件と、長く残す文書の保存先はプロジェクトの規約を優先する。検討事項は対応する文書へ反映する。**
- 長く残す文書は、現行仕様を`docs/product/`、ADRを`docs/adr/`、完了した変更仕様・計画・チケットを`docs/archive/`に置く。
- 作業中の保存先・文書の分割方法はskillに任せる。`.scratch/`など特定の作業ディレクトリを必須にしない。
- `docs/product/<feature>.md`には合意した現行の振る舞いを記載し、変更するコードと同じPRで更新する。不具合に合わせて仕様を書き換えない。
- 判断の経緯はADR、実装手順・完了チェックは変更仕様やチケットに記載する。

## ADRの変更

- 採用済みの判断を一部でも変更する場合は、新ADRを作成する。
- 新ADRに継続する判断も含めて旧ADR全体を置き換え、`supersedes`に旧ADRのIDを記載する。同じ変更で旧ADRを`Superseded`にする。
- 誤字修正や判断の意味を変えない補足は、既存ADRを直接修正してよい。
- 変更後は`npm run adr:generate`で`docs/adr/README.md`を再生成する。一覧は手編集しない。

## 完了条件・文書整理

使用するskillにかかわらず、[完了判定の契約](scripts/completion-check/completion.ts)を満たすこと。skill自身の完了報告だけで完了と判断しない。

- 受け入れ条件を検証し、根拠をチケットに記録する。満たした項目だけチェックし、レビュー後に`done`へ変更する。
- 検証のために条件を削除・緩和しない。人間の確認が必要な条件は、確認を受けるまで未チェックにする。
- 完了した変更仕様・計画・チケットは、現行文書の更新と合わせて同じPR内で`docs/archive/<日付と変更名>/`へ移動し、参照リンクを更新する。仕様・計画の分割は維持してよい。
- 機械検証のため、完了チケットだけはアーカイブ内の`issues/`にまとめ、チケットテンプレートの形式に揃える。整理後に`verify`を実行する。未完了チケットは作業場所に残す。

## 検証

- 完了報告前に`npm run verify`を実行する。
- アプリのlint・型チェック・テストと完了条件チェックを、この入口から実行する。チケットの検証対象は`docs/archive/<変更名>/issues/**/*.md`とし、作業中の保存先は走査しない。
- アーカイブへの移動漏れはレビューで確認する。チェック成功だけで文書整理の完了とは判断しない。
- Markdownの書式は`npm run lint:md`、ローカルリンク・見出しへのリンクは`npm run lint:links`で検証する。両方を`verify`に含める。外部URLは`npm run lint:links:online`で別途確認する。
- ADRの形式・置き換え関係・一覧の更新漏れも検証する。検証ではファイルを書き換えない。
- 変更に必要な検証が入口に含まれていない場合は別途実行する。失敗や未実行の検証を成功扱いしない。
