import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Run from the repository root. Count UTF-8 bytes, not model tokens or actual reads.
const base = process.argv[2] ?? '8785d080cd4ee5686db1faca75f34446c67c478b';
const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const previous = (path: string) => execFileSync('git', ['show', `${base}:${path}`], { cwd: root }).byteLength;
const current = (path: string) => readFileSync(resolve(root, path)).byteLength;
const files = ['AGENTS.md', 'CONTEXT.md', 'docs/product/exchangeable-development-workflow.md', 'README.md'];
const common = files.map(path => ({ path, before: previous(path), after: current(path) }));
const sum = (key: 'before' | 'after') => common.reduce((total, file) => total + file[key], 0);
const definitionPath = '.workflow/connections/matt.json';
const definition = JSON.parse(readFileSync(resolve(root, definitionPath), 'utf8'));
const mattBefore = ['docs/agents/domain.md', 'docs/agents/issue-tracker.md'].reduce((total, path) => total + previous(path), 0);
const mattAfter = Object.values<string>({ ...definition.files, ...definition.compatibility }).reduce((total, text) => total + Buffer.byteLength(text), 0);
console.log(JSON.stringify({ base, unit: 'UTF-8 bytes', common,
  commonTotal: { before: sum('before'), after: sum('after') },
  mattDocuments: { before: mattBefore, after: mattAfter },
  mattDefinitionBytes: current(definitionPath),
  note: 'AGENTS is the entrypoint; other common documents are read when relevant. Totals include referenced text to expose relocation rather than true deduplication. Not actual token usage.' }, null, 2));
