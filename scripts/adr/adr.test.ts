import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'adr-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scripts = join(root, 'workflow/scripts/adr');
  mkdirSync(scripts, { recursive: true });
  cpSync(new URL('./', import.meta.url), scripts, { recursive: true });
  const dir = join(root, 'docs/adr');
  mkdirSync(dir, { recursive: true });
  return {
    put(name: string, text: string) { writeFileSync(join(dir, name), text); },
    read() { return readFileSync(join(dir, 'README.md'), 'utf8'); },
    run(command: string) { return spawnSync(process.execPath, [join(scripts, command + '.ts')], { encoding: 'utf8', cwd: tmpdir() }); },
  };
}
function adr(id: string, status = 'Accepted', extra = '', title = '判断') {
  return `---\nstatus: ${status}\n${extra}---\n\n# ADR-${id}: ${title}\n\n## 背景\n理由。\n`;
}

test('空の一覧を生成でき、検証は書き換えない', t => {
  const f = fixture(t);
  assert.notEqual(f.run('check').status, 0);
  assert.equal(f.run('generate').status, 0);
  const before = f.read();
  assert.match(before, /ID.*タイトル.*状態.*置き換え元.*後継/);
  assert.equal(f.run('check').status, 0);
  assert.equal(f.read(), before);
  f.put('README.md', before + '手書き');
  assert.notEqual(f.run('check').status, 0);
  assert.equal(f.read(), before + '手書き');
});

test('ID順に生成し、統合・後継・タイトルの記号を表示する', t => {
  const f = fixture(t);
  f.put('0003-new.md', adr('0003', 'Accepted', 'supersedes: ["0001", "0002"]\n', 'A | [B] <C>'));
  f.put('0002-old.md', adr('0002', 'Superseded'));
  f.put('0001-old.md', adr('0001', 'Superseded'));
  assert.equal(f.run('generate').status, 0);
  const text = f.read();
  assert.ok(text.indexOf('| 0001 |') < text.indexOf('| 0003 |'));
  assert.match(text, /\[0003\]\(0003-new.md\)/);
  assert.match(text, /\[0001\]\(0001-old.md\), \[0002\]\(0002-old.md\)/);
  assert.match(text, /A &#124; &#91;B&#93; &lt;C&gt;/);
  assert.equal(f.run('check').status, 0);
});

const invalid: [string, Record<string, string>][] = [
  ['ID不一致', { '0001-one.md': adr('0002') }],
  ['ID重複', { '0001-one.md': adr('0001'), '0001-two.md': adr('0001') }],
  ['不正な状態', { '0001-one.md': adr('0001', 'Proposed') }],
  ['不正なファイル名', { 'one.md': adr('0001') }],
  ['空タイトル', { '0001-one.md': adr('0001', 'Accepted', '', '') }],
  ['欠落参照', { '0001-one.md': adr('0001', 'Accepted', 'supersedes: ["9999"]\n') }],
  ['自己参照', { '0001-one.md': adr('0001', 'Superseded', 'supersedes: ["0001"]\n') }],
  ['後継なし', { '0001-one.md': adr('0001', 'Superseded') }],
  ['旧状態未更新', { '0001-one.md': adr('0001'), '0002-two.md': adr('0002', 'Accepted', 'supersedes: ["0001"]\n') }],
  ['循環', { '0001-one.md': adr('0001', 'Superseded', 'supersedes: ["0002"]\n'), '0002-two.md': adr('0002', 'Superseded', 'supersedes: ["0001"]\n') }],
  ['非文字列ID', { '0001-one.md': adr('0001', 'Accepted', 'supersedes: [0002]\n') }],
  ['空配列', { '0001-one.md': adr('0001', 'Accepted', 'supersedes: []\n') }],
  ['重複参照', { '0001-one.md': adr('0001', 'Accepted', 'supersedes: ["0002", "0002"]\n') }],
  ['重複キー', { '0001-one.md': adr('0001', 'Accepted', 'status: Deprecated\n') }],
];
for (const [name, files] of invalid) test(name + 'を拒否し既存一覧を保持する', t => {
  const f = fixture(t);
  f.put('README.md', '既存一覧');
  for (const [file, content] of Object.entries(files)) f.put(file, content);
  for (const command of ['generate', 'check']) {
    const result = f.run(command);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /ADR/);
    assert.equal(f.read(), '既存一覧');
  }
});
