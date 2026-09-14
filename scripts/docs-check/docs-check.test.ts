import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { collectDocuments } from './check.ts';

test('文書移動後もarchiveを含め、依存パッケージと調査メモは対象外にする', t => {
  const root = mkdtempSync(join(tmpdir(), 'docs-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const expected = ['AGENTS.md', 'workflow/AGENTS.md', 'workflow/docs/templates/ticket.md', 'docs/archive/change/issues/01.md', 'docs/product/feature.md', 'docs/adr/README.md'];
  for (const name of [...expected, 'workflow/node_modules/pkg/README.md', 'docs/research/notes.md']) {
    const path = join(root, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, '# 文書\n');
  }
  assert.deepEqual(collectDocuments(root), expected.sort());
});
