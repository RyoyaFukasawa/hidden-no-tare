import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectDocuments } from './check.ts';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('文書移動後もarchiveを含め、依存パッケージと調査メモは対象外にする', t => {
  const root = mkdtempSync(join(tmpdir(), 'docs-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const expected = ['AGENTS.md', 'README.md', 'docs/templates/ticket.md', 'docs/archive/change/issues/01.md', 'docs/product/feature.md', 'docs/adr/README.md'];
  for (const name of [...expected, 'node_modules/pkg/README.md', 'docs/research/notes.md']) {
    const path = join(root, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '# 文書\n');
  }
  assert.deepEqual(collectDocuments(root), expected.sort());
});

test('lycheeが未導入なら必要版と導入案内を出して失敗する', t => {
  const emptyPath = mkdtempSync(join(tmpdir(), 'no-link-checker-'));
  t.after(() => rmSync(emptyPath, { recursive: true, force: true }));
  const script = fileURLToPath(new URL('./check.ts', import.meta.url));
  const result = spawnSync(process.execPath, [script, 'links'], { env: { ...process.env, PATH: emptyPath }, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /lychee.*0\.24\.2/);
  assert.match(result.stderr, /README/);
});
