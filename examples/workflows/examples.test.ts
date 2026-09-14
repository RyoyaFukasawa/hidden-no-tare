import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCertificationHarness } from './adapter-certification-harness.ts';

test('Matt系とSuperpowersの利用例を実CLI・Git・停止条件で検証する', t => {
  const directory = mkdtempSync(join(tmpdir(), 'workflow-example-log-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = join(directory, 'certification.md');
  assert.equal(runCertificationHarness(process.cwd(), output).success, true);
  const log = readFileSync(output, 'utf8');
  for (const expected of [
    'matt-pocock-engineering', 'superpowers-engineering',
    'successful finalize: true', 'missing evidence refused: true',
    'all lifecycle commands isolated: true', 'content preserved: true',
    'unassigned output refused and preserved: true', 'hostile preflight refused: true',
    'verification after finalization: true',
  ]) assert.ok(log.includes(expected), expected);
});
