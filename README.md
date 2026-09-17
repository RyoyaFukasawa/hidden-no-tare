# hidden-to-tare

外部の開発SKILLやエージェントを交換しながら、プロジェクトに残す仕様、
受け入れ条件、検証証跡、承認、アーカイブの契約を維持するテンプレートです。

このリポジトリは開発SKILLそのものを再実装しません。外部ワークフローを
交換可能な実装として接続し、決定論的なCLIで完了条件を検証します。

## 初期セットアップ

正式な導入対象は新規Gitリポジトリです。別プロジェクトへ導入するときは、
公開npmパッケージの固定版CLIを初回コミット済みのリポジトリで実行します。
既存コードがあるリポジトリへの途中導入は対象外です。

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

### 別プロジェクトへの初期導入

公開npmパッケージの固定版を、導入先の新規リポジトリで実行します。

```sh
cd ../new-project
git init --initial-branch=main
git add README.md
git commit -m "chore: initialize repository"
npm create hidden-to-tare@0.1.0 -- --package-manager npm --install
npm run verify
npm run workflow:prepare -- initial-change "最初の変更"
```

pnpmを使う場合は、`--package-manager pnpm --install`を指定して同じCLIを実行します。
既存の`.gitignore`へ必要な除外規則を追記する場合は、差分を確認して`--accept-existing`を指定します。
生成前の確認には`--dry-run`を使えます。CLIは利用者のコミットを作成しません。
更新は固定版のnpmパッケージをCLIとして実行します。
`npm exec --package create-hidden-to-tare@0.1.0 -- hidden-to-tare update`の形式です。

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

動作・仕様の意味を変えない誤字・コメント・整形だけが対象です。
マニフェスト・検証・独立レビューは省略しません。
[適用条件と否定時の戻し方](docs/product/exchangeable-development-workflow.md#必要成果物)を確認してください。

1. `workflow:prepare`で開始し、分類を確定して`lightweight.reason`へ実際の差分に基づく理由を記録します。
2. `artifacts.ticket`を省略し、verifyの結果・証跡を`checks`へ記録します。代替の長期文書は不要です。
3. 独立レビュー担当が差分と理由を確認し、対象コミットの`review`に`lightweightConfirmed: true`を記録します。
4. 下記の完了順序に従います。迷う・分類が否定された場合は`lightweight`と古い`review`を削除し、
   `researching`へ戻して通常のチケット手続きで再分類・再検証・再レビューします。

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

## 検証ログ

`npm run verify`と`npm run workflow:finalize -- <change-id>`は、検証ごとの成否と
`Log:`に詳細ログの場所を表示します。失敗時は診断の抜粋も表示します。検証内容は省略しません。
ログは`.workflow/logs/`に保存し、Gitへ追加しないでください。

- 最大10件・合計5MiB。保存時に古い管理ログから自動整理します。
- 1件最大1MiB。超過した出力は先頭・末尾を残し、省略を明示します。表示する失敗診断は最大4KiBです。
- 保存・整理に失敗した場合は成功扱いしません。保存先のsymlinkは拒否します。
- ログは検証コマンドの出力です。会話履歴ではありませんが、出力された秘密情報を含む可能性があります。
  必要な検証証跡だけチケットへ残し、ログをそのまま共有しないでください。
- 排他の競合は失敗として案内します。異常終了で`.write-lock`が残った場合は、書込みプロセスが
  動いていないことを確認してから、その空ディレクトリだけを取り除いて再実行してください。

個別に`npm run verify:contract`・`npm run verify:project`を実行すると、従来の詳細出力を確認できます。
これは完了時のverify・finalizeや、人間の承認を省略する方法ではありません。

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

### 外部接続の作業領域を使う

登録・認証用の`adapters/`とは別に、生成するファイルを
`.workflow/connections/<id>.json`へ定義します。これは接続ファイルの生成・撤去だけを行い、
SKILL本体はインストールしません。例えば`.workflow/connections/demo.json`は次の形式です。

```json
{
  "schemaVersion": 1,
  "id": "demo",
  "files": { "config.md": "# Demo connection\n" },
  "compatibility": { "docs/agents/demo.md": "# Demo settings\n" }
}
```

定義をGitへ追加し、固定パスを`.gitignore`へ個別に追加します（例：`/docs/agents/demo.md`）。
`.workflow/external/`と`.workflow/connection-state/`は同梱のignore対象です。
既存ファイルは上書きしないため、既に追跡されている文書の移行は別途レビューして行ってください。

```sh
git add .workflow/connections/demo.json .gitignore
npm run workflow:connection -- attach demo
# .workflow/external/demo/ で作業する
npm run workflow:connection -- detach demo
```

生成定義を変更する際は先に撤去し、変更後に再接続します。
複数接続は併用できますが、同じ固定パスの共有はできません。使う接続の情報だけ参照してください。
Mattを使う場合は同梱の`matt`定義を選び、SKILLを呼ぶ前に次を実行します。

```sh
npm run workflow:connection -- attach matt
```

`docs/agents/issue-tracker.md`をGit管理外に生成し、作業領域を`.workflow/external/matt/`に用意します。
Matt以外を使うときは接続不要です。規約の正本は共通仕様にあり、互換文書は設定と参照だけを持ちます。
ローカルMarkdownで仕様・チケットを管理し、GitHub Issueへ公開しない方針も共通仕様に残しています。
不要になったら成果物を共通側へ移し、`npm run workflow:connection -- detach matt`で撤去します。
`CONTEXT.md`と`docs/adr/`は共通の成果物なので撤去しません。

以前の追跡文書はこの変更で移行済みです。`domain.md`の運用規則は共通仕様へ集約しました。
旧版からの移行時は利用者独自の追記を共通側へ移してから、追跡された互換文書を外す差分を
レビュー・コミットしてください。接続CLIは追跡中の文書や既存ファイルを自動で置き換えません。

Matt定義のCLIテストは任意の`npm run verify:examples`に含まれます。
`.workflow/connections/matt.json`や同梱例を削除しても、通常のverifyは動きます。
接続成功はSKILLの認証や品質保証ではありません。

- 作業中の資料は通常のverifyを妨げません。ただし未移管資料や変更済みファイルがあると、
  撤去と完了は止まります。同じworktree内のすべての接続が対象です。
- 残す成果物は共通の保存先へ手動で移管し、不要なものは内容を確認して明示的に破棄します。
  コマンドに強制削除オプションはありません。未変更の生成ファイルは完了後も残せます。
- 所有記録が不正・欠落している場合や`phase`が`active`でない場合は処理を止めます。
  元の定義と残存ファイルを確認し、資料を退避してください。記録だけ消して解決しようとしないでください。
  自動修復はありません。手動撤去では所有を確認した生成ファイル・空ディレクトリだけを片付け、
  最後に該当接続の記録を取り除いてから再接続します。
- `.workflow/connection-state/.lock`が残った場合は接続操作が動いていないことを確認し、
  残存状態を点検した後、その空ロックディレクトリだけを取り除きます。
- 操作中の外部プロセスによる同時編集を避けてください。これは物理的な隔離・改ざん防止ではありません。

形式と保護対象の詳細は[現行仕様](docs/product/exchangeable-development-workflow.md#外部接続の専用領域)を参照してください。

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
