import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { checkDocsLayout } from './check-layout.ts';

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), 'docs-layout-'));
  for (const directory of ['adr', 'archive', 'product', 'templates']) mkdirSync(join(root, 'docs', directory), { recursive: true });
  return root;
}

test('許可された4ディレクトリだけなら成功する', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.deepEqual(checkDocsLayout(root), []);
});

test('許可外のdocs直下ディレクトリを検出する', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'docs', 'changes'));
  assert.deepEqual(checkDocsLayout(root), ['docs直下に許可されていないエントリがあります: changes']);
});

test('docs直下の通常ファイルを検出する', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'docs', 'README.md'), '# docs\n');
  assert.deepEqual(checkDocsLayout(root), ['docs直下に許可されていないエントリがあります: README.md']);
});

test('許可領域のシンボリックリンクを検出する', t => {
  const root = fixture();
  t.after(() => rmSync(root, { recursive: true, force: true }));
  rmSync(join(root, 'docs', 'product'), { recursive: true, force: true });
  symlinkSync(join(root, 'docs', 'adr'), join(root, 'docs', 'product'), 'dir');
  assert.deepEqual(checkDocsLayout(root), ['docs直下の許可領域は通常ディレクトリにしてください: product']);
});

test('docs自体のシンボリックリンクを検出する', t => {
  const root = mkdtempSync(join(tmpdir(), 'docs-layout-link-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'real-docs', 'adr'), { recursive: true });
  symlinkSync(join(root, 'real-docs'), join(root, 'docs'), 'dir');
  assert.deepEqual(checkDocsLayout(root), ['docsは通常ディレクトリにしてください']);
});
