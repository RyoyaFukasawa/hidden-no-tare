import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../', import.meta.url));
function fixture(t: TestContext, projectCode = "console.log('fixture passed')") {
  const root = mkdtempSync(join(tmpdir(), 'connection-cli-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(source, 'scripts'), join(root, 'scripts'), { recursive: true });
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  mkdirSync(join(root, 'docs/adr'), { recursive: true });
  mkdirSync(join(root, 'docs/archive'), { recursive: true });
  mkdirSync(join(root, 'docs/product'), { recursive: true });
  mkdirSync(join(root, 'docs/templates'), { recursive: true });
  mkdirSync(join(root, '.workflow/connections'), { recursive: true });
  writeFileSync(join(root, '.gitignore'), 'node_modules/\n.workflow/changes/\n.workflow/logs/\n.workflow/external/\n.workflow/connection-state/\n/CONNECTION-INFO.md\n/OTHER-CONNECTION-INFO.md\n');
  writeFileSync(join(root, 'AGENTS.md'), '# Fixture\n\nworkflow:prepare verify\n');
  writeFileSync(join(root, 'ticket.md'), '# Ticket\n');
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify({ schemaVersion: 1,
    exceptionDefaultDays: 7, exceptionMaximumDays: 30, additionalHighRiskCategories: [],
    projectChecks: [{ name: 'fixture', command: process.execPath, args: ['-e', projectCode] }] }));
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: {
    'verify:contract': 'node scripts/workflow/check-contract.ts',
    'verify:project': 'node scripts/workflow/verify-project.ts',
  } }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  const run = (entry: string, ...args: string[]) => {
    const result = spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
  };
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  git('init', '--initial-branch=main'); git('config', 'user.name', 'Connection fixture');
  git('config', 'user.email', 'fixture@example.invalid'); git('add', '.'); git('commit', '-m', 'test: fixture');
  assert.equal(run('scripts/workflow/prepare.ts', 'sample', 'connection fixture').status, 0);
  const manifestPath = join(root, '.workflow/changes/sample.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  Object.assign(manifest, { state: 'review', risk: 'high', classificationConfirmed: true,
    traits: { behaviorChanged: false, publicApiChanged: false, architectureDecisionChanged: false,
      dataMigration: false, highRiskCategories: ['completion-contract'] }, artifacts: { ticket: 'ticket.md' },
    checks: [{ name: 'fixture', status: 'passed', evidence: 'test-only' }] });
  const save = () => writeFileSync(manifestPath, JSON.stringify(manifest));
  const approve = () => {
    git('add', '.'); git('commit', '--allow-empty', '-m', 'test: reviewed fixture');
    Object.assign(manifest, { state: 'complete', review: { kind: 'human', approver: 'fixture-only',
      reviewedAt: '2026-09-15T00:00:00Z', commit: git('rev-parse', 'HEAD') } }); save();
  };
  const define = (id = 'demo', compatibility: Record<string, string> = { 'CONNECTION-INFO.md': '# Demo\n' }) => {
    writeFileSync(join(root, `.workflow/connections/${id}.json`), JSON.stringify({ schemaVersion: 1, id,
      files: { 'config.md': '# External config\n' }, compatibility }));
    git('add', '.workflow/connections'); git('commit', '-m', 'test: connection definition');
  };
  save();
  return { root, git, run, define, manifest, manifestPath, save, approve,
    connection: (...args: string[]) => run('scripts/workflow/connections.ts', ...args) };
}

test('接続CLIは定義から専用領域と固定パスを生成し未変更の接続を撤去できる', t => {
  const f = fixture(t); f.define();
  const attached = f.connection('attach', 'demo');
  assert.equal(attached.status, 0, attached.output);
  assert.equal(readFileSync(join(f.root, '.workflow/external/demo/config.md'), 'utf8'), '# External config\n');
  assert.equal(readFileSync(join(f.root, 'CONNECTION-INFO.md'), 'utf8'), '# Demo\n');
  assert.ok(existsSync(join(f.root, '.workflow/connection-state/demo.json')));
  const detached = f.connection('detach', 'demo');
  assert.equal(detached.status, 0, detached.output);
  assert.equal(existsSync(join(f.root, '.workflow/external/demo')), false);
  assert.equal(existsSync(join(f.root, 'CONNECTION-INFO.md')), false);
  assert.equal(existsSync(join(f.root, '.workflow/connection-state/demo.json')), false);
  assert.equal(f.git('status', '--porcelain'), '');
});

