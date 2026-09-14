import { existsSync, realpathSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadManifest } from './io.ts';
import { spawnSync } from 'node:child_process';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const id = process.argv[2];
  if (!id) { console.error('usage: npm run workflow:finalize -- <change-id>'); process.exitCode = 1; }
  else {
    const path = resolve(projectRoot, '.workflow/changes', id + '.json');
    if (!existsSync(path)) { console.error(`manifestがありません: ${path}`); process.exitCode = 1; }
    else {
      const manifest = loadManifest(path);
      if (manifest.state !== 'complete') { console.error('manifestをstate: completeにしてからfinalizeしてください'); process.exitCode = 1; }
      else {
        const contract = spawnSync('npm', ['run', 'verify:contract'], { cwd: projectRoot, stdio: 'inherit', shell: false });
        const project = contract.status === 0
          ? spawnSync('npm', ['run', 'verify:project'], { cwd: projectRoot, stdio: 'inherit', shell: false })
          : undefined;
        if (contract.error) throw contract.error;
        if (project?.error) throw project.error;
        const status = contract.status !== 0 ? contract.status ?? 1 : project?.status ?? 1;
        if (status !== 0) process.exitCode = status;
        else {
          rmSync(path);
          console.log(`完了契約を確認し、一時manifestを削除しました: ${id}`);
        }
      }
    }
  }
}
