import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkConfig } from './contract.ts';
import { loadConfig } from './io.ts';

export function runProjectChecks(root: string): number {
  const config = loadConfig(root);
  const configErrors = checkConfig(config);
  if (configErrors.length) throw new Error(configErrors.join('\n'));
  for (const check of config.projectChecks) {
    console.log(`Project check: ${check.name}`);
    const result = spawnSync(check.command, check.args, { cwd: root, stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
}

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try { process.exitCode = runProjectChecks(projectRoot); }
  catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