test('作業資料は通常検証で保持し、全接続を対象に完了と撤去を拒否する', t => {
  const f = fixture(t); f.define(); f.define('other', { 'OTHER-CONNECTION-INFO.md': '# Other\n' });
  assert.equal(f.connection('attach', 'demo').status, 0);
  assert.equal(f.connection('attach', 'other').status, 0);
  const data = join(f.root, '.workflow/external/other/draft.md');
  writeFileSync(data, '# Keep me\n');
  const normal = f.run('scripts/workflow/check-contract.ts');
  assert.equal(normal.status, 0, normal.output);
  assert.notEqual(f.connection('detach', 'other').status, 0);
  f.approve();
  const completed = f.run('scripts/workflow/finalize.ts', 'sample');
  assert.notEqual(completed.status, 0, completed.output);
  assert.match(completed.output, /未移管/);
  assert.equal(readFileSync(data, 'utf8'), '# Keep me\n');
  assert.ok(existsSync(f.manifestPath));
  rmSync(data); // Explicit discard by the user, not the connection manager.
  const retried = f.run('scripts/workflow/finalize.ts', 'sample');
  assert.equal(retried.status, 0, retried.output);
  assert.ok(!existsSync(f.manifestPath));
  assert.ok(existsSync(join(f.root, '.workflow/external/demo/config.md')));
  assert.equal(f.connection('detach', 'other').status, 0);
  assert.equal(f.connection('detach', 'demo').status, 0);
});

test('検証中に接続全体を消しても完了ゲートを迂回できずマニフェストを保持する', t => {
  const f = fixture(t, "require('node:fs').rmSync('.workflow/connection-state', {recursive:true}); require('node:fs').rmSync('.workflow/external', {recursive:true}); require('node:fs').unlinkSync('CONNECTION-INFO.md')");
  f.define(); assert.equal(f.connection('attach', 'demo').status, 0); f.approve();
  const result = f.run('scripts/workflow/finalize.ts', 'sample');
  assert.notEqual(result.status, 0, result.output);
  assert.match(result.output, /検証中.*接続/);
  assert.ok(existsSync(f.manifestPath));
});

test('生成後の変更はUTF-8の置換文字に見えてもバイト単位で検出し保持する', t => {
  const f = fixture(t); f.define('demo', { 'CONNECTION-INFO.md': '\ufffd' });
  assert.equal(f.connection('attach', 'demo').status, 0);
  const path = join(f.root, 'CONNECTION-INFO.md'); writeFileSync(path, Buffer.from([0xff]));
  assert.notEqual(f.connection('detach', 'demo').status, 0);
  assert.deepEqual(readFileSync(path), Buffer.from([0xff]));
});

test('接続定義の不正なUTF-8を黙って置換して生成しない', t => {
  const f = fixture(t); f.define();
  const path = join(f.root, '.workflow/connections/demo.json');
  writeFileSync(path, Buffer.concat([Buffer.from('{"schemaVersion":1,"id":"demo","files":{"a":"'), Buffer.from([0xff]), Buffer.from('"},"compatibility":{}}')]));
  assert.notEqual(f.connection('attach', 'demo').status, 0);
  assert.ok(!existsSync(join(f.root, '.workflow/external/demo')));
});

test('既存固定ファイルと他接続の予約パスは上書きも奪取もしない', t => {
  const f = fixture(t); f.define(); f.define('other');
  const fixed = join(f.root, 'CONNECTION-INFO.md'); writeFileSync(fixed, '# User data');
  assert.notEqual(f.connection('attach', 'demo').status, 0);
  assert.equal(readFileSync(fixed, 'utf8'), '# User data');
  assert.ok(!existsSync(join(f.root, '.workflow/external/demo')));
  rmSync(fixed);
  assert.equal(f.connection('attach', 'demo').status, 0);
  rmSync(fixed); // A missing owned file still reserves its path.
  assert.notEqual(f.connection('attach', 'other').status, 0);
  assert.equal(f.connection('detach', 'demo').status, 0);
  assert.equal(f.connection('attach', 'other').status, 0);
});

