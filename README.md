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

## ADRの作成と本文承認

構造・技術・責務の判断、実際の代案とトレードオフ、将来必要な選択理由の3条件を
すべて満たす場合だけADRを作ります。仕様や運用細則は仕様へ、実装手順はチケットへ記録します。
迷う場合は文書を作る前に候補と理由を利用者へ確認し、ADRのために代案を創作しません。

1. [ADRテンプレート](docs/templates/adr.md)からDraftを作成します。
   説明コメントの削除なども先に済ませ、承認を求める本文を確定します。
2. `npm run adr:generate`と`npm run verify`で草案の形式を確認します。
3. 人間に実際の本文を提示し、明示的な承認を受けます。会話の設計合意だけでは代用できません。
   承認前は依存する本実装を止め、調査・試作までにします。
4. 承認した本文のハッシュを計算し、下記の3項目をfrontmatterへ追加してAcceptedにします。
   例の承認者・日時を流用せず、実際の承認内容を記録してください。
5. 一覧を再生成して`npm run verify`を実行します。本文変更は誤字・整形・リンクだけでも再承認が必要です。

```yaml
status: Accepted
approvedBy: "実際に承認した人"
approvedAt: "2026-09-15T09:00:00Z"
approvedBodySha256: "承認した本文の小文字64桁SHA-256"
```

本文はfrontmatter終了行の改行直後から末尾までです。次は本文ハッシュを表示するだけで、
承認の記録・ファイルの書き換えはしません。パスは対象ADRへ置き換えてください。

```sh
node --input-type=module - docs/adr/0004-workflow-contract-ownership.md <<'NODE'
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const text = new TextDecoder('utf-8', { fatal: true })
  .decode(readFileSync(process.argv[2]));
const doc = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
if (!doc) throw new Error('frontmatterが不正です');
console.log(createHash('sha256').update(doc[2]).digest('hex'));
NODE
```

空白・コメント・改行コードも本文の一部です。ハッシュだけを合わせて人間確認を省略しないでください。
一覧再生成と有効なメタデータ更新だけでは再承認は不要です。記録の一致は読了・本人性の証明ではありません。
Draftには承認メタデータを付けず、Accepted・Superseded・Deprecatedには付けます。

通常の判断変更は新ADRで旧ADR全体を置き換えます。草案の`supersedes`は提案なので旧ADRを維持し、
新ADRの本文承認・採用時に旧ADRをSupersededにします。草案そのものは置き換え元にできません。
変更マニフェストには、依存する判断を`"adrDependencies": ["0004"]`のように4桁IDで記録します。
依存がなければ省略または`[]`にできます。`artifacts.adr`で指定したADRも自動的に検査対象です。
`architectureDecisionChanged: true`の場合は`ready`以降にADR成果物も必要です。
調査中（`researching`）は有効な草案を検証できますが、`ready`以降は未承認の依存をCLIで拒否します。
`npm run verify`で移行前に確認してください。本文変更は再承認まで拒否され、finalizeでも再検査します。
無関係な有効草案は他の変更を止めません。依存の申告漏れや旧判断への依存の妥当性はレビューで確認します。
CLIを通さない編集の物理的禁止や読了の証明は保証しません。最終コミットの承認は下記の別手続きです。

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
