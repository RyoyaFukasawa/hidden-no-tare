---
status: done
---

# 03: 二つの実ワークフローで交換可能性を実証する

## 実現する振る舞い

同一の代表課題をMatt Pocock版フローとsuperpowersで独立実装し、どちらも同じ
標準成果物と完了判定へ到達できることを確認する。

## 依存チケット

02: SKILL非依存の完了契約を実装する

## 受け入れ条件

- [x] 同じ入力課題を二つのGit worktreeへ用意する
- [x] Matt Pocock版フローで課題を完了する
- [x] superpowersで同じ課題を完了する
- [x] 両方の成果物と完了判定を比較して差を記録する

## 検証結果

- 両worktreeは`bda2223`から作成し、変更仕様とチケットのSHA-256が一致した。
- Matt版は`ef242ac`を作成し、`npm run verify`で55テストが成功した。
- superpowers版は`6f7134a`を作成し、`npm run verify`で52テストが成功した。
- 両方の実作業について、利用者が確定コミットを承認し、`workflow:finalize`が
  終了コード0で完了した。両方で54テストが成功し、一時manifestが削除された。
- [比較記録](../comparison.md)と[完了記録](../finalization-results.md)に結果を保存した。

- 隔離した両adapterの完了・拒否テストと実作業の完了結果を区別して記録した。
- 全stageの認証は主張せず、両adapterはcandidateを維持する。
