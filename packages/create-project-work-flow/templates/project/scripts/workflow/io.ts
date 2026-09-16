import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig, WorkflowManifest } from './contract.ts';
import { checkConfigShape, checkManifestShape } from './schema.ts';

function readJson(path: string): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path)));
}

export function loadConfig(root: string): WorkflowConfig {
  const path = resolve(root, 'workflow.config.json');
  if (!existsSync(path)) throw new Error('workflow.config.jsonがありません');
  const value = readJson(path);
  const errors = checkConfigShape(value);
  if (errors.length) throw new Error(errors.join('\n'));
  return value as WorkflowConfig;
}

export function loadManifest(path: string): WorkflowManifest {
  const value = readJson(path);
  const errors = checkManifestShape(value);
  if (errors.length) throw new Error(errors.join('\n'));
  return value as WorkflowManifest;
}
