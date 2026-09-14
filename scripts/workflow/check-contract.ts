import { execFileSync } from 'node:child_process';
import { existsSync, globSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkConfig, checkManifest } from './contract.ts';
import { checkAdapter, checkCertificationClaim, type AdapterManifest } from './adapters.ts';
import { loadConfig, loadManifest } from './io.ts';

const secretPatterns: [string, RegExp][] = [
  ['秘密鍵', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['OpenAI APIキー', /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ['GitHubトークン', /\bgh[oprsu]_[A-Za-z0-9]{20,}\b/],
  ['AWSアクセスキー', /\bAKIA[0-9A-Z]{16}\b/],
];

export function findSecrets(text: string): string[] {
  return secretPatterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

export function checkWorkflowRepository(root: string, now = new Date()): string[] {
  const errors: string[] = [];
  let config;
  try { config = loadConfig(root); errors.push(...checkConfig(config)); }
  catch (error) { return [error instanceof Error ? error.message : String(error)]; }
  const agentsPath = resolve(root, 'AGENTS.md');
  if (!existsSync(agentsPath)) errors.push('AGENTS.mdがありません');
  else {
    const agents = readFileSync(agentsPath, 'utf8');
    for (const command of ['workflow:prepare', 'workflow:inspect-skill', 'verify']) {
      if (!agents.includes(command)) errors.push(`AGENTS.mdに機械設定への接続指示がありません: ${command}`);
    }
  }
  let head: string | undefined;
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); }
  catch { errors.push('GitリポジトリのHEADを取得できません'); }
  const adapters: AdapterManifest[] = [];
  for (const file of globSync('adapters/*.json', { cwd: root }).sort()) {
    try {
      const adapter = JSON.parse(readFileSync(resolve(root, file), 'utf8')) as AdapterManifest;
      const adapterErrors = checkAdapter(adapter);
      errors.push(...adapterErrors.map(message => `${file}: ${message}`));
      if (!adapterErrors.length) adapters.push(adapter);
    } catch (error) { errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  const manifestFiles = globSync('.workflow/changes/*.json', { cwd: root }).sort();
  for (const file of manifestFiles) {
    try {
      const absolute = resolve(root, file);
      if (lstatSync(absolute).isSymbolicLink()) throw new Error('manifestは通常ファイルにしてください');
      const raw = readFileSync(absolute, 'utf8');
      for (const secret of findSecrets(raw)) errors.push(`${file}: ${secret}らしき値を保存しないでください`);
      const manifest = loadManifest(absolute);
      errors.push(...checkManifest(manifest, config, now, head).map(message => `${file}: ${message}`));
      errors.push(...checkCertificationClaim(manifest, adapters).map(message => `${file}: ${message}`));
      for (const [kind, artifact] of Object.entries(manifest.artifacts)) {
        if (!artifact) continue;
        if (isAbsolute(artifact) || artifact.split(/[\\/]/).includes('..')) errors.push(`${file}: ${kind}のパスはリポジトリ相対にしてください`);
        else if (!existsSync(resolve(root, artifact))) errors.push(`${file}: ${kind}が存在しません: ${artifact}`);
      }
    } catch (error) { errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  for (const file of globSync(['docs/**/*.md', '.workflow/**/*.json'], { cwd: root }).sort()) {
    const text = readFileSync(resolve(root, file), 'utf8');
    for (const secret of findSecrets(text)) errors.push(`${relative(root, resolve(root, file))}: ${secret}らしき値を保存しないでください`);
  }
  return errors;
}

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const errors = checkWorkflowRepository(projectRoot);
  for (const error of errors) console.error('ERROR ' + error);
  console.log(`Workflow contract: ${errors.length} errors`);
  process.exitCode = errors.length ? 1 : 0;
}
