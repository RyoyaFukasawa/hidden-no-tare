import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

type Status = 'Draft' | 'Accepted' | 'Superseded' | 'Deprecated';
type Adr = { id: string; file: string; title: string; status: Status; supersedes: string[] };

const directory = fileURLToPath(new URL('../../docs/adr/', import.meta.url));

function fail(message: string): never { throw new Error('ADR: ' + message); }
function read(path: string): string {
  return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
}

function parse(file: string, text: string): Adr {
  const name = /^(\d{4})-[^/\\\s]+\.md$/.exec(file);
  if (!name) fail(`${file}: ファイル名はNNNN-<name>.mdにしてください`);
  const doc = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(text);
  if (!doc) fail(`${file}: YAMLメタデータが必要です`);
  const fields = new Map<string, string>();
  // テンプレートの形式に限定。一般のYAML構文は受け付けない。
  for (const line of doc[1].split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const field = /^(status|supersedes|approvedBy|approvedAt|approvedBodySha256):\s*(.*?)\s*$/.exec(line);
    if (!field || fields.has(field[1])) fail(`${file}: メタデータの不正な行または重複キー: ${line}`);
    fields.set(field[1], field[2]);
  }
  const status = fields.get('status');
  if (status !== 'Draft' && status !== 'Accepted' && status !== 'Superseded' && status !== 'Deprecated') fail(`${file}: 状態が不正です`);
  if (status === 'Draft' && ['approvedBy', 'approvedAt', 'approvedBodySha256'].some(key => fields.has(key))) {
    fail(`${file}: 草案に承認記録は付けられません。承認後にAcceptedへ変更してください`);
  }
  if (status !== 'Draft') {
    const approval = new Map<string, string>();
    for (const key of ['approvedBy', 'approvedAt', 'approvedBodySha256']) {
      if (!fields.has(key)) fail(`${file}: 承認記録${key}が必要です`);
      let value: unknown;
      try { value = JSON.parse(fields.get(key)!); }
      catch { fail(`${file}: 承認記録${key}はJSON文字列で記載してください`); }
      if (typeof value !== 'string' || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
        fail(`${file}: 承認記録${key}には制御文字のない空でない文字列が必要です`);
      }
      approval.set(key, value);
    }
    const at = approval.get('approvedAt')!;
    const milliseconds = Date.parse(at);
    const canonical = at.includes('.') ? at : at.replace(/Z$/, '.000Z');
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(at)
      || !Number.isFinite(milliseconds) || new Date(milliseconds).toISOString() !== canonical) {
      fail(`${file}: 承認日時は実在するUTC日時で記載してください`);
    }
    if (approval.get('approvedBodySha256') !== createHash('sha256').update(doc[2]).digest('hex')) {
      fail(`${file}: 本文が承認対象と一致しません。再承認が必要です`);
    }
  }
  const value = fields.get('supersedes');
  let supersedes: string[] = [];
  if (value !== undefined) {
    if (!/^\[\s*"\d{4}"(?:\s*,\s*"\d{4}")*\s*\]$/.test(value)) fail(`${file}: supersedesは4桁ID文字列の非空配列にしてください`);
    supersedes = JSON.parse(value) as string[];
    if (new Set(supersedes).size !== supersedes.length) fail(`${file}: supersedesが重複しています`);
  }
  // 冒頭のコメントを除いた最初の本文行をタイトルとする。
  const body = doc[2].replace(/<!--[\s\S]*?-->/g, '').trimStart();
  const title = /^# ADR-(\d{4}):[ \t]+([^\n]+)(?:\n|$)/.exec(body);
  if (!title || title[1] !== name[1] || !title[2].trim() || /<[^>]+>/.test(title[2]) && title[2].includes('<判断')) {
    fail(`${file}: 最初の見出しにファイル名と一致するADR-IDと具体的なタイトルが必要です`);
  }
  return { id: name[1], file, title: title[2].trim(), status, supersedes };
}

function load(): Adr[] {
  if (!existsSync(directory)) return [];
  const records: Adr[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === 'README.md' && entry.isFile()) continue;
    if (!entry.isFile()) fail(`${entry.name}: docs/adr/には通常ファイルを直置きしてください`);
    if (!entry.name.toLowerCase().endsWith('.md')) continue;
    records.push(parse(entry.name, read(join(directory, entry.name))));
  }
  records.sort((a, b) => a.id.localeCompare(b.id));
  const byId = new Map<string, Adr>();
  for (const adr of records) {
    if (byId.has(adr.id)) fail(`${adr.id}: IDが重複しています`);
    byId.set(adr.id, adr);
  }
  const referenced = new Set<string>();
  for (const adr of records) for (const id of adr.supersedes) {
    if (!byId.has(id)) fail(`${adr.id}: 参照先${id}がありません`);
    if (id === adr.id) fail(`${adr.id}: 自己参照しています`);
    if (byId.get(id)!.status === 'Draft') fail(`${adr.id}: 草案${id}は置き換え元にできません`);
    if (adr.status !== 'Draft') referenced.add(id);
  }
  for (const adr of records) {
    if ((adr.status === 'Superseded') !== referenced.has(adr.id)) fail(`${adr.id}: 状態と後継の有無が一致しません`);
  }
  const visited = new Set<string>();
  const active = new Set<string>();
  function visit(id: string): void {
    if (active.has(id)) fail(`${id}: 置き換え関係が循環しています`);
    if (visited.has(id)) return;
    active.add(id);
    for (const previous of byId.get(id)!.supersedes) visit(previous);
    active.delete(id);
    visited.add(id);
  }
  for (const adr of records) visit(adr.id);
  return records;
}

function escape(text: string): string {
  const escapes: Record<string, string> = { '&': '&amp;', '|': '&#124;', '[': '&#91;', ']': '&#93;', '<': '&lt;', '>': '&gt;', '`': '&#96;', '*': '&#42;', '_': '&#95;', '\\': '&#92;' };
  return text.replace(/[&|\[\]<>`*_\\]/g, c => escapes[c]);
}
function render(records: Adr[]): string {
  const byId = new Map(records.map(adr => [adr.id, adr]));
  const link = (id: string) => `[${id}](${encodeURIComponent(byId.get(id)!.file)})`;
  const list = (ids: string[]) => ids.length ? [...ids].sort().map(link).join(', ') : '—';
  return [
    '# ADR一覧', '', '<!-- 自動生成。ADR本体を編集し、一覧生成コマンドを実行してください。 -->', '',
    '| ID | タイトル | 状態 | 置き換え元 | 後継 |', '| --- | --- | --- | --- | --- |',
    ...records.map(adr => `| ${adr.id} | [${escape(adr.title)}](${encodeURIComponent(adr.file)}) | ${adr.status} | ${list(adr.supersedes)} | ${list(records.filter(next => next.status !== 'Draft' && next.supersedes.includes(adr.id)).map(next => next.id))} |`), '',
  ].join('\n');
}

export function run(mode: 'generate' | 'check'): void {
  try {
    const expected = render(load());
    const path = join(directory, 'README.md');
    if (mode === 'generate') {
      mkdirSync(directory, { recursive: true });
      writeFileSync(path, expected);
      console.log('ADR一覧を生成しました。');
    } else {
      if (!existsSync(path) || read(path) !== expected) fail('README.mdが未生成または古くなっています。一覧を再生成してください');
      console.log('ADRと一覧の検証に成功しました。');
    }
  } catch (error) {
    console.error('ADR検証失敗: ' + (error instanceof Error ? error.message : String(error)));
    process.exitCode = 1;
  }
}
