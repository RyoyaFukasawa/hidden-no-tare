---
status: in-progress
---

# 03: 二つの実ワークフローで交換可能性を実証する

## 実現する振る舞い

同一の代表課題をMatt Pocock版フローとsuperpowersで独立実装し、どちらも同じ
標準成果物と完了判定へ到達できることを確認する。

## 依存チケット

02: SKILL非依存の完了契約を実装する

## 受け入れ条件

- [x] 同じ入力課題を二つのGit worktreeへ用意する
- [ ] Matt Pocock版フローで課題を完了する
- [x] superpowersで同じ課題を完了する
- [ ] 両方の成果物と完了判定を比較して差を記録する

## 検証結果

- 両worktreeは`bda2223`から作成し、変更仕様とチケットのSHA-256が一致した。
- Matt版は`ef242ac`を作成し、`npm run verify`で55テストが成功した。
- superpowers版は`4a1205a`で固定版アダプターの成功・失敗・敵対・停止条件を記録し、
  `npm run verify`で53テストが成功した。
- Superpowers版の完了チケットと認証証跡は
  `docs/archive/2026-09-14-superpowers-adapter-certification/`へ保存した。高リスク
  manifestのfinalizeだけは、承認対象コミットに対する人間承認を待っている。
- 比較記録は
  `docs/archive/2026-09-14-superpowers-adapter-certification/comparison.md`に保存した。
