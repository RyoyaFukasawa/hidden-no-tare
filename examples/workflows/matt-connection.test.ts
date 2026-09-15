import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../../', import.meta.url));
function fixture(t: TestContext, includeMatt = true) {
  const root = mkdtempSync(join(tmpdir(), 'matt-connection-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  cpSync(join(source, 'scripts'), join(root, 'scripts'), { recursive: true });
  cpSync(join(source, 'docs'), join(root, 'docs'), { recursive: true,
    filter: path => path !== join(source, 'docs/agents/issue-tracker.md') });
  for (const file of ['AGENTS.md', 'CONTEXT.md', 'README.md', '.gitignore']) cpSync(join(source, file), join(root, file));
  if (existsSync(join(source, 'work'))) cpSync(join(source, 'work'), join(root, 'work'), { recursive: true });
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  mkdirSync(join(root, '.workflow/connections'), { recursive: true });
  if (includeMatt) cpSync(join(source, '.workflow/connections/matt.json'), join(root, '.workflow/connections/matt.json'));
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify({ schemaVersion: 1, exceptionDefaultDays: 7,
    exceptionMaximumDays: 30, additionalHighRiskCategories: [],
    projectChecks: [{ name: 'fixture', command: process.execPath, args: ['-e', "console.log('fixture passed')"] }] }));
  const run = (entry: string, ...args: string[]) => {
    const result = spawnSync(process.execPath, [entry, ...args], { cwd: root, encoding: 'utf8' });
    return { status: result.status, output: result.stdout + result.stderr };
  };
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  git('init', '--initial-branch=main'); git('config', 'user.name', 'Matt fixture');
  git('config', 'user.email', 'fixture@example.invalid'); git('add', '.'); git('commit', '-m', 'test: Matt fixture');
  return { root, run, git, connection: (...args: string[]) => run('scripts/workflow/connections.ts', ...args) };
}

test('同梱Matt定義で準備し、資料を共通側へ移管して撤去しても成果物は残る', t => {
  const f = fixture(t);
  const fixed = join(f.root, 'docs/agents/issue-tracker.md');
  assert.ok(!existsSync(fixed), '未接続時はMatt文書を同梱しない');
  const attached = f.connection('attach', 'matt'); assert.equal(attached.status, 0, attached.output);
  assert.match(readFileSync(fixed, 'utf8'), /ローカルMarkdown/);
  const draft = join(f.root, '.workflow/external/matt/draft.md'); writeFileSync(draft, '# 保存する仕様\n');
  const active = f.run('scripts/verify.ts'); assert.equal(active.status, 0, active.output);
  assert.notEqual(f.connection('detach', 'matt').status, 0);
  const product = join(f.root, 'docs/product/promoted.md'); renameSync(draft, product);
  const detached = f.connection('detach', 'matt'); assert.equal(detached.status, 0, detached.output);
  assert.ok(!existsSync(fixed)); assert.ok(!existsSync(join(f.root, '.workflow/external/matt')));
  assert.equal(readFileSync(product, 'utf8'), '# 保存する仕様\n');
  const independent = f.run('scripts/verify.ts'); assert.equal(independent.status, 0, independent.output);
});

test('Mattの固定パスに既存データがあれば上書きせず接続を拒否する', t => {
  const f = fixture(t); mkdirSync(join(f.root, 'docs/agents'), { recursive: true });
  const fixed = join(f.root, 'docs/agents/issue-tracker.md'); writeFileSync(fixed, '# 利用者の追記\n');
  const result = f.connection('attach', 'matt'); assert.notEqual(result.status, 0);
  assert.match(result.output, /上書き/); assert.equal(readFileSync(fixed, 'utf8'), '# 利用者の追記\n');
  assert.ok(!existsSync(join(f.root, '.workflow/external/matt')));
});

test('Matt定義・互換文書・SKILL・アダプターがなくても共通verifyが通る', t => {
  const f = fixture(t, false);
  for (const path of ['.workflow/connections/matt.json', 'docs/agents/issue-tracker.md', '.codex/skills', 'adapters']) {
    assert.ok(!existsSync(join(f.root, path)), path);
  }
  const result = f.run('scripts/verify.ts'); assert.equal(result.status, 0, result.output);
  assert.ok(!existsSync(join(f.root, '.workflow/external')));
});
