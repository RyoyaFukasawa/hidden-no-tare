import { checkCompletion } from './completion.ts';
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const requiredSections = ['実現する振る舞い', '依存チケット', '受け入れ条件', '検証結果'];

function visibleLines(body: string): string[] {
  if ((body.match(/<!--/g) ?? []).length !== (body.match(/-->/g) ?? []).length) {
    throw new Error('HTMLコメントが閉じられていません');
  }
  const lines: string[] = [];
  let fence: string | undefined;
  for (const line of body.replace(/<!--[\s\S]*?-->/g, '').split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = undefined;
      continue;
    }
    if (marker) { fence = marker[1]; continue; }
    if (/^( {4}|\t)/.test(line)) continue;
    lines.push(line);
  }
  if (fence) throw new Error('コードフェンスが閉じられていません');
  return lines;
}

function placeholder(value: string): boolean {
  const text = value.trim().replace(/^[-*+ ]+/, '').replace(/^[`*_ ]+|[`*_ ]+$/g, '');
  return /^(TODO|TBD|未記入|受け入れ条件 \d+|条件[A-Z0-9Ａ-Ｚ０-９]+|<[^>]+>)[:：。.!！ ]*$/i.test(text)
    || text === '実行したテスト・確認方法と結果を記載する。';
}

export function validateTicket(text: string, archived: boolean): string[] {
  const problems: string[] = [];
  // Only one canonical metadata field is supported; no general YAML parser is needed.
  const document = /^---\nstatus: ([^\n]+)\n---(?:\n|$)([\s\S]*)$/.exec(text.replace(/\r\n/g, '\n'));
  if (!document) return ['冒頭のメタデータを「--- / status: 値 / ---」の3行で記載してください'];
  const [, status, body] = document;
  let lines: string[];
  try { lines = visibleLines(body); }
  catch (error) { return [...problems, errorMessage(error)]; }
  const titles = lines.filter(line => /^# \S/.test(line));
  if (titles.length !== 1 || titles.some(line => /<番号>|<チケットのタイトル>/.test(line))) {
    problems.push('具体的なタイトル（# 見出し）が1つ必要です');
  }
  const sections = new Map<string, string[]>();
  let current: string | undefined;
  for (const line of lines) {
    const heading = /^(#{1,2}) (.+?)\s*$/.exec(line);
    if (heading) {
      current = heading[1] === '##' ? heading[2] : undefined;
      if (current) {
        if (sections.has(current)) problems.push('見出しが重複しています: ' + current);
        else sections.set(current, []);
      }
    } else if (current && line.trim()) sections.get(current)?.push(line.trim());
  }
  for (const name of requiredSections) {
    if (!sections.has(name)) problems.push('必須見出しがありません: ' + name);
  }
  for (const name of ['実現する振る舞い', '依存チケット']) {
    const content = sections.get(name) ?? [];
    if (!content.length || content.some(line => placeholder(line)
      || line.startsWith('このチケットで実現する一連の振る舞いを、')
      || line.startsWith('着手前に完了が必要なチケットの番号・タイトルを記載する。'))) {
      problems.push(name + 'を記入してください');
    }
  }
  const criteria = sections.get('受け入れ条件') ?? [];
  const uncheckedCriteria: string[] = [];
  for (const line of criteria) {
    const match = /^[-*+] \[([ xX])\] (\S.*)$/.exec(line);
    if (!match || placeholder(match[2])) problems.push('受け入れ条件は具体的なチェックボックス行で記入してください: ' + line);
    else if (match[1] === ' ') uncheckedCriteria.push(match[2]);
  }
  const evidence = (sections.get('検証結果') ?? [])
    .filter(line => /[\p{L}\p{N}]/u.test(line) && !/^#{1,6} /.test(line));
  problems.push(...checkCompletion({
    status, archived, criteriaCount: criteria.length, uncheckedCriteria,
    hasVerificationResults: evidence.length > 0 && !evidence.some(placeholder),
  }));
  return problems;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function* markdownFiles(directory: string): Generator<string> {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) yield* markdownFiles(path);
    else if (entry.name.endsWith('.md')) yield path;
  }
}

export function checkRepository(root: string): { errors: string[]; count: number } {
  const errors: string[] = [];
  let count = 0;
  const base = join(root, 'docs/archive');
  if (existsSync(base)) {
    for (const path of markdownFiles(base)) {
      const parts = relative(base, path).split(/[\\/]/);
      if (parts.length < 3 || parts[1] !== 'issues') continue;
      count++;
      let problems: string[];
      try {
        if (lstatSync(path).isSymbolicLink()) throw new Error('チケットはシンボリックリンクではなく通常ファイルにしてください');
        const text = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path));
        problems = validateTicket(text, true);
      } catch (error) { problems = [errorMessage(error)]; }
      errors.push(...problems.map(problem => `${relative(root, path)}: ${problem}`));
    }
  }
  return { errors, count };
}

export const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const { errors, count } = checkRepository(projectRoot);
    for (const error of errors) console.error('ERROR ' + error);
    console.log(`Work items: ${count} checked, ${errors.length} errors`);
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) {
    console.error('ERROR ' + errorMessage(error));
    process.exitCode = 1;
  }
}
