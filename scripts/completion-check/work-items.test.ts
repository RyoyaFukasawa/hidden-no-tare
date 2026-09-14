import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkRepository, validateTicket } from './check-work-items.ts';

const valid = `---
status: done
---

# 01: 招待リンクの期限

## 実現する振る舞い
期限切れのリンクで参加できない。

## 依存チケット
None (can start immediately)

## 受け入れ条件

- [x] 期限内なら参加できる
- [x] 期限切れなら拒否される
## 検証結果
- 自動テスト：期限内・期限切れの2ケースが成功。
`;
const ticketPath = 'docs/archive/invitation/issues/01-expiry.md';
function check(content: string | Buffer, path = ticketPath) {
  const root = mkdtempSync(join(tmpdir(), 'workflow-test-'));
  try {
    const target = join(root, path);
    mkdirSync(join(target, '..'), { recursive: true });
    writeFileSync(target, content);
    return checkRepository(root);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('complete ticket passes and is counted', () => assert.deepEqual(check(valid), { errors: [], count: 1 }));
test('active ticket permits pending criteria and empty evidence', () => {
  const content = valid.replace('status: done', 'status: in-progress').replaceAll('[x]', '[ ]').split('## 検証結果')[0] + '## 検証結果\n';
  assert.deepEqual(validateTicket(content, false), []);
});
test('done rejects unchecked criteria and reports path', () => {
  const { errors } = check(valid.replace('[x]', '[ ]'));
  assert.ok(errors.some(error => error.includes('01-expiry.md')));
});
test('archive requires done', () => assert.ok(check(valid.replace('status: done', 'status: ready-for-agent'), 'docs/archive/change/issues/01-expiry.md').errors.length));
test('done archive passes', () => assert.deepEqual(check(valid, 'docs/archive/change/issues/01-expiry.md'), { errors: [], count: 1 }));
test('done rejects absent or placeholder evidence', () => {
  for (const evidence of ['', '<!-- 記録する -->', 'TODO', 'TBD', '未記入', '実行したテスト・確認方法と結果を記載する。', '- ', '### 自動テスト', '---']) {
    assert.ok(check(valid.split('## 検証結果')[0] + '## 検証結果\n' + evidence).errors.length, evidence);
  }
});
test('required sections and title cannot be omitted', () => {
  for (const heading of ['# 01: 招待リンクの期限', '## 実現する振る舞い', '## 依存チケット', '## 受け入れ条件', '## 検証結果']) {
    assert.ok(check(valid.replace(heading, '削除された見出し')).errors.length, heading);
  }
});
test('unknown missing duplicate and unsupported metadata rejected', () => {
  for (const metadata of ['status: accepted', '', 'status: done\nstatus: in-progress', 'status: "done"', 'state: done']) {
    assert.ok(check(valid.replace('status: done', metadata)).errors.length, metadata);
  }
});
test('criteria must be specific nonempty checkboxes', () => {
  for (const criteria of ['', '- 条件', '- [x] ', '- [x] TODO', '- [x] 条件A', '```markdown\n- [x] 仮の条件\n```', '<!-- - [x] 条件 -->']) {
    const content = valid.split('- [x]')[0] + criteria + '\n## 検証結果' + valid.split('## 検証結果')[1];
    assert.ok(check(content).errors.length, criteria);
  }
});
test('duplicate status cannot hide pending criteria', () => assert.ok(check(valid.replace('status: done', 'status: done\n\nstatus: in-progress')).errors.length));
test('fenced headings cannot supply required sections', () => assert.ok(check(valid.replace('## 検証結果', '```markdown\n## 検証結果') + '\n```').errors.length));
test('unclosed fences and comments fail', () => {
  for (const suffix of ['\n```\n', '\n<!--']) assert.ok(check(valid + suffix).errors.length);
});
test('unrelated docs are not tickets', () => {
  for (const path of ['workflow/docs/templates/ticket.md', 'docs/adr/0001-test.md', 'docs/superpowers/specs/design.md', '.scratch/invitation/spec.md', '.scratch/invitation/issues/01.md', 'docs/superpowers/plans/issues/01.md', 'docs/archive/change/spec.md']) {
    assert.deepEqual(check('not a ticket', path), { errors: [], count: 0 });
  }
});
test('nested tickets are checked', () => {
  const result = check(valid.replace('[x]', '[ ]'), 'docs/archive/invitation/issues/nested/01-expiry.md');
  assert.equal(result.count, 1);
  assert.ok(result.errors.length);
});
test('invalid UTF8 reports error', () => {
  const result = check(Buffer.from([0xff]));
  assert.equal(result.count, 1);
  assert.ok(result.errors.length);
});
test('CLI targets repository parent regardless of cwd, sets exit code, never rewrites', () => {
  const root = mkdtempSync(join(tmpdir(), 'workflow-cli-'));
  try {
    const scriptDir = join(root, 'workflow/scripts/completion-check');
    mkdirSync(scriptDir, { recursive: true });
    writeFileSync(join(root, 'workflow/package.json'), '{"type":"module"}');
    const script = join(scriptDir, 'check-work-items.ts');
    cpSync(fileURLToPath(new URL('./check-work-items.ts', import.meta.url)), script);
    cpSync(fileURLToPath(new URL('./completion.ts', import.meta.url)), join(scriptDir, 'completion.ts'));
    const target = join(root, ticketPath);
    mkdirSync(join(target, '..'), { recursive: true });
    for (const [content, expected] of [[valid, 0], [valid.replace('[x]', '[ ]'), 1]] as const) {
      writeFileSync(target, content);
      const result = spawnSync(process.execPath, [script], { cwd: tmpdir(), encoding: 'utf8' });
      assert.equal(result.status, expected, result.stdout + result.stderr);
      assert.equal(readFileSync(target, 'utf8'), content);
      if (expected) assert.match(result.stderr, /01-expiry.md/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('project template can be filled without adding mandatory draft fields', () => {
  const template = readFileSync(new URL('../../docs/templates/ticket.md', import.meta.url), 'utf8');
  const content = template.replace('<番号>', '01').replace('<チケットのタイトル>', '招待リンク')
    .replace("このチケットで実現する一連の振る舞いを、利用者の視点で記載する。レイヤーごとの実装手順は列挙しない。", '期限切れのリンクで参加できない。')
    .replace('着手前に完了が必要なチケットの番号・タイトルを記載する。依存がなければ「なし（すぐに着手可能）」とする。', 'None (can start immediately)')
    .replace('受け入れ条件 1', '期限内なら参加できる')
    .replace('受け入れ条件 2', '期限切れなら拒否される');
  assert.deepEqual(validateTicket(content, false), []);
  assert.ok(check(template).errors.length);
});

test('duplicate acceptance headings cannot hide unchecked criteria', () => {
  assert.ok(check(valid.replace('## 受け入れ条件', '## 受け入れ条件\n- [ ] 未達\n\n## 受け入れ条件')).errors.length);
});

test('missing frontmatter is rejected', () => {
  assert.ok(check(valid.replace('---\nstatus: done\n---\n', '')).errors.length);
});

test('completion policy judges normalized records without a skill or Markdown', async () => {
  const { checkCompletion } = await import('./completion.ts');
  const completed = {
    status: 'done', criteriaCount: 2, uncheckedCriteria: [],
    hasVerificationResults: true, archived: false,
  };
  assert.deepEqual(checkCompletion(completed), []);
  assert.ok(checkCompletion({ ...completed, uncheckedCriteria: ['期限切れを拒否する'] }).length);
  assert.ok(checkCompletion({ ...completed, hasVerificationResults: false }).length);
  assert.ok(checkCompletion({ ...completed, criteriaCount: 0 }).length);
  assert.ok(checkCompletion({ ...completed, status: 'unknown' }).length);
  assert.deepEqual(checkCompletion({
    ...completed, status: 'in-progress', uncheckedCriteria: ['期限切れを拒否する'],
    hasVerificationResults: false,
  }), []);
  assert.ok(checkCompletion({ ...completed, status: 'in-progress', archived: true }).length);
});

test('作業中は無視し、アーカイブ後に未完了を検出する', () => {
  const pending = valid.replace('[x]', '[ ]');
  assert.deepEqual(check(pending, '.scratch/change/issues/01.md'), { errors: [], count: 0 });
  assert.ok(check(pending, 'docs/archive/change/issues/01.md').errors.length);
});
