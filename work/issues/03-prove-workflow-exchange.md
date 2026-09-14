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
- [ ] superpowersで同じ課題を完了する
- [ ] 両方の成果物と完了判定を比較して差を記録する

## 検証結果

- 両worktreeは`bda2223`から作成し、変更仕様とチケットのSHA-256が一致した。
- Matt版は`ef242ac`を作成し、`npm run verify`で55テストが成功した。
- superpowers版は`6f7134a`を作成し、`npm run verify`で52テストが成功した。
- 両方で実装と`verify`成功までは確認したが、作業マニフェストとチケットが
  完了状態へ到達していないため、交換可能性の実証と認証は未完了である。
- 中間比較は`work/experiments/adapter-certification/comparison.md`に保存した。
