import { spawn, spawnSync } from 'node:child_process';
import { closeSync, constants, existsSync, lstatSync, mkdirSync, openSync, readSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';

const LOG_BYTES = 1024 * 1024;
const LOG_COUNT = 10;
const TOTAL_BYTES = 5 * 1024 * 1024;
const EXCERPT_BYTES = 4096;
const HEADER = Buffer.from('Workflow verification log v1\n');
const OMITTED = Buffer.from('\n[出力を省略: 先頭と末尾のみ保持]\n');

/** Drain every byte without retaining unbounded child output in memory. */
class BoundedOutput {
  private head = Buffer.alloc(0);
  private tail = Buffer.alloc(0);
  private size = 0;
  private readonly headLimit: number;
  private readonly tailLimit: number;

  constructor(limit: number) {
    this.headLimit = Math.floor((limit - OMITTED.length) / 2);
    this.tailLimit = limit - OMITTED.length - this.headLimit;
  }

  append(chunk: Buffer): void {
    this.size += chunk.length;
    const take = Math.min(this.headLimit - this.head.length, chunk.length);
    if (take) this.head = Buffer.concat([this.head, chunk.subarray(0, take)]);
    const remainder = chunk.subarray(take);
    if (remainder.length >= this.tailLimit) this.tail = Buffer.from(remainder.subarray(-this.tailLimit));
    else this.tail = Buffer.concat([this.tail, remainder]).subarray(-this.tailLimit);
  }

  get truncated(): boolean { return this.size > this.headLimit + this.tailLimit; }

  content(): Buffer {
    return Buffer.concat([this.head, ...(this.truncated ? [OMITTED] : []), this.tail]);
  }
}

function saveLog(root: string, content: Buffer): string {
  for (const relative of ['.workflow', '.workflow/logs']) {
    const path = resolve(root, relative);
    if (!existsSync(path)) mkdirSync(path, { mode: 0o700 });
    const stat = lstatSync(path);
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`${relative}は通常のディレクトリにしてください`);
  }
  const directory = resolve(root, '.workflow/logs');
  const lock = resolve(directory, '.write-lock');
  mkdirSync(lock, { mode: 0o700 }); // Serialize only persistence/rotation; never delete another writer's lock.
  try {
    const file = `.workflow/logs/verification-${Date.now()}-${randomUUID()}.log`;
    writeFileSync(resolve(root, file), Buffer.concat([HEADER, content]), { flag: 'wx', mode: 0o600 });
    const tracked = spawnSync('git', ['ls-files', '-z', '--', '.workflow/logs'], { cwd: root, encoding: 'utf8' });
    const trackedFiles = new Set(tracked.stdout?.split('\0'));
    const managed: { path: string; size: number; time: number }[] = [];
    if (tracked.status === 0) for (const name of readdirSync(directory)) {
      if (!/^verification-\d+-[0-9a-f-]{36}\.log$/.test(name) || trackedFiles.has(`.workflow/logs/${name}`)) continue;
      const path = resolve(directory, name);
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.nlink !== 1) continue;
      const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
      const header = Buffer.alloc(HEADER.length);
      try { readSync(fd, header, 0, header.length, 0); } finally { closeSync(fd); }
      if (!header.equals(HEADER)) continue;
      managed.push({ path, size: stat.size, time: stat.mtimeMs });
    }
    // An unavailable Git does not authorize deleting files of unknown ownership.
    const current = resolve(root, file);
    managed.sort((a, b) => Number(a.path === current) - Number(b.path === current)
      || a.time - b.time || a.path.localeCompare(b.path));
    let bytes = managed.reduce((total, entry) => total + entry.size, 0);
    while (managed.length > LOG_COUNT || bytes > TOTAL_BYTES) {
      const oldest = managed.shift()!;
      unlinkSync(oldest.path);
      bytes -= oldest.size;
    }
    return file;
  } finally { rmdirSync(lock); }
}

export async function runLogged(root: string, label: string, command: string, args: string[]): Promise<{ status: number; error?: Error }> {
  const output = new BoundedOutput(LOG_BYTES - HEADER.length);
  const excerpt = new BoundedOutput(EXCERPT_BYTES);
  const append = (chunk: Buffer) => { output.append(chunk); excerpt.append(chunk); };
  const result = await new Promise<{ status: number; error?: Error }>(resolveResult => {
    const child = spawn(command, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: false });
    let error: Error | undefined;
    child.stdout.on('data', append);
    child.stderr.on('data', append);
    child.on('error', value => { error = value; });
    child.on('close', (code, signal) => {
      if (error) append(Buffer.from(error.message + '\n'));
      if (signal) append(Buffer.from(`Signal: ${signal}\n`));
      resolveResult({ status: error ? 1 : code ?? 1, error });
    });
  });
  const content = output.content();
  let file: string;
  try {
    file = saveLog(root, content);
  } catch (error) {
    throw new Error(`検証ログを保存できません: ${error instanceof Error ? error.message : String(error)}`);
  }
  console.log(`${result.status === 0 ? 'PASS' : 'FAIL'} ${label} (exit ${result.status}) — Log: ${file}${output.truncated ? ' (省略あり)' : ''}`);
  if (result.status !== 0) process.stderr.write(excerpt.content());
  return result;
}

export function reportVerificationFailure(root: string, error: unknown): void {
  const message = Buffer.from((error instanceof Error ? error.message : String(error)) + '\n');
  const output = new BoundedOutput(LOG_BYTES - HEADER.length);
  const excerpt = new BoundedOutput(EXCERPT_BYTES);
  output.append(message); excerpt.append(message);
  try {
    const file = saveLog(root, output.content());
    console.log(`FAIL verification boundary — Log: ${file}${output.truncated ? ' (省略あり)' : ''}`);
  } catch (failure) {
    console.error(`検証ログを保存できません: ${failure instanceof Error ? failure.message : String(failure)}`);
  }
  process.stderr.write(excerpt.content());
}
