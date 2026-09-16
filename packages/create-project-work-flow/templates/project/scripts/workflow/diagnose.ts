import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const expected = ['AGENTS.md', 'workflow.config.json', 'docs/templates/ticket.md', 'docs/templates/product-spec.md', 'docs/templates/change-spec.md', 'docs/templates/adr.md'];

export interface MigrationDiagnosis {
  target: string; scope: 'limited-file-comparison'; checkedFiles: string[]; unchecked: string[];
  missing: string[]; conflicts: string[]; hasConflicts: boolean;
}

export function diagnose(target: string, templateRoot: string): MigrationDiagnosis {
  const missing: string[] = [];
  const conflicts: string[] = [];
  for (const file of expected) {
    const destination = resolve(target, file);
    if (!existsSync(destination)) missing.push(file);
    else {
      const source = resolve(templateRoot, file);
      if (existsSync(source) && readFileSync(destination, 'utf8') !== readFileSync(source, 'utf8')) conflicts.push(file);
    }
  }
  return { target: resolve(target), scope: 'limited-file-comparison', checkedFiles: [...expected],
    unchecked: ['package.json', 'package-lock.json', 'scripts/', 'CI', '既存アプリの動作・互換性'],
    missing, conflicts, hasConflicts: conflicts.length > 0 };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const target = process.argv[2];
  if (!target) { console.error('usage: npm run workflow:diagnose -- <existing-project>'); process.exitCode = 1; }
  else {
    const templateRoot = fileURLToPath(new URL('../../', import.meta.url));
    const report = diagnose(resolve(target), templateRoot);
    console.log(JSON.stringify(report, null, 2));
    console.error('限定した6ファイルの比較です。衝突なしでも導入の安全性は保証しません。未検査項目も確認してください。');
    if (report.conflicts.length) {
      console.error('既存ファイルを自動マージまたは上書きしません。診断結果から提案差分を作り、承認後に適用してください。');
      process.exitCode = 2;
    }
  }
}
