// Run from the repository root. Creates and removes only an isolated test fixture.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const source = process.cwd();
const root = mkdtempSync(join(tmpdir(), 'verification-output-measure-'));
const baseline = 'c148215';
const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
try {
  cpSync(join(source, 'scripts'), join(root, 'scripts'), { recursive: true });
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  mkdirSync(join(root, 'docs/adr'), { recursive: true });
  writeFileSync(join(root, '.gitignore'), 'node_modules/\n.workflow/logs/\n');
  writeFileSync(join(root, 'package.json'), '{"type":"module"}\n');
  writeFileSync(join(root, 'AGENTS.md'), '# Fixture\n\nworkflow:prepare verify\n');
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify({ schemaVersion: 1,
    exceptionDefaultDays: 7, exceptionMaximumDays: 30, additionalHighRiskCategories: [],
    projectChecks: [{ name: 'same-fixture', command: process.execPath,
      args: ['-e', "console.log('passing detail\\n'.repeat(1000))"] }] }));
  execFileSync(process.execPath, ['scripts/adr/generate.ts'], { cwd: root });
  // Keep both runners at identical relative depths; use exactly the same fixture and checks.
  writeFileSync(join(root, 'scripts/verify-before.ts'), execFileSync('git', ['show', `${baseline}:scripts/verify.ts`], { cwd: source }));
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Output measurement fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.'); git('commit', '-m', 'test: output measurement fixture');
  const results = ['scripts/verify-before.ts', 'scripts/verify.ts'].map(entry => {
    const run = spawnSync(process.execPath, [entry], { cwd: root, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(run.stdout + run.stderr);
    return { entry, exit: run.status, bytes: Buffer.byteLength(run.stdout + run.stderr) };
  });
  console.log(JSON.stringify({ baseline, results,
    reductionPercent: Number(((1 - results[1].bytes / results[0].bytes) * 100).toFixed(1)),
    note: 'Same checks and fixture; displayed UTF-8 bytes, not model tokens or billing.' }, null, 2));
} finally { rmSync(root, { recursive: true, force: true }); }
