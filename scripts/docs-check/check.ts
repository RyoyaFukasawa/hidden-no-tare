import { globSync, realpathSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function collectDocuments(root: string): string[] {
  return globSync([
    'AGENTS.md', 'workflow/*.md', 'workflow/docs/**/*.md',
    'docs/product/**/*.md', 'docs/adr/**/*.md', 'docs/archive/**/*.md',
  ], { cwd: root }).sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const mode = process.argv[2];
    const files = collectDocuments(root);
    if (!files.length) throw new Error('検証対象のMarkdownがありません');
    let command: string;
    let args: string[];
    if (mode === 'markdown') {
      command = process.execPath;
      args = ['workflow/node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs', '--config', 'workflow/scripts/docs-check/.markdownlint-cli2.jsonc', ...files.map(file => ':' + file)];
    } else if (mode === 'links' || mode === 'links-online') {
      command = 'lychee';
      args = ['--config', 'workflow/scripts/docs-check/lychee.toml', '--root-dir', root,
        ...(mode === 'links' ? ['--offline'] : []), '--files-from', '-'];
    } else throw new Error('引数はmarkdown・links・links-onlineのいずれかにしてください');
    const result = spawnSync(command, args, { cwd: root, input: files.join('\n') + '\n', encoding: 'utf8' });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