test('ルート直下の互換ファイルも生成し、未変更なら撤去できる', t => {
  const f = fixture(t);
  writeFileSync(join(f.root, '.gitignore'), readFileSync(join(f.root, '.gitignore'), 'utf8') + '/PLAN.md\n');
  f.define('demo', { 'PLAN.md': '# Connection plan\n' });
  const result = f.connection('attach', 'demo'); assert.equal(result.status, 0, result.output);
  assert.equal(readFileSync(join(f.root, 'PLAN.md'), 'utf8'), '# Connection plan\n');
  const removed = f.connection('detach', 'demo'); assert.equal(removed.status, 0, removed.output);
  assert.ok(!existsSync(join(f.root, 'PLAN.md')));
});

for (const kind of ['symlink', 'file']) {
  test(`生成ファイルなしの接続でも専用領域の置換を通常verifyで拒否する: ${kind}`, t => {
    const f = fixture(t); f.define('demo', {});
    const path = join(f.root, '.workflow/connections/demo.json');
    writeFileSync(path, JSON.stringify({ schemaVersion: 1, id: 'demo', files: {}, compatibility: {} }));
    assert.equal(f.connection('attach', 'demo').status, 0);
    const area = join(f.root, '.workflow/external/demo'); rmSync(area, { recursive: true });
    if (kind === 'symlink') symlinkSync(join(f.root, 'docs'), area, 'dir'); else writeFileSync(area, '# Keep');
    const result = f.run('scripts/workflow/check-contract.ts'); assert.notEqual(result.status, 0, result.output);
    assert.ok(existsSync(area));
  });
}

test('変更済みの生成物と空の作業ディレクトリは自動削除せず、手動移管後に撤去できる', t => {
  const f = fixture(t); f.define(); assert.equal(f.connection('attach', 'demo').status, 0);
  const config = join(f.root, '.workflow/external/demo/config.md'); writeFileSync(config, '# Valuable');
  assert.notEqual(f.connection('detach', 'demo').status, 0);
  assert.equal(readFileSync(config, 'utf8'), '# Valuable');
  renameSync(config, join(f.root, 'promoted.md'));
  const empty = join(f.root, '.workflow/external/demo/research'); mkdirSync(empty);
  assert.notEqual(f.connection('detach', 'demo').status, 0);
  assert.ok(existsSync(empty)); rmSync(empty, { recursive: true });
  assert.equal(f.connection('detach', 'demo').status, 0);
  assert.equal(readFileSync(join(f.root, 'promoted.md'), 'utf8'), '# Valuable');
});

for (const bad of [null, [], {}, { files: null }, { files: { '../escape': 'bad' } },
  { files: { '/escape': 'bad' } }, { files: { 'a/../../escape': 'bad' } },
  { files: { 'a': 'x', 'a/b': 'y' } }, { files: { 'A': 'x', 'a': 'y' } },
  { files: { 'a': 3 } }, { compatibility: { 'docs/product/injected.md': 'bad' } },
  { compatibility: { '.git/config': 'bad' } }, { unexpected: true }]) {
  test(`不正な定義を拒否して生成しない: ${JSON.stringify(bad)}`, t => {
    const f = fixture(t); f.define();
    const path = join(f.root, '.workflow/connections/demo.json');
    const valid = JSON.parse(readFileSync(path, 'utf8'));
    writeFileSync(path, JSON.stringify(bad && !Array.isArray(bad) && Object.keys(bad).length ? { ...valid, ...bad } : bad));
    assert.notEqual(f.connection('attach', 'demo').status, 0);
    assert.ok(!existsSync(join(f.root, '.workflow/external/demo')));
  });
}

