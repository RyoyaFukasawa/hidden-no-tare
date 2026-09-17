import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

function fixture(t: { after: (fn: () => void) => void }) {
  const root = mkdtempSync(join(tmpdir(), 'adr-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const scripts = join(root, 'scripts/adr');
  mkdirSync(scripts, { recursive: true });
  cpSync(new URL('./', import.meta.url), scripts, { recursive: true });
  const dir = join(root, 'docs/adr');
  mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: root });
  return {
    put(name: string, text: string) { writeFileSync(join(dir, name), text); },
    document(name: string) { return readFileSync(join(dir, name), 'utf8'); },
    read() { return readFileSync(join(dir, 'README.md'), 'utf8'); },
    run(command: string) { return spawnSync(process.execPath, [join(scripts, command + '.ts')], { encoding: 'utf8', cwd: tmpdir() }); },
  };
}
function adr(id: string, status = 'Accepted', extra = '', title = '判断') {
  const body = `\n# ADR-${id}: ${title}\n\n## 背景\n理由。\n`;
  const record = status === 'Draft' ? '' : `approvedBy: "fixture-only"\napprovedAt: "2026-09-15T00:00:00Z"\napprovedBodySha256: "${createHash('sha256').update(body).digest('hex')}"\n`;
  return `---\nstatus: ${status}\n${extra}${record}---\n${body}`;
}

const approvedBody = '\n# ADR-0001: Approval fixture\n\nBody.\n';
// 独立に計算した既知の本文SHA。実装のハッシュ関数から期待値を生成しない。
const approvedHash = 'de79e697f08e2691c08eb1356da8a5024422c8e54756c72cd17ee9843b6e81c3';
const approval = `approvedBy: "fixture-only"\napprovedAt: "2026-09-15T00:00:00Z"\napprovedBodySha256: "${approvedHash}"\n`;
const approved = `---\nstatus: Accepted\n${approval}---\n${approvedBody}`;

test('承認記録付き本文をマニフェストなしで検証できる', t => {
  const f = fixture(t);
  f.put('0001-approved.md', approved);
  const result = f.run('generate');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.run('check').status, 0);
});

test('Acceptedと書くだけでは承認済みにならない', t => {
  const f = fixture(t);
  f.put('0001-approved.md', `---\nstatus: Accepted\n---\n${approvedBody}`);
  const result = f.run('generate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /承認/);
});

test('承認後の本文変更を拒否し原文と一覧を保持する', t => {
  const f = fixture(t);
  f.put('0001-approved.md', approved);
  assert.equal(f.run('generate').status, 0);
  const before = f.read();
  f.put('0001-approved.md', approved.replace('Body.', 'Changed.'));
  for (const mode of ['check', 'generate']) {
    const result = f.run(mode);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /本文.*承認|承認.*本文/);
    assert.equal(f.read(), before);
    assert.equal(f.document('0001-approved.md'), approved.replace('Body.', 'Changed.'));
  }
});

test('本文の空白・コメント・リンク・末尾改行の変更も拒否する', async t => {
  for (const [name, body] of [
    ['空白', approvedBody.replace('Body.', 'Body. ')],
    ['コメント', approvedBody + '<!-- note -->\n'],
    ['リンク', approvedBody + '[other](other.md)\n'],
    ['末尾改行', approvedBody.trimEnd()],
    ['先頭空行', approvedBody.slice(1)],
    ['タイトル', approvedBody.replace('Approval fixture', 'Approval fixture updated')],
  ]) await t.test(name, child => {
    const f = fixture(child);
    f.put('0001-approved.md', approved.replace(approvedBody, body));
    const result = f.run('generate');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /本文.*承認/);
  });
});

test('承認メタデータだけの有効な更新と再生成では本文は失効しない', t => {
  const f = fixture(t);
  f.put('0001-approved.md', approved);
  assert.equal(f.run('generate').status, 0);
  const before = f.read();
  const updated = approved.replace('fixture-only', 'another-fixture-reader')
    .replace('2026-09-15T00:00:00Z', '2026-09-15T00:01:00.123Z');
  f.put('0001-approved.md', updated);
  assert.equal(f.run('check').status, 0);
  assert.equal(f.run('generate').status, 0);
  assert.equal(f.read(), before);
  assert.equal(f.document('0001-approved.md'), updated);
});

test('本文変更は新しい本文承認で再び検証できる', t => {
  const f = fixture(t);
  const changed = approved.replace('Body.', 'Reapproved body.');
  f.put('0001-approved.md', changed);
  assert.equal(f.run('generate').status, 1);
  const newHash = createHash('sha256').update(approvedBody.replace('Body.', 'Reapproved body.')).digest('hex');
  f.put('0001-approved.md', changed.replace(approvedHash, newHash));
  assert.equal(f.run('generate').status, 0);
  assert.equal(f.run('check').status, 0);
});

