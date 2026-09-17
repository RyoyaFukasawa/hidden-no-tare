import { reportVerificationFailure, runLogged } from './workflow/verification-log.ts';
import { fileURLToPath } from 'node:url';
import { checkWorkflowRepository } from './workflow/check-contract.ts';
import { captureCompletionSnapshot } from './workflow/completion-snapshot.ts';

try {
  const cwd = fileURLToPath(new URL('../', import.meta.url));
  const checkSnapshot = captureCompletionSnapshot(cwd);
  const commands = [
    ['scripts/workflow/check-contract.ts'],
    ['scripts/completion-check/check-work-items.ts'],
    ['scripts/adr/check.ts'],
    ['scripts/docs-check/check.ts', 'markdown'],
    ['scripts/docs-check/check.ts', 'links'],
    ['scripts/workflow/verify-project.ts'],
  ];
  for (const args of commands) {
    const result = await runLogged(cwd, args.join(' '), process.execPath, args);
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
  const errors = [...checkSnapshot(), ...checkWorkflowRepository(cwd)];
  if (errors.length) throw new Error(errors.join('\n'));
  console.log('Verification passed (contract, project checks, work items, ADRs and Markdown/links).');
} catch (error) {
  reportVerificationFailure(fileURLToPath(new URL('../', import.meta.url)), error);
  process.exitCode = 1;
}
