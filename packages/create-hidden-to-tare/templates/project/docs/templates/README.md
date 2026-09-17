# テンプレートの出典

変更仕様・チケットは、2026-09-14に確認したMatt Pocock版を基にした日本語テンプレートとして、プロジェクト側で管理する。外側の`<spec-template>`・`<local-ticket-template>`タグは含めず、内部の本文を出発点にする。

- `change-spec.md`：[to-spec/SKILL.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-spec/SKILL.md)の`spec-template`。
- `ticket.md`：[to-tickets/SKILL.md](https://github.com/mattpocock/skills/blob/main/skills/engineering/to-tickets/SKILL.md)の`local-ticket-template`。GitHub Issue用ではなく、ローカルMarkdown用。

- `adr.md`：このプロジェクトで合意したADR形式。保存先は`docs/adr/NNNN-<name>.md`。
  3条件を満たす判断だけDraftとして作り、本文の人間承認後に承認メタデータを付けてAcceptedにする。
  [承認手順](../product/exchangeable-development-workflow.md#adrの選別と本文承認)に従い、本文を変える場合は再承認する。
- `product-spec.md`：このプロジェクトで定義した現行仕様の形式。保存先は`docs/product/<feature>.md`。[OpenSpec](https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md)の現行仕様と変更計画の分離、[Spec Kit](https://github.com/github/spec-kit/blob/main/templates/spec-template.md)のシナリオ・境界条件の観点を参考にした。テンプレートの転載ではない。

今後skillを更新・交換しても、この定義は自動更新しない。必要な変更をプロジェクト側で判断する。

テンプレートには説明や記載例が含まれる。文書作成時は実際の内容へ置き換える。見出し・説明・記載例は日本語とし、状態の値（`ready-for-agent`・`in-progress`・`done`）は機械処理用の識別子として維持する。状態・検証結果の記入は[開発ルール](../../AGENTS.md)に従う。変更仕様は元の構成を維持する。チケットは機械処理を簡単にするため、状態をYAMLメタデータの`status`へ移し、本文を固定の日本語見出しに整理した。検証結果欄も用意する。したがってチケットはMatt版との完全一致ではなく、プロジェクト側で管理する派生形式である。

変更仕様・チケットの元のテンプレートはMIT License、Copyright (c) 2026 Matt Pocock。[ライセンス全文](MATT-LICENSE.txt)を同梱する。