for (const kind of ['corrupt', 'foreign-path', 'phase', 'definition-changed', 'missing-state', 'tracked-state', 'tracked-file', 'symlink', 'hardlink', 'parent-symlink'] as const) {
  test(`不明な所有状態では撤去も通常検証も拒否しファイルを保持する: ${kind}`, t => {
    const f = fixture(t); f.define(); assert.equal(f.connection('attach', 'demo').status, 0);
    const state = join(f.root, '.workflow/connection-state/demo.json');
    const config = join(f.root, '.workflow/external/demo/config.md');
    const valuable = join(f.root, 'valuable.md'); writeFileSync(valuable, '# Keep');
    if (kind === 'corrupt') writeFileSync(state, '{');
    if (kind === 'foreign-path' || kind === 'phase') {
      const data = JSON.parse(readFileSync(state, 'utf8'));
      if (kind === 'foreign-path') data.directories = ['../outside']; else data.phase = 'preparing';
      writeFileSync(state, JSON.stringify(data));
    }
    if (kind === 'definition-changed') {
      const path = join(f.root, '.workflow/connections/demo.json'); writeFileSync(path, readFileSync(path, 'utf8') + '\n');
    }
    if (kind === 'missing-state') rmSync(state);
    if (kind === 'tracked-state') f.git('add', '-f', '.workflow/connection-state/demo.json');
    if (kind === 'tracked-file') f.git('add', '-f', '.workflow/external/demo/config.md');
    if (kind === 'symlink' || kind === 'hardlink') { rmSync(config); if (kind === 'symlink') symlinkSync(valuable, config); else linkSync(valuable, config); }
    if (kind === 'parent-symlink') {
      renameSync(join(f.root, '.workflow/external/demo'), join(f.root, 'moved'));
      symlinkSync(join(f.root, 'moved'), join(f.root, '.workflow/external/demo'), 'dir');
    }
    assert.notEqual(f.connection('detach', 'demo').status, 0);
    assert.notEqual(f.run('scripts/workflow/check-contract.ts').status, 0);
    assert.equal(readFileSync(valuable, 'utf8'), '# Keep');
    assert.ok(existsSync(config));
    assert.ok(existsSync(join(f.root, 'CONNECTION-INFO.md')));
  });
}

test('接続なしの通常検証と完了は外部領域を作らない', t => {
  const f = fixture(t);
  assert.equal(f.run('scripts/workflow/check-contract.ts').status, 0);
  f.approve(); const result = f.run('scripts/workflow/finalize.ts', 'sample');
  assert.equal(result.status, 0, result.output);
  assert.ok(!existsSync(join(f.root, '.workflow/external')));
  assert.ok(!existsSync(join(f.root, '.workflow/connection-state')));
});

test('別worktreeの未移管データは検査も撤去もしない', t => {
  const f = fixture(t); f.define();
  const other = join(f.root, 'other-worktree');
  f.git('worktree', 'add', '-b', 'other', other);
  mkdirSync(join(other, '.workflow/external/unowned'), { recursive: true });
  const data = join(other, '.workflow/external/unowned/draft.md'); writeFileSync(data, '# Other worktree');
  assert.equal(f.connection('attach', 'demo').status, 0);
  assert.equal(f.connection('detach', 'demo').status, 0);
  assert.equal(f.run('scripts/workflow/check-contract.ts').status, 0);
  assert.equal(readFileSync(data, 'utf8'), '# Other worktree');
});

test('接続操作の残存ロックは自動削除せず競合を案内する', t => {
  const f = fixture(t); f.define();
  const lock = join(f.root, '.workflow/connection-state/.lock'); mkdirSync(lock, { recursive: true });
  const result = f.connection('attach', 'demo');
  assert.notEqual(result.status, 0); assert.match(result.output, /ロック/);
  assert.ok(existsSync(lock));
  assert.notEqual(f.run('scripts/workflow/check-contract.ts').status, 0);
});

test('通常verifyは作業データを保持し、完了verifyは拒否し、整理後は通る', t => {
  const f = fixture(t); f.define(); assert.equal(f.connection('attach', 'demo').status, 0);
  const data = join(f.root, '.workflow/external/demo/draft.json'); writeFileSync(data, 'not JSON');
  const normal = f.run('scripts/verify.ts'); assert.equal(normal.status, 0, normal.output);
  f.approve(); const refused = f.run('scripts/verify.ts');
  assert.notEqual(refused.status, 0); assert.match(refused.output, /未移管/);
  assert.equal(readFileSync(data, 'utf8'), 'not JSON'); rmSync(data);
  const completed = f.run('scripts/verify.ts'); assert.equal(completed.status, 0, completed.output);
  assert.ok(existsSync(f.manifestPath)); // verify never finalizes implicitly.
});

for (const entry of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) {
  test(`${entry}は検証中に生成ファイルが移動された場合も完了を拒否する`, t => {
    const f = fixture(t, "require('node:fs').unlinkSync('.workflow/external/demo/config.md')");
    f.define(); assert.equal(f.connection('attach', 'demo').status, 0); f.approve();
    const result = f.run(entry, ...(entry.includes('finalize') ? ['sample'] : []));
    assert.notEqual(result.status, 0, result.output); assert.match(result.output, /検証中.*接続/);
    assert.ok(existsSync(f.manifestPath));
  });
}
