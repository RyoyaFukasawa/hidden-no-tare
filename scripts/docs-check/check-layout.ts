import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const allowedDocsDirectories = new Set(['adr', 'archive', 'product', 'templates']);

export function checkDocsLayout(root: string): string[] {
  const docs = join(root, 'docs');
  if (!existsSync(docs)) return ['docsディレクトリがありません'];
  const docsStat = lstatSync(docs);
  if (docsStat.isSymbolicLink() || !docsStat.isDirectory()) return ['docsは通常ディレクトリにしてください'];

  const errors: string[] = [];
  for (const entry of readdirSync(docs, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(docs, entry.name);
    const stat = lstatSync(path);
    if (!allowedDocsDirectories.has(entry.name)) {
      errors.push(`docs直下に許可されていないエントリがあります: ${entry.name}`);
      continue;
    }
    if (stat.isSymbolicLink() || !stat.isDirectory()) errors.push(`docs直下の許可領域は通常ディレクトリにしてください: ${entry.name}`);
  }
  return errors;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const root = fileURLToPath(new URL('../../', import.meta.url));
    const errors = checkDocsLayout(root);
    for (const error of errors) console.error('ERROR ' + error);
    console.log(`Docs layout: ${errors.length} errors`);
    process.exitCode = errors.length ? 1 : 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
