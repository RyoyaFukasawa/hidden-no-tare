import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const area = '.workflow/external';
const states = '.workflow/connection-state';
const definitions = '.workflow/connections';
type Definition = { schemaVersion: 1; id: string; files: Record<string, string>; compatibility: Record<string, string> };
type State = { schemaVersion: 1; id: string; definitionHash: string; phase: 'preparing' | 'active' | 'removing'; directories: string[] };
const hash = (text: string | Buffer) => createHash('sha256').update(text).digest('hex');
function fail(message: string): never { throw new Error(`外部接続: ${message}`); }
function stat(root: string, path: string) {
  try { return lstatSync(resolve(root, path)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
}
function relativePath(path: string): void {
  if (!path || /[\\:\x00-\x1f\x7f]/.test(path) || path.split('/').some(p => !p || p === '.' || p === '..' || p.endsWith('.') || p.endsWith(' '))) fail(`不正な相対パス: ${path}`);
}
function idCheck(id: string): void { if (!/^[a-z][a-z0-9-]{0,63}$/.test(id)) fail(`不正な接続ID: ${id}`); }
function object(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function exact(value: unknown, keys: string[]): asserts value is Record<string, unknown> {
  if (!object(value) || Object.keys(value).sort().join('|') !== keys.sort().join('|')) fail('JSONのフィールドが不正です');
}
function parents(path: string): string[] {
  const result: string[] = [];
  for (let parent = dirname(path); parent !== '.'; parent = dirname(parent)) result.unshift(parent);
  return result;
}
function safePath(root: string, path: string): void {
  relativePath(path);
  for (const parent of parents(path)) {
    const info = stat(root, parent);
    if (info && (!info.isDirectory() || info.isSymbolicLink())) fail(`通常ディレクトリではありません: ${parent}`);
    if (stat(root, `${parent}/.git`)) fail(`入れ子のGit領域は扱えません: ${parent}`);
  }
  const info = stat(root, path);
  if (info && (info.isSymbolicLink() || (!info.isDirectory() && (!info.isFile() || info.nlink !== 1)))) fail(`通常ファイルではありません: ${path}`);
}
function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}
function untrackedIgnored(root: string, path: string): void {
  if (git(root, 'ls-files', '-z', '--', `:(literal)${path}`).length) fail(`Git追跡対象は扱えません: ${path}`);
  try { git(root, 'check-ignore', '-q', '--', path); }
  catch { fail(`先にGit ignoreへ追加してください: ${path}`); }
}
function read(root: string, path: string): string {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readBytes(root, path));
}
function readBytes(root: string, path: string): Buffer {
  safePath(root, path);
  if (!stat(root, path)?.isFile()) fail(`通常ファイルが必要です: ${path}`);
  return readFileSync(resolve(root, path));
}
function definition(root: string, id: string) {
  idCheck(id);
  const path = `${definitions}/${id}.json`;
  const raw = read(root, path);
  if (!git(root, 'ls-files', '-z', '--', `:(literal)${path}`).length) fail(`接続定義をGitへ追加してください: ${path}`);
  const value: unknown = JSON.parse(raw);
  exact(value, ['schemaVersion', 'id', 'files', 'compatibility']);
  if (value.schemaVersion !== 1 || value.id !== id || !object(value.files) || !object(value.compatibility)) fail(`不正な接続定義: ${id}`);
  const targets = new Map<string, string>();
  for (const [files, prefix] of [[value.files, `${area}/${id}/`], [value.compatibility, '']] as const) {
    for (const [path, content] of Object.entries(files)) {
      relativePath(path);
      if (typeof content !== 'string') fail(`生成内容は文字列にしてください: ${path}`);
      if (!prefix && (/^(?:\.[^/]+|node_modules|scripts|work)(?:\/|$)/i.test(path) || /^(?:AGENTS\.md|CLAUDE\.md|CONTEXT\.md|README\.md|package(?:-lock)?\.json|workflow\.config\.json|tsconfig\.json)$/i.test(path) || /^docs\/(?:product|adr|archive|templates)(?:\/|$)/i.test(path))) fail(`共通領域へ生成できません: ${path}`);
      if (path.split('/').some(p => /^\.git$/i.test(p))) fail(`Git領域は扱えません: ${path}`);
      const target = prefix + path;
      for (const other of targets.keys()) if (overlap(target, other)) fail(`生成パスが競合しています: ${target}`);
      targets.set(target, content);
    }
  }
  return { value: value as Definition, hash: hash(raw), targets };
}
function overlap(a: string, b: string): boolean {
  a = a.toLowerCase(); b = b.toLowerCase();
  return a === b || a.startsWith(b + '/') || b.startsWith(a + '/');
}
function ensureDirectory(root: string, path: string): void {
  if (path === '.') return;
  for (const directory of [...parents(path), path]) {
    safePath(root, directory);
    if (!stat(root, directory)) mkdirSync(resolve(root, directory));
    else if (!stat(root, directory)?.isDirectory()) fail(`ディレクトリではありません: ${directory}`);
  }
}
function loadState(root: string, id: string) {
  const path = `${states}/${id}.json`;
  untrackedIgnored(root, path);
  const raw = read(root, path);
  const value: unknown = JSON.parse(raw);
  exact(value, ['schemaVersion', 'id', 'definitionHash', 'phase', 'directories']);
  const def = definition(root, id);
  if (value.schemaVersion !== 1 || value.id !== id || value.definitionHash !== def.hash || value.phase !== 'active' || !Array.isArray(value.directories)) fail(`所有記録が不正・処理中、または定義が変更されています: ${id}`);
  const possible = new Set([`${area}/${id}`, ...[...def.targets.keys()].flatMap(parents)]);
  if (new Set(value.directories).size !== value.directories.length || value.directories.some(d => typeof d !== 'string' || !possible.has(d) || d === '.workflow' || d === area)) fail(`所有ディレクトリが不正です: ${id}`);
  for (const target of def.targets.keys()) { safePath(root, target); untrackedIgnored(root, target); }
  return { state: value as State, def, raw };
}
function entries(root: string, path: string): string[] {
  safePath(root, path);
  if (!stat(root, path)) return [];
  if (!stat(root, path)?.isDirectory()) fail(`ディレクトリではありません: ${path}`);
  return readdirSync(resolve(root, path)).sort();
}
function active(root: string, ownLock = false) {
  const loaded = new Map<string, ReturnType<typeof loadState>>();
  for (const name of entries(root, states)) {
    if (name === '.lock') {
      if (ownLock) continue;
      fail('接続操作が処理中です。終了を待つか所有記録を確認してください');
    }
    if (!name.endsWith('.json')) fail(`所有不明の記録: ${states}/${name}`);
    const id = name.slice(0, -5); idCheck(id);
    loaded.set(id, loadState(root, id));
  }
  for (const id of entries(root, area)) {
    if (!loaded.has(id)) fail(`所有不明の領域: ${area}/${id}`);
    safePath(root, `${area}/${id}`);
    if (!stat(root, `${area}/${id}`)?.isDirectory()) fail(`専用領域は通常ディレクトリにしてください: ${area}/${id}`);
  }
  const targets: string[] = [];
  for (const item of loaded.values()) for (const path of item.def.targets.keys()) {
    if (targets.some(other => overlap(path, other))) fail(`接続の所有パスが競合しています: ${path}`);
    targets.push(path);
  }
  return loaded;
}
function clean(root: string, id: string, item: ReturnType<typeof loadState>): void {
  const allowedDirs = new Set([`${area}/${id}`, ...[...item.def.targets.keys()].flatMap(parents)]);
  function walk(path: string): void {
    for (const name of entries(root, path)) {
      const child = `${path}/${name}`; safePath(root, child);
      if (stat(root, child)?.isDirectory() && allowedDirs.has(child)) walk(child);
      else if (!item.def.targets.has(child)) fail(`未移管・所有不明のデータがあります: ${child}`);
    }
  }
  walk(`${area}/${id}`);
  for (const [path, content] of item.def.targets) {
    if (stat(root, path) && (!stat(root, path)?.isFile() || hash(readBytes(root, path)) !== hash(content))) fail(`変更済みデータを移管または明示的に破棄してください: ${path}`);
  }
}
export function checkConnections(root: string, completing: boolean): string[] {
  try {
    for (const [id, item] of active(root)) if (completing) clean(root, id, item);
    return [];
  } catch (error) { return [error instanceof Error ? error.message : String(error)]; }
}
/** Capture only ownership and managed paths, never arbitrary external work data. */
export function connectionSnapshot(root: string): string {
  return JSON.stringify([...active(root)].map(([id, item]) => {
    clean(root, id, item);
    return [id, item.raw, [...item.def.targets.keys()].map(path => [path, stat(root, path) ? hash(readBytes(root, path)) : null])];
  }));
}
function attach(root: string, id: string): void {
  const connections = active(root, true);
  if (connections.has(id)) fail(`既に接続されています: ${id}`);
  const def = definition(root, id);
  for (const path of [`${area}/${id}`, `${states}/${id}.json`, ...def.targets.keys()]) {
    safePath(root, path); untrackedIgnored(root, path);
    if (stat(root, path)) fail(`既存パスは上書きしません: ${path}`);
    for (const other of connections.values()) if ([...other.def.targets.keys()].some(p => overlap(path, p))) fail(`他接続と競合しています: ${path}`);
  }
  ensureDirectory(root, states); ensureDirectory(root, area);
  const directories = [...new Set([`${area}/${id}`, ...[...def.targets.keys()].flatMap(parents)])].filter(d => !stat(root, d));
  const state: State = { schemaVersion: 1, id, definitionHash: def.hash, phase: 'preparing', directories };
  const statePath = resolve(root, `${states}/${id}.json`);
  writeFileSync(statePath, JSON.stringify(state), { flag: 'wx' });
  ensureDirectory(root, `${area}/${id}`);
  for (const [path, content] of def.targets) {
    ensureDirectory(root, dirname(path));
    writeFileSync(resolve(root, path), content, { flag: 'wx' });
  }
  state.phase = 'active'; writeFileSync(statePath, JSON.stringify(state));
}
function detach(root: string, id: string): void {
  const item = active(root, true).get(id);
  if (!item) fail(`接続がありません: ${id}`);
  clean(root, id, item);
  const statePath = resolve(root, `${states}/${id}.json`);
  writeFileSync(statePath, JSON.stringify({ ...item.state, phase: 'removing' }));
  for (const path of item.def.targets.keys()) if (stat(root, path)) unlinkSync(resolve(root, path));
  for (const directory of [...item.state.directories].sort((a, b) => b.length - a.length)) {
    safePath(root, directory);
    if (stat(root, directory)?.isDirectory() && entries(root, directory).length === 0) rmdirSync(resolve(root, directory));
  }
  unlinkSync(statePath);
}
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const [command, id, ...extra] = process.argv.slice(2);
    if (!id || extra.length || !['attach', 'detach'].includes(command ?? '')) fail('使い方: workflow:connection -- attach|detach <id>');
    idCheck(id);
    const root = realpathSync(process.cwd());
    if (realpathSync(git(root, 'rev-parse', '--show-toplevel').trim()) !== root) fail('worktreeのルートで実行してください');
    const lock = `${states}/.lock`;
    safePath(root, lock); untrackedIgnored(root, lock);
    ensureDirectory(root, states);
    try { mkdirSync(resolve(root, lock)); }
    catch { fail('接続操作のロックを取得できません。別操作や残存ロックを確認してください'); }
    try { if (command === 'attach') attach(root, id); else detach(root, id); }
    finally { rmdirSync(resolve(root, lock)); }
    console.log(`Connection ${command}: ${id}`);
  } catch (error) { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; }
}
