import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadManifest } from './io.ts';
import { connectionSnapshot } from './connections.ts';

/** Verification may not remove or rewrite the approval records it is verifying. */
export function captureCompletionSnapshot(root: string): () => string[] {
  const records = new Map<string, string>();
  for (const file of globSync('.workflow/changes/*.json', { cwd: root })) {
    const path = resolve(root, file);
    if (loadManifest(path).state === 'complete') records.set(path, readFileSync(path, 'utf8'));
  }
  const connections = records.size ? connectionSnapshot(root) : undefined;
  return () => {
    const errors: string[] = [];
    for (const [path, content] of records) {
      try {
        if (readFileSync(path, 'utf8') === content) continue;
      } catch { /* A removed approval record is also an invalidated snapshot. */ }
      errors.push(`検証中に完了マニフェストが変更・削除されました: ${path}`);
    }
    if (connections !== undefined) {
      try {
        if (connectionSnapshot(root) !== connections) errors.push('検証中に外部接続が変更・削除されました');
      } catch (error) { errors.push(`検証中に外部接続が変更されました: ${error instanceof Error ? error.message : String(error)}`); }
    }
    return errors;
  };
}
