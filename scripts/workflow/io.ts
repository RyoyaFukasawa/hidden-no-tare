import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { WorkflowConfig, WorkflowManifest } from './contract.ts';

function readJson(path: string): unknown {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(path)));
}

export function loadConfig(root: string): WorkflowConfig {
  const path = resolve(root, 'workflow.config.json');
  if (!existsSync(path)) throw new Error('workflow.config.jsonがありません');
  return readJson(path) as WorkflowConfig;
}

export function loadManifest(path: string): WorkflowManifest {
  return readJson(path) as WorkflowManifest;
}
