import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkWorkflowRepository } from './check-contract.ts';
import { createManifest } from './prepare.ts';

const source = fileURLToPath(new URL('../../', import.meta.url));
function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'completion-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  writeFileSync(join(root, '.gitignore'), 'node_modules/\n.workflow/changes/*.json\nignored/\n');
  writeFileSync(join(root, 'AGENTS.md'), '# 接続\n\nworkflow:prepare verify\n');
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify({ schemaVersion: 1, exceptionDefaultDays: 7,
    exceptionMaximumDays: 30, additionalHighRiskCategories: [], projectChecks: [] }));
  writeFileSync(join(root, 'ticket.md'), '# Reviewed work\n');
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Contract fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.');
  git('commit', '-m', 'test: reviewed work');
  const manifest = createManifest('sample', 'レビュー済み変更');
  Object.assign(manifest, {
    state: 'complete', risk: 'high', classificationConfirmed: true,
    traits: { behaviorChanged: false, publicApiChanged: false, architectureDecisionChanged: false, dataMigration: false, highRiskCategories: ['completion-contract'] },
    artifacts: { ticket: 'ticket.md' }, checks: [{ name: 'fixture', status: 'passed', evidence: 'reviewed fixture' }],
    review: { kind: 'human', approver: 'fixture-only', reviewedAt: '2026-09-15T00:00:00Z', commit: git('rev-parse', 'HEAD') },
  });
  mkdirSync(join(root, '.workflow/changes'), { recursive: true });
  const path = join(root, '.workflow/changes/sample.json');
  const save = () => writeFileSync(path, JSON.stringify(manifest));
  save();
  return { root, git, manifest, path, save };
}

test('同じ承認HEADでも追跡ファイルの未コミット変更を拒否する', t => {
  const { root } = fixture(t);
  assert.deepEqual(checkWorkflowRepository(root), []);
  writeFileSync(join(root, 'ticket.md'), '# Changed after approval\n');
  assert.ok(checkWorkflowRepository(root).some(error => error.includes('未コミット変更')), '承認後の編集を止める');
});

test('staged・untracked・rename・削除を完了時に拒否する', async t => {
  for (const action of ['staged', 'untracked', 'rename', 'delete']) await t.test(action, child => {
    const { root, git } = fixture(child);
    if (action === 'staged') { writeFileSync(join(root, 'ticket.md'), '# staged\n'); git('add', 'ticket.md'); }
    if (action === 'untracked') writeFileSync(join(root, 'new file\n名前.txt'), 'unreviewed');
    if (action === 'rename') git('mv', 'ticket.md', 'renamed ticket.md');
    if (action === 'delete') rmSync(join(root, 'ticket.md'));
    assert.ok(checkWorkflowRepository(root).some(error => error.includes('未コミット変更')), action);
  });
});

test('例外は有効な未追跡マニフェストだけで、追跡済みや不正JSONを許可しない', t => {
  const { root, git, manifest, path, save } = fixture(t);
  // Manifest can be untracked without being ignored; ignored build outputs remain allowed.
  writeFileSync(join(root, '.gitignore'), 'node_modules/\nignored/\n');
  git('add', '.gitignore'); git('commit', '-m', 'test: manifest is untracked');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  mkdirSync(join(root, 'ignored')); writeFileSync(join(root, 'ignored/build.txt'), 'build');
  assert.deepEqual(checkWorkflowRepository(root), []);
  writeFileSync(join(root, '.workflow/changes/not-a-manifest.json'), '{}');
  assert.ok(checkWorkflowRepository(root).length);
  rmSync(join(root, '.workflow/changes/not-a-manifest.json'));
  git('add', '.workflow/changes/sample.json'); git('commit', '-m', 'test: tracked manifest');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  assert.ok(checkWorkflowRepository(root).some(error => error.includes('Git追跡')));
  assert.ok(existsSync(path));
});

test('承認後のコミット変更は失効し、review状態なら通常の開発中検証を許可する', t => {
  const { root, git, manifest, save } = fixture(t);
  git('commit', '--allow-empty', '-m', 'test: new commit');
  assert.ok(checkWorkflowRepository(root).some(error => error.includes('失効')));
  manifest.state = 'review'; save();
  writeFileSync(join(root, 'ticket.md'), '# work in progress\n');
  assert.deepEqual(checkWorkflowRepository(root), []);
});

function cliFixture(t: TestContext, projectCode: string) {
  const result = fixture(t);
  const { root, git, manifest, save } = result;
  cpSync(join(source, 'scripts'), join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'docs/adr'), { recursive: true });
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: {
    'verify:contract': 'node scripts/workflow/check-contract.ts',
    'verify:project': 'node scripts/workflow/verify-project.ts',
  } }));
  const config = JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8'));
  config.projectChecks = [{ name: 'fixture', command: process.execPath, args: ['-e', projectCode] }];
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify(config));
  execFileSync(process.execPath, ['scripts/adr/generate.ts'], { cwd: root });
  git('add', '.'); git('commit', '-m', 'test: real CLI fixture');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  return result;
}

test('検証コマンドが未コミット変更を生成したらfinalizeせずマニフェストを保持する', t => {
  const { root, path } = cliFixture(t, "require('node:fs').writeFileSync('generated.txt', 'changed during verification')");
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.ok(existsSync(path));
  assert.match(result.stdout + result.stderr, /未コミット変更/);
});

test('verifyも検証中に生成された未コミット変更を拒否する', t => {
  const { root } = cliFixture(t, "require('node:fs').writeFileSync('generated.txt', 'changed during verification')");
  const result = spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /未コミット変更/);
});

test('検証中に一時マニフェストを削除・状態変更しても完了判定を迂回できない', async t => {
  for (const entry of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) {
    for (const change of ['delete', 'downgrade']) await t.test(`${entry}: ${change}`, child => {
      const code = change === 'delete'
        ? "require('node:fs').unlinkSync('.workflow/changes/sample.json')"
        : "const fs=require('node:fs');const p='.workflow/changes/sample.json';const m=JSON.parse(fs.readFileSync(p));m.state='review';fs.writeFileSync(p, JSON.stringify(m));";
      const { root } = cliFixture(child, code);
      const result = spawnSync(process.execPath, [entry, ...(entry.includes('finalize') ? ['sample'] : [])], { cwd: root, encoding: 'utf8' });
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, /検証中.*マニフェスト/);
    });
  }
});

test('未追跡の承認記録だけ更新すればfinalizeでき、追跡ファイルは変えない', t => {
  const { root, path, git } = cliFixture(t, "console.log('fixture passed')");
  const before = git('rev-parse', 'HEAD');
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path), false);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('rev-parse', 'HEAD'), before);
});

test('Gitやnpm不足を単なる検証失敗と区別して導入先を案内する', async t => {
  for (const [entry, tool] of [['scripts/workflow/check-contract.ts', 'Git'], ['scripts/workflow/finalize.ts', 'npm']]) {
    await t.test(tool, child => {
      const { root } = cliFixture(child, "console.log('fixture')");
      const empty = mkdtempSync(join(tmpdir(), 'no-workflow-tools-'));
      child.after(() => rmSync(empty, { recursive: true, force: true }));
      const result = spawnSync(process.execPath, [entry, ...(tool === 'npm' ? ['sample'] : [])], {
        cwd: root, encoding: 'utf8', env: { ...process.env, PATH: empty },
      });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, new RegExp(tool + '.*README'));
    });
  }
});
