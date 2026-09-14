import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { WorkflowManifest } from './contract.ts';

export function createManifest(id: string, summary: string, workflowName: string, version: string, adapter: string): WorkflowManifest {
  return {
    schemaVersion: 1, id, summary, state: 'researching', risk: null, classificationConfirmed: false,
    traits: { behaviorChanged: null, publicApiChanged: null, architectureDecisionChanged: null, dataMigration: null, highRiskCategories: [] },
    workflow: { name: workflowName, version, adapter, certified: false },
    artifacts: {}, checks: [],
  };
}

const projectRoot = fileURLToPath(new URL('../../', import.meta.url));
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [id, summary, workflowName, version, adapter] = process.argv.slice(2);
  if (!id || !summary || !workflowName || !version || !adapter) {
    console.error('usage: npm run workflow:prepare -- <id> <summary> <workflow> <version> <adapter>');
    process.exitCode = 1;
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
    console.error('変更IDは小文字英数字とハイフンで記載してください'); process.exitCode = 1;
  } else {
    const directory = resolve(projectRoot, '.workflow/changes');
    const path = resolve(directory, id + '.json');
    if (existsSync(path)) { console.error(`既存manifestを上書きしません: ${path}`); process.exitCode = 1; }
    else {
      mkdirSync(directory, { recursive: true });
      writeFileSync(path, JSON.stringify(createManifest(id, summary, workflowName, version, adapter), null, 2) + '\n');
      console.log(`researching状態のmanifestを作成しました: ${path}`);
    }
  }
}
