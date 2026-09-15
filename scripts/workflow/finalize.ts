import { existsSync, realpathSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadManifest } from './io.ts';
import { reportVerificationFailure, runLogged } from './verification-log.ts';
import { checkWorkflowRepository } from './check-contract.ts';
import { captureCompletionSnapshot } from './completion-snapshot.ts';

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  try {
    const id = process.argv[2];
    if (!id) { console.error('usage: npm run workflow:finalize -- <change-id>'); process.exitCode = 1; }
    else {
      const path = resolve(projectRoot, '.workflow/changes', id + '.json');
      if (!existsSync(path)) { console.error(`manifestがありません: ${path}`); process.exitCode = 1; }
      else {
        const manifest = loadManifest(path);
        if (manifest.state !== 'complete') { console.error('manifestをstate: completeにしてからfinalizeしてください'); process.exitCode = 1; }
        else {
          const checkSnapshot = captureCompletionSnapshot(projectRoot);
          const contract = await runLogged(projectRoot, 'verify:contract', 'npm', ['run', 'verify:contract']);
          const project = contract.status === 0
            ? await runLogged(projectRoot, 'verify:project', 'npm', ['run', 'verify:project'])
            : undefined;
          const launchError = contract.error ?? project?.error;
          if (launchError) {
            console.error('npmで検証を起動できません。Node.js 24.12.0以上と同梱npm・PATHを確認してください。README.mdの初期セットアップを参照してください。');
            console.error(launchError.message);
          }
          const status = contract.status !== 0 ? contract.status : project?.status ?? 1;
          if (status !== 0) process.exitCode = status;
          else {
            const errors = [...checkSnapshot(), ...checkWorkflowRepository(projectRoot)];
            if (errors.length) {
              reportVerificationFailure(projectRoot, errors.join('\n'));
              process.exitCode = 1;
            } else {
              rmSync(path);
              console.log(`完了契約を確認し、一時manifestを削除しました: ${id}`);
            }
          }
        }
      }
    }
  } catch (error) {
    reportVerificationFailure(projectRoot, error);
    process.exitCode = 1;
  }
}
