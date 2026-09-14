---
status: done
---

# 01: SKILLに依存しない完了契約を提供する

## 実現する振る舞い

利用例を削除・交換しても文書と完了契約が使え、不正な入力や承認対象外の変更で完了しない。

## 依存チケット

なし（すぐに着手可能）。

## 受け入れ条件

- [x] ワークフロー情報なしで開始・検証でき、利用例を取り除いても必須機能が動く。
- [x] 設定・マニフェストの欠落や型不正と、完了時の未分類を拒否する。
- [x] 承認後のstaged・unstaged・untracked変更を拒否し、一時マニフェストだけ更新できる。
- [x] 検証が変更を作った場合はfinalizeせずマニフェストを保持する。
- [x] 診断の対象範囲と限界、外部ツールの導入方法と不足時の案内がある。
- [x] 現行仕様・新ADR・指示を更新し、独立レビューと文書整理後にverifyが成功する。

## 検証結果

開始前の基準: main a244af6、npm test 54件成功。
最終コミットに対する人間承認はこの実装チケットとは別に一時マニフェストで扱う。

- 2026-09-15、仕様・計画移動後の`npm run verify`: 77 tests passed、0 failed。
  型検証、完了契約、既存5チケット、ADR、Markdown、ローカルリンクが成功。
  本チケットの証跡記入・移動後にも同じ入口で再確認し、77テスト・6チケットが成功。
- `npm run verify:examples`: 任意の登録検証0 errors、Matt系・Superpowers実CLI比較1件成功。
- 登録なしでの開始、JSON欠落・型不正、未確定のリスクは契約テストでRED→GREENを確認。
- 実Gitの追跡ファイル編集でRED→GREEN。staged、untracked、rename、削除、追跡済みmanifestも拒否。
  未追跡manifestだけの更新ではfinalizeが成功し、HEAD・追跡ファイルを変更しない。
- verify/finalize中の生成ファイル、manifest削除・reviewへの書換えは実CLIテストでRED→GREEN。
- lychee・Git・npmがないPATHで案内付きの失敗を確認。診断の6ファイル限定出力と非破壊動作も確認。
- 一時コピーから`adapters/`、`examples/`、`scripts/workflow/fixtures/`、`.codex/`、`.agents/`を除外し、
  新規Gitとしてコミットした上で通常のverifyと登録なしのprepare・契約検証が成功。
  コピーのnode_modulesだけを既存のnpm ci済み依存へ接続し、実験を再帰実行しない通常構成を検査した。
- 独立レビューはmain a244af6→d8162c6と追加修正を対象に、core_spec_reviewと
  core_standards_reviewが実施。仕様軸のGit導入案内不足、規約軸の状態・リスク重複を修正し、
  両者の再レビューで未解決0件を確認。前者は不足時テスト3件も再実行して成功。

このdoneは実装と独立レビューの完了を表す。高リスク変更の人間承認を代替せず、
承認対象コミットが確定するまでは作業マニフェストをreviewに保つ。
