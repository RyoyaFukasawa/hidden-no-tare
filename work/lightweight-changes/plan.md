# 軽微変更の実装計画

> 実行SKILLは利用者指定のimplementとtddを使用する。テスト境界は合意済みのverify／finalize CLI。

**Goal:** マニフェスト・検証・独立レビューを維持して軽微変更だけチケットを省略する。

**Architecture:** 任意のlightweight宣言を既存マニフェストへ追加する。宣言なしは通常扱い。
型検証と完了契約に分類理由・分類確認・矛盾の拒否を追加し、既存のGitと検証中の保護は共有する。

**Tech Stack:** 既存のNode.js／TypeScript／node:test。依存追加なし。

**Spec:** [変更仕様](spec.md)／[承認済みの1チケット](issues/01-lightweight-changes.md)。

## 制約

- マニフェストはすべての変更で維持する。
- リファクタリング、不具合修正、高リスク変更は対象外。意味の同一性は独立レビューで判断する。
- 軽微変更で省略するのはチケットとそのアーカイブだけ。新しい代替文書は要求しない。
- 今回の変更は高リスク。mainの26e5c43を比較元にレビューし、整理後のコミットを人間承認へ提示する。

## 1チケットの実装順

変更対象はscripts/workflow/contract.ts（要件）、schema.ts（JSON型検証）、
repository.test.ts（CLI観測）、README・現行仕様・エージェント指示（利用方法）。
既存のprepare・verify・finalizeのインターフェースは変更しない。

- [x] 一時Git上でチケット自体が存在しない入力を作り、verify成功・記録保持、finalize成功・記録削除を検査するテストを追加する。未対応の宣言で失敗することを確認する。
- [ ] 次の任意入力を型とスキーマに追加し、宣言時だけ必要チケットを省略する。対象テストと型検証を実行する。

```typescript
lightweight?: { reason: string };
// 既存reviewの中に追加する分類確認。通常扱いでは不要。
lightweightConfirmed?: boolean;
```

- [ ] 空の分類理由を渡すCLIテストを追加し、失敗を見てから空白理由を拒否する。
- [ ] 分類確認なし／否定のCLIテストを追加し、失敗を見てから完了時にtrueを要求する。
- [ ] 高リスク・変更特性との矛盾を渡すCLIテストを追加し、失敗を見てから拒否する。
- [ ] JSON型不正、検証やレビュー不足、通常扱いへの復帰をCLIで検証する。既存条件が拒否していれば本体は変更しない。
- [ ] 軽微変更についてHEAD・未コミット変更・検証中の記録変更／削除・検証失敗をCLIで検証する。既存の保護を維持する。
- [ ] 現行仕様・README・エージェント指示を同期する。理由・分類確認の記載例、通常扱いへの復帰、意味変更の対象外例を含める。
- [ ] 対象ファイルのテストと型検証を繰り返し、最後にnpm run verifyを実行する。code-reviewのStandards／Specを独立したエージェントで実施する。
- [ ] レビュー後の根拠をチケットへ記録し、完了した文書を整理する。人間承認待ち項目は未チェックのまま残す。
- [ ] 検証済み差分をfeat: prefixで現在のブランチへコミットし、SHAを人間承認へ提示する。承認前にcompleteやfinalizeにしない。

## 実行コマンド

```sh
node --test --test-name-pattern='軽微変更' scripts/workflow/repository.test.ts
node --test scripts/workflow/repository.test.ts
npm run typecheck
npm run verify
```

テストの失敗理由は終了コードだけでなく診断を確認する。成功テストはCLIの成功と
マニフェスト・Gitの状態を観測し、拒否テストは非0・該当診断・記録保持を観測する。
