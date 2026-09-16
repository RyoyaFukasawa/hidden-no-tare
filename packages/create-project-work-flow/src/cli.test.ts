import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const cli = resolve('packages/create-project-work-flow/src/cli.ts');

function fixture(files: Record<string, string> = { 'README.md': '# Fixture\n' }): string {
  const root = mkdtempSync(join(tmpdir(), 'project-work-flow-'));
  for (const [path, content] of Object.entries(files)) {
    const target = join(root, path);
    mkdirSync(resolve(target, '..'), { recursive: true });
    writeFileSync(target, content);
  }
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Fixture'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'fixture@example.invalid'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root });
  return root;
}

function run(root: string, args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  return spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, ...extraEnv } });
}

function templateTarball(): { path: string; directory: string } {
  const directory = mkdtempSync(join(tmpdir(), 'project-work-flow-source-'));
  const path = join(directory, 'create-project-work-flow.tgz');
  cpSync(resolve('packages/create-project-work-flow'), join(directory, 'package'), { recursive: true });
  execFileSync('tar', ['-czf', path, '-C', directory, 'package']);
  return { path, directory };
}

test('initializes a new repository without installing dependencies', () => {
  const root = fixture();
  try {
    const result = run(root, ['init', '--project-name', 'demo', '--package-manager', 'npm']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8')).projectChecks.length, 0);
    assert.equal(JSON.parse(readFileSync(join(root, '.workflow/setup-manifest.json'), 'utf8')).projectName, 'demo');
    assert.ok(existsSync(join(root, 'AGENTS.md')));
    assert.ok(existsSync(join(root, 'scripts/verify.ts')));
    assert.ok(readdirSync(root).includes('package.json'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a repository with application files without changing it', () => {
  const root = fixture({ 'README.md': '# Fixture\n', 'src/index.ts': 'export {};\n' });
  try {
    const result = run(root, ['init']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /新規|途中導入|既存/);
    assert.equal(existsSync(join(root, 'AGENTS.md')), false);
    assert.equal(existsSync(join(root, '.workflow/setup-manifest.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects an allowed-path symlink without following it', () => {
  const root = fixture({ 'README.md': '# Fixture\n' });
  const outside = join(root, '..', `${root.split('/').pop()}-outside`);
  writeFileSync(outside, 'outside\n');
  rmSync(join(root, 'README.md'));
  symlinkSync(outside, join(root, 'README.md'));
  try {
    const result = run(root, ['init']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /通常ファイル|symlink|停止/);
    assert.equal(readFileSync(outside, 'utf8'), 'outside\n');
    assert.equal(existsSync(join(root, 'AGENTS.md')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(outside, { force: true });
  }
});

test('rejects dangling allowed-path symlinks without creating their targets', () => {
  for (const entry of ['README.md', '.gitignore']) {
    const root = fixture({ 'README.md': '# Fixture\n' });
    const target = join(root, `${entry}.outside-target`);
    rmSync(join(root, entry), { force: true });
    symlinkSync(target, join(root, entry));
    try {
      const result = run(root, ['init']);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /通常ファイル|停止/);
      assert.equal(existsSync(target), false);
      assert.equal(existsSync(join(root, 'AGENTS.md')), false);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }
});

test('dry-run reports changes without writing them', () => {
  const root = fixture();
  try {
    const result = run(root, ['init', '--dry-run']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /dry-run|予定|変更/i);
    assert.equal(existsSync(join(root, 'AGENTS.md')), false);
    assert.equal(existsSync(join(root, '.workflow/setup-manifest.json')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('re-running init on the same generated state is idempotent', () => {
  const root = fixture();
  try {
    const first = run(root, ['init', '--package-manager', 'npm']);
    assert.equal(first.status, 0, first.stderr);
    const second = run(root, ['init', '--package-manager', 'npm']);
    assert.equal(second.status, 0, second.stderr);
    assert.match(second.stdout, /済み|再実行|完了/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('update stops when an owned file was changed', () => {
  const root = fixture();
  const source = templateTarball();
  try {
    const first = run(root, ['init', '--package-manager', 'npm']);
    assert.equal(first.status, 0, first.stderr);
    writeFileSync(join(root, 'AGENTS.md'), 'user change\n');
    const result = run(root, ['update', '--from', source.path, '--dry-run']);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /変更|上書き|停止/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(source.directory, { recursive: true, force: true });
  }
});

test('supports pnpm and appends the generated ignore rules only after approval', () => {
  const root = fixture({ 'README.md': '# Fixture\n', '.gitignore': 'local-only\n' });
  try {
    const blocked = run(root, ['init', '--package-manager', 'pnpm']);
    assert.notEqual(blocked.status, 0);
    assert.match(blocked.stderr, /gitignore|追記|accept-existing/);
    assert.match(blocked.stderr, /\+ node_modules\//);
    assert.equal(readFileSync(join(root, '.gitignore'), 'utf8'), 'local-only\n');
    const result = run(root, ['init', '--package-manager', 'pnpm', '--accept-existing']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(readFileSync(join(root, '.workflow/setup-manifest.json'), 'utf8')).packageManager, 'pnpm');
    assert.match(readFileSync(join(root, '.gitignore'), 'utf8'), /node_modules\//);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('updates owned files from an explicit template source', () => {
  const root = fixture();
  const source = templateTarball();
  try {
    assert.equal(run(root, ['init', '--package-manager', 'npm']).status, 0);
    const extracted = mkdtempSync(join(tmpdir(), 'project-work-flow-source-edit-'));
    cpSync(resolve('packages/create-project-work-flow'), join(extracted, 'package'), { recursive: true });
    writeFileSync(join(extracted, 'package/templates/project/CONTEXT.md'), '# Updated glossary\n');
    execFileSync('tar', ['-czf', source.path, '-C', extracted, 'package']);
    rmSync(extracted, { recursive: true, force: true });
    const result = run(root, ['update', '--from', source.path]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(readFileSync(join(root, 'CONTEXT.md'), 'utf8'), '# Updated glossary\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(source.directory, { recursive: true, force: true });
  }
});

test('update stops when a new framework file collides with a user file', () => {
  const root = fixture();
  const source = templateTarball();
  try {
    assert.equal(run(root, ['init', '--package-manager', 'npm']).status, 0);
    const extracted = mkdtempSync(join(tmpdir(), 'project-work-flow-source-collision-'));
    cpSync(resolve('packages/create-project-work-flow'), join(extracted, 'package'), { recursive: true });
    writeFileSync(join(extracted, 'package/templates/project/user-added.md'), '# New framework file\n');
    execFileSync('tar', ['-czf', source.path, '-C', extracted, 'package']);
    rmSync(extracted, { recursive: true, force: true });
    writeFileSync(join(root, 'user-added.md'), '# User file\n');
    const result = run(root, ['update', '--from', source.path]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /衝突|既存/);
    assert.equal(readFileSync(join(root, 'user-added.md'), 'utf8'), '# User file\n');
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(source.directory, { recursive: true, force: true });
  }
});

test('update rejects a symlinked ancestor for a new framework file', () => {
  const root = fixture();
  const source = templateTarball();
  const outside = mkdtempSync(join(tmpdir(), 'project-work-flow-outside-'));
  try {
    assert.equal(run(root, ['init', '--package-manager', 'npm']).status, 0);
    const extracted = mkdtempSync(join(tmpdir(), 'project-work-flow-source-ancestor-'));
    cpSync(resolve('packages/create-project-work-flow'), join(extracted, 'package'), { recursive: true });
    mkdirSync(join(extracted, 'package/templates/project/new-dir'), { recursive: true });
    writeFileSync(join(extracted, 'package/templates/project/new-dir/file.md'), '# New framework file\n');
    execFileSync('tar', ['-czf', source.path, '-C', extracted, 'package']);
    rmSync(extracted, { recursive: true, force: true });
    symlinkSync(outside, join(root, 'new-dir'), 'dir');
    const result = run(root, ['update', '--from', source.path]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /シンボリックリンク|停止/);
    assert.equal(existsSync(join(outside, 'file.md')), false);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(source.directory, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('update rejects a symlinked ancestor for an existing owned file', () => {
  const root = fixture();
  const source = templateTarball();
  const outside = mkdtempSync(join(tmpdir(), 'project-work-flow-owned-outside-'));
  try {
    assert.equal(run(root, ['init', '--package-manager', 'npm']).status, 0);
    cpSync(join(root, 'docs'), join(outside, 'docs'), { recursive: true });
    rmSync(join(root, 'docs'), { recursive: true, force: true });
    symlinkSync(join(outside, 'docs'), join(root, 'docs'), 'dir');
    const result = run(root, ['update', '--from', source.path]);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /シンボリックリンク|停止/);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(source.directory, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('rolls back generated files and directories when installation fails', () => {
  const root = fixture();
  const bin = mkdtempSync(join(tmpdir(), 'project-work-flow-failing-bin-'));
  try {
    const pnpm = join(bin, 'pnpm');
    writeFileSync(pnpm, '#!/bin/sh\nprintf "lockfileVersion: 9\\n" > pnpm-lock.yaml\nmkdir -p node_modules && printf "partial" > node_modules/partial.txt\nexit 1\n');
    chmodSync(pnpm, 0o755);
    const result = run(root, ['init', '--package-manager', 'pnpm', '--install'], { PATH: `${bin}:${process.env.PATH ?? ''}` });
    assert.notEqual(result.status, 0);
    assert.deepEqual(readdirSync(root).filter(entry => entry !== '.git').sort(), ['README.md']);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(bin, { recursive: true, force: true });
  }
});

test('installs dependencies when the selected package manager succeeds', () => {
  const root = fixture();
  const bin = mkdtempSync(join(tmpdir(), 'project-work-flow-bin-'));
  try {
    const pnpm = join(bin, 'pnpm');
    writeFileSync(pnpm, '#!/bin/sh\nprintf "lockfileVersion: 9\\n" > pnpm-lock.yaml\n');
    chmodSync(pnpm, 0o755);
    const result = run(root, ['init', '--package-manager', 'pnpm', '--install'], { PATH: `${bin}:${process.env.PATH ?? ''}` });
    assert.equal(result.status, 0, result.stderr);
    assert.ok(existsSync(join(root, 'pnpm-lock.yaml')));
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(bin, { recursive: true, force: true });
  }
});

test('generated project passes verify and the first workflow preparation', () => {
  const root = fixture();
  try {
    const init = run(root, ['init', '--package-manager', 'npm']);
    assert.equal(init.status, 0, init.stderr);
    symlinkSync(resolve('node_modules'), join(root, 'node_modules'), 'dir');
    const verify = spawnSync('npm', ['run', 'verify'], { cwd: root, encoding: 'utf8' });
    assert.equal(verify.status, 0, verify.stdout + verify.stderr);
    const prepare = spawnSync('npm', ['run', 'workflow:prepare', '--', 'first-change', 'First change'], { cwd: root, encoding: 'utf8' });
    assert.equal(prepare.status, 0, prepare.stdout + prepare.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
