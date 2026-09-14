import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

try {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const commands = [
    ['node_modules/typescript/bin/tsc', '--noEmit'],
    ['--test', 'scripts/completion-check/work-items.test.ts', 'scripts/adr/adr.test.ts', 'scripts/docs-check/docs-check.test.ts'],
    ['scripts/completion-check/check-work-items.ts'],
    ['scripts/adr/check.ts'],
    ['scripts/docs-check/check.ts', 'markdown'],
    ['scripts/docs-check/check.ts', 'links'],
  ];
  for (const args of commands) {
    const result = spawnSync(process.execPath, args, { cwd, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  console.log('Verification passed (workflow typecheck, tests, work items, ADRs and Markdown/links).');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
