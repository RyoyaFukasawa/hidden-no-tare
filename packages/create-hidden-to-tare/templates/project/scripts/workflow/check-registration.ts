import { globSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkAdapter, checkCertificationClaim, type AdapterManifest } from './adapters.ts';
import { loadManifest } from './io.ts';

/** Optional registration checks, deliberately not part of the completion contract. */
export function checkWorkflowRegistration(root: string): string[] {
  const errors: string[] = [];
  const adapters: AdapterManifest[] = [];
  for (const file of globSync('adapters/*.json', { cwd: root }).sort()) {
    try {
      const adapter: unknown = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
      const findings = checkAdapter(adapter);
      errors.push(...findings.map(message => `${file}: ${message}`));
      if (!findings.length) adapters.push(adapter as AdapterManifest);
    } catch (error) { errors.push(`${file}: ${String(error)}`); }
  }
  const counts = new Map<string, number>();
  for (const adapter of adapters) counts.set(adapter.id, (counts.get(adapter.id) ?? 0) + 1);
  for (const [id, count] of counts) if (count > 1) errors.push(`adapter IDが重複しています: ${id}`);
  const unique = adapters.filter(adapter => counts.get(adapter.id) === 1);
  for (const file of globSync('.workflow/changes/*.json', { cwd: root }).sort()) {
    try {
      errors.push(...checkCertificationClaim(loadManifest(resolve(root, file)), unique).map(message => `${file}: ${message}`));
    } catch (error) { errors.push(`${file}: ${String(error)}`); }
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const errors = checkWorkflowRegistration(fileURLToPath(new URL('../../', import.meta.url)));
  for (const error of errors) console.error('ERROR ' + error);
  console.log(`Optional workflow registration: ${errors.length} errors`);
  process.exitCode = errors.length ? 1 : 0;
}
