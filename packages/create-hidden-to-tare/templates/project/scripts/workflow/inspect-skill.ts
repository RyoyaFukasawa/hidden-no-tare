import { existsSync, globSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const risky: [string, RegExp][] = [
  ['破壊的削除', /\brm\s+-rf\b/], ['Git履歴の破壊', /\bgit\s+reset\s+--hard\b/],
  ['秘密情報へのアクセス', /(?:\.env|credentials|private[_ -]?key|secret)/i],
  ['外部送信', /\b(?:curl|wget)\b[^\n]*(?:-d|--data|--upload-file)/],
  ['指示ファイルの変更', /(?:AGENTS|CLAUDE)\.md[^\n]*(?:write|edit|overwrite|変更|上書き)/i],
];

export function inspectSkill(directory: string): string[] {
  if (!existsSync(directory) || !statSync(directory).isDirectory()) throw new Error(`SKILLディレクトリがありません: ${directory}`);
  const findings: string[] = [];
  for (const file of globSync('**/*', { cwd: directory, exclude: ['node_modules/**'] }).sort()) {
    const path = resolve(directory, file);
    let text: string;
    try { text = readFileSync(path, 'utf8'); } catch { continue; }
    for (const [name, pattern] of risky) if (pattern.test(text)) findings.push(`${file}: ${name}`);
  }
  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const directory = process.argv[2];
  if (!directory) { console.error('usage: npm run workflow:inspect-skill -- <directory>'); process.exitCode = 1; }
  else {
    const findings = inspectSkill(resolve(directory));
    for (const finding of findings) console.error('REVIEW ' + finding);
    console.log(`Skill inspection: ${findings.length} findings`);
    process.exitCode = findings.length ? 1 : 0;
  }
}
