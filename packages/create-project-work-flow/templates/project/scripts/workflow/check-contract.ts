import { execFileSync } from 'node:child_process';
import { existsSync, globSync, lstatSync, readFileSync, realpathSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkConfig, checkManifest } from './contract.ts';
import { loadConfig, loadManifest } from './io.ts';
import { loadAdrs } from '../adr/adr.ts';
import { checkConnections } from './connections.ts';

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
    for (const command of ['workflow:prepare', 'verify']) {
      if (!agents.includes(command)) errors.push(`AGENTS.mdに機械設定への接続指示がありません: ${command}`);
    }
  }
  let head: string | undefined;
  try { head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(); }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      errors.push('Gitが見つかりません。Git 2.28以上を導入してPATHへ追加してください。README.mdの初期セットアップを参照してください。');
    } else errors.push('GitリポジトリのHEADを取得できません。Git初期化と初回コミットを確認してください。');
  }
  const manifestFiles = globSync('.workflow/changes/*.json', { cwd: root }).sort();
  let completing = false;
  const temporaryManifests = new Set<string>();
  for (const file of manifestFiles) {
    try {
      const absolute = resolve(root, file);
      if (lstatSync(absolute).isSymbolicLink()) throw new Error('manifestは通常ファイルにしてください');
      const raw = readFileSync(absolute, 'utf8');
      for (const secret of findSecrets(raw)) errors.push(`${file}: ${secret}らしき値を保存しないでください`);
      const manifest = loadManifest(absolute);
      const findings = checkManifest(manifest, config, now, head);
      errors.push(...findings.map(message => `${file}: ${message}`));
      if (file !== `.workflow/changes/${manifest.id}.json`) errors.push(`${file}: ファイル名と変更IDが一致しません`);
      else if (!findings.length) temporaryManifests.add(file);
      if (manifest.state === 'complete') completing = true;
      if (manifest.adrDependencies?.length || manifest.artifacts.adr) {
        const adrs = loadAdrs(resolve(root, 'docs/adr'));
        const dependencies = new Set(manifest.adrDependencies);
        if (manifest.artifacts.adr) {
          const artifact = adrs.find(adr => manifest.artifacts.adr === `docs/adr/${adr.file}`);
          if (!artifact) errors.push(`${file}: ADR成果物はdocs/adr/内の有効なADRのパスで指定してください`);
          else dependencies.add(artifact.id);
        }
        for (const id of dependencies) {
          const adr = adrs.find(adr => adr.id === id);
          if (!adr) errors.push(`${file}: ADR依存${id}が存在しません`);
          else if (!['unclassified', 'researching'].includes(manifest.state) && adr.status === 'Draft') {
            errors.push(`${file}: ADR依存${id}には本文承認が必要です（Draft）`);
          }
        }
      }
      for (const [kind, artifact] of Object.entries(manifest.artifacts)) {
        if (!artifact) continue;
        if (isAbsolute(artifact) || artifact.split(/[\\/]/).includes('..')) errors.push(`${file}: ${kind}のパスはリポジトリ相対にしてください`);
        else if (!existsSync(resolve(root, artifact))) errors.push(`${file}: ${kind}が存在しません: ${artifact}`);
      }
    } catch (error) { errors.push(`${file}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  errors.push(...checkConnections(root, completing));
  if (completing) {
    try {
      const status = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none'], { cwd: root, encoding: 'utf8' }).split('\0');
      for (let index = 0; index < status.length; index++) {
        const entry = status[index];
        if (!entry) continue;
        const kind = entry.slice(0, 2);
        const file = entry.slice(3);
        if (kind !== '??' || !temporaryManifests.has(file)) errors.push(`承認後の未コミット変更があります: ${file}`);
        if (/[RC]/.test(kind)) index++; // porcelain -z includes the original path after a rename/copy.
      }
      const tracked = execFileSync('git', ['ls-files', '-z', '--', '.workflow/changes'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
      if (tracked.length) errors.push('一時マニフェストをGit追跡から外し、文書整理後のコミットで再承認してください');
    } catch { errors.push('完了時のGit作業状態を取得できません'); }
  }
  for (const file of globSync(['docs/**/*.md', '.workflow/**/*.json'], { cwd: root, exclude: ['.workflow/external/**'] }).sort()) {
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