test('承認記録の欠落・重複・型不正・ハッシュ不正は診断付きで拒否する', async t => {
  const cases: [string, string][] = [
    ...['approvedBy', 'approvedAt', 'approvedBodySha256'].map(key => [key + '欠落', approved.replace(new RegExp(key + ': [^\\n]*\\n'), '')] as [string, string]),
    ['重複', approved.replace('approvedBy:', 'approvedBy: "duplicate"\napprovedBy:')],
    ['未知キー', approved.replace('approvedBy:', 'approval: true\napprovedBy:')],
    ['SHA型不正', approved.replace('"' + approvedHash + '"', '[]')],
    ['SHA構文不正', approved.replace('"' + approvedHash + '"', 'broken')],
    ['SHA短縮', approved.replace(approvedHash, approvedHash.slice(0, 40))],
    ['SHA大文字', approved.replace(approvedHash, approvedHash.toUpperCase())],
    ['SHA空', approved.replace(approvedHash, '')],
  ];
  for (const [name, content] of cases) await t.test(name, child => {
    const f = fixture(child);
    f.put('README.md', '既存一覧');
    f.put('0001-approved.md', content);
    for (const mode of ['check', 'generate']) {
      const result = f.run(mode);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /0001-approved.md/);
      assert.equal(f.read(), '既存一覧');
      assert.equal(f.document('0001-approved.md'), content);
    }
  });
});

test('Deprecatedも過去に承認した本文の一致を要求する', t => {
  const f = fixture(t);
  f.put('0001-approved.md', approved.replace('Accepted', 'Deprecated'));
  assert.equal(f.run('generate').status, 0);
  assert.equal(f.run('check').status, 0);
  f.put('0001-approved.md', approved.replace('Accepted', 'Deprecated').replace('Body.', 'Changed.'));
  assert.equal(f.run('check').status, 1);
});

test('改行コードだけの本文変更も再承認が必要', t => {
  const f = fixture(t);
  f.put('0001-approved.md', approved.replace(/\n/g, '\r\n'));
  const result = f.run('generate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /本文/);
});

test('不正な承認者・日時を拒否する', async t => {
  const cases: [string, string, string][] = [
    ['空承認者', '"fixture-only"', '" "'],
    ['型不正承認者', '"fixture-only"', '42'],
    ['非JSON文字列', '"fixture-only"', 'fixture-only'],
    ['承認者改行', '"fixture-only"', '"reader\\nother"'],
    ['空日時', '"2026-09-15T00:00:00Z"', '""'],
    ['日時型不正', '"2026-09-15T00:00:00Z"', 'null'],
    ['不存在日付', '"2026-09-15T00:00:00Z"', '"2026-02-30T00:00:00Z"'],
    ['非UTC', '"2026-09-15T00:00:00Z"', '"2026-09-15T00:00:00+09:00"'],
  ];
  for (const [name, from, to] of cases) await t.test(name, child => {
    const f = fixture(child);
    f.put('0001-approved.md', approved.replace(from, to));
    const result = f.run('generate');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /承認/);
  });
});

test('草案に承認記録を混在させて検査を回避できない', t => {
  const f = fixture(t);
  f.put('0001-approved.md', approved.replace('Accepted', 'Draft').replace('Body.', 'Changed.'));
  const result = f.run('generate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /草案.*承認/);
});

test('未承認草案を一覧へ載せて検証できる', t => {
  const f = fixture(t);
  f.put('0001-draft.md', adr('0001', 'Draft'));
  const generated = f.run('generate');
  assert.equal(generated.status, 0, generated.stderr);
  assert.match(f.read(), /\| Draft \|/);
  assert.equal(f.run('check').status, 0);
});

test('置き換え草案は旧ADRを未採用の後継で失効させない', t => {
  const f = fixture(t);
  f.put('0001-old.md', adr('0001'));
  f.put('0002-new.md', adr('0002', 'Draft', 'supersedes: ["0001"]\n'));
  const generated = f.run('generate');
  assert.equal(generated.status, 0, generated.stderr);
  assert.match(f.read(), /\| 0001 \|.*\| Accepted \| — \| — \|/);
  assert.match(f.read(), /\| 0002 \|.*\| Draft \| \[0001\]/);
  assert.equal(f.run('check').status, 0);
  f.put('0001-old.md', adr('0001', 'Superseded'));
  assert.equal(f.run('check').status, 1, '未承認の後継では旧ADRをSupersededにできない');
  f.put('0002-new.md', adr('0002', 'Accepted', 'supersedes: ["0001"]\n'));
  assert.equal(f.run('generate').status, 0);
  assert.match(f.read(), /\| 0001 \|.*\| Superseded \| — \| \[0002\]/);
  assert.equal(f.run('check').status, 0);
});

test('草案を別の草案の置き換え元にはできない', t => {
  const f = fixture(t);
  f.put('0001-old.md', adr('0001', 'Draft'));
  f.put('0002-new.md', adr('0002', 'Draft', 'supersedes: ["0001"]\n'));
  const result = f.run('generate');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /草案.*置き換え元/);
});

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
    assert.doesNotMatch(result.stderr, /承認/, '形式・グラフの失敗を承認不備で代替しない');
    assert.equal(f.read(), '既存一覧');
  }
});
