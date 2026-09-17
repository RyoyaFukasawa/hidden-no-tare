import { spawnSync } from 'node:child_process';
import { globSync } from 'node:fs';

for (const args of [
  ['node_modules/typescript/bin/tsc', '--noEmit'],
  ['--test', ...globSync('scripts/**/*.test.ts').sort()],
]) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
