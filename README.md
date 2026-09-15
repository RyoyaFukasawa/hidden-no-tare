# Exchangeable Development Workflow

外部の開発SKILLやエージェントを交換しながら、プロジェクトに残す仕様、
受け入れ条件、検証証跡、承認、アーカイブの契約を維持するテンプレートです。

このリポジトリは開発SKILLそのものを再実装しません。外部ワークフローを
交換可能な実装として接続し、決定論的なCLIで完了条件を検証します。

## 初期セットアップ

正式な導入対象は新規Gitリポジトリです。このテンプレートから作成してcloneし、
リポジトリルートで実行してください。GitのHEADになる初回コミットが必要です。

- Node.js 24.12.0以上の24系と同梱npm（開発確認: Node.js 24.19.0）。
- Git 2.28以上（worktreeと初期ブランチ指定を使用）。
- lychee 0.24.2（リンク検証の動作確認版）。npmでは導入されません。

[Node.jsの公式ダウンロード](https://nodejs.org/en/download)で24系とOS・CPUを選び、npm付きで導入します。
[Gitの公式導入案内](https://git-scm.com/downloads/)からOSに合う方法で導入し、
`git config user.name`と`git config user.email`を自分のコミット情報に設定してください。
確認コマンドが見つからない場合は、インストール先をPATHへ追加してターミナルを開き直します。

lycheeは[公式の0.24.2リリース](https://github.com/lycheeverse/lychee/releases/tag/lychee-v0.24.2)
からOS・CPUに合うバイナリを取得し、展開した`lychee`をPATHの通った場所に置きます。
macOSでは[公式の導入案内](https://github.com/lycheeverse/lychee#installation)にある
`brew install lychee`も使えますが、導入される版は変わるため確認してください。
別バージョンはこのリポジトリでの互換性を確認してから使用します。

```sh
node --version
npm --version
git --version
lychee --version
npm ci
npm run verify
```

初回のパッケージ導入にはネットワークが必要です。通常のリンク検証はオフラインです。
アプリを追加したら`workflow.config.json`の`projectChecks`にlint・型チェック・テストを接続します。
`npm run verify`から実際に実行されることを確認してください。

## 基本コマンド

```sh
npm run workflow:prepare -- <change-id> <summary>
npm run verify:contract
npm run verify:project
npm run verify
```

新しい変更は`researching`状態から始まります。変更特性とリスクが確定するまで、
調査と試作だけを行います。詳しい契約は
[交換可能な開発ワークフロー](docs/product/exchangeable-development-workflow.md)を参照してください。

## 軽微変更の進め方

動作や仕様の意味を変えない誤字・コメント・整形だけは、チケットとそのアーカイブを省略できます。
マニフェスト・検証・独立レビューは必須です。リファクタリング、不具合修正、高リスク変更は対象外です。
例えば「必須」を「任意」に変える修正は一語でも仕様変更なので通常扱いです。

1. 通常と同じ`workflow:prepare`で開始し、変更特性とリスクを確定します。
2. 一時マニフェストに次の宣言を追加します。理由は実際の差分に合わせて記載してください。

   ```json
   "lightweight": {
     "reason": "コメントの誤字だけを直し、動作と仕様の意味は変わらない"
   }
   ```

3. `artifacts.ticket`は省略できます。他の成果物で置き換える必要はありません。
   `npm run verify`を実行し、`checks`に検証結果と証跡を記録します。
4. 実装担当と独立したレビュー担当が差分と分類理由を確認します。確認できた場合だけ
   既存の`review`に`lightweightConfirmed: true`を追加し、承認者・UTC日時・対象コミットも記録します。
   自己判断で確認済みにしないでください。通常のリスク別承認ルールを維持します。
5. 下記の完了順序に従い、`state: complete`として`workflow:finalize`を実行します。
   成功時だけ一時マニフェストを削除し、軽微変更の代替文書は残しません。

軽微変更の宣言がない既存マニフェストは通常扱いです。低リスクや少ない行数だけでは省略できません。
迷う場合やレビューで分類が否定された場合は、`lightweight`と古い`review`を削除し、
`state: researching`へ戻して変更特性・リスクを再評価します。チケットと必要成果物を用意してから
再検証・再レビューしてください。理由・分類確認の欠落や、高リスク・変更特性との矛盾はCLIが拒否します。

## 完了と承認の順序

1. 変更特性・リスクを確定し、成果物と検証証跡を整える。並行作業は別worktreeに分ける。
2. 検証と独立レビューを済ませ、完了文書を`docs/archive/`へ移してリンクを直す（軽微変更のチケット作成・移動は不要）。
3. マニフェストを`review`のまま`npm run verify`を実行し、コードと文書をコミットする。
4. 高リスク変更は、そのコミットを人間が承認する。承認者・UTC日時・完全なコミットSHAを
   `.workflow/changes/<change-id>.json`の`review`に記録し、`kind: human`、`state: complete`にする。
   高リスク以外も対象コミットへの独立レビューを記録して`state: complete`にする。
5. `npm run workflow:finalize -- <change-id>`を実行する。検証成功時だけ一時マニフェストを削除する。

完了時は承認コミットとHEADの一致に加え、staged・unstaged・untracked変更がないことを要求します。
通常のGit ignore対象と、有効な未追跡一時マニフェストだけが例外です。
一時マニフェストをコミットしないでください。追跡済みの場合はGit追跡から外す変更も
先にコミットしてから承認を受け直します。承認後にコード・文書を編集したら再承認が必要です。
検証中に変更が生成された場合も成功にはしません。

## 任意のSKILL接続・利用例

Matt系・Superpowersは同梱例であり、必須でも優先ワークフローでもありません。
登録・認証なしで好きなSKILLを使用できます。外部SKILLを導入する際の出所・ライセンス・
固定版・権限の確認は引き続き必要です。

```sh
npm run workflow:inspect-skill -- <skill-directory>
npm run verify:registration
npm run verify:examples
```

接続定義は`adapters/`、比較実験は`examples/workflows/`、その過去出力は
`scripts/workflow/fixtures/`にあります。これらと同梱の`.codex/skills/`は削除・交換可能で、
通常の`verify`は固有の接続定義・実験を実行しません。
利用例を削除した場合は`verify:examples`も不要です。
任意の登録を使う場合だけ、prepareの末尾に`<workflow> <commit> <adapter>`を追加できます。
`workflow.certified`の宣言の照合は`verify:registration`で行い、通常のverifyは認証を保証しません。

## 既存プロジェクトへの補助診断

```sh
npm run workflow:diagnose -- <existing-project>
```

指示・設定・テンプレートの6ファイルだけを比較します。JSONの`checkedFiles`と`unchecked`を
確認してください。衝突なしや終了コード0は、安全な導入の保証ではありません。
package.json、スクリプト、CI、既存アプリとの互換性は別途確認し、提案差分を承認してから
適用します。自動マージ・上書きは行いません。

## 文書

- [文書索引](docs/index.md)
- [設計判断](docs/adr/README.md)
- [成果物テンプレート](docs/templates/README.md)
