import { globSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadManifest } from './io.ts';

/** Verification may not remove or rewrite the approval records it is verifying. */
export function captureCompletionSnapshot(root: string): () => string[] {
  const records = new Map<string, string>();
  for (const file of globSync('.workflow/changes/*.json', { cwd: root })) {
    const path = resolve(root, file);
    if (loadManifest(path).state === 'complete') records.set(path, readFileSync(path, 'utf8'));
  }
  return () => {
    const errors: string[] = [];
    for (const [path, content] of records) {
      try {
        if (readFileSync(path, 'utf8') === content) continue;
      } catch { /* A removed approval record is also an invalidated snapshot. */ }
      errors.push(`検証中に完了マニフェストが変更・削除されました: ${path}`);
    }
    return errors;
  };
}
