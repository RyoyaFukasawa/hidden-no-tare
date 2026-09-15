import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkWorkflowRepository } from './check-contract.ts';
import { createManifest } from './prepare.ts';

const source = fileURLToPath(new URL('../../', import.meta.url));
function fixture(t: TestContext) {
  const root = mkdtempSync(join(tmpdir(), 'completion-git-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = (...args: string[]) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  writeFileSync(join(root, '.gitignore'), 'node_modules/\n.workflow/changes/*.json\n.workflow/logs/\nignored/\n');
  writeFileSync(join(root, 'AGENTS.md'), '# 接続\n\nworkflow:prepare verify\n');
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify({ schemaVersion: 1, exceptionDefaultDays: 7,
    exceptionMaximumDays: 30, additionalHighRiskCategories: [], projectChecks: [] }));
  writeFileSync(join(root, 'ticket.md'), '# Reviewed work\n');
  git('init', '--initial-branch=main');
  git('config', 'user.name', 'Contract fixture');
  git('config', 'user.email', 'fixture@example.invalid');
  git('add', '.');
  git('commit', '-m', 'test: reviewed work');
  const manifest = createManifest('sample', 'レビュー済み変更');
  Object.assign(manifest, {
    state: 'complete', risk: 'high', classificationConfirmed: true,
    traits: { behaviorChanged: false, publicApiChanged: false, architectureDecisionChanged: false, dataMigration: false, highRiskCategories: ['completion-contract'] },
    artifacts: { ticket: 'ticket.md' }, checks: [{ name: 'fixture', status: 'passed', evidence: 'reviewed fixture' }],
    review: { kind: 'human', approver: 'fixture-only', reviewedAt: '2026-09-15T00:00:00Z', commit: git('rev-parse', 'HEAD') },
  });
  mkdirSync(join(root, '.workflow/changes'), { recursive: true });
  const path = join(root, '.workflow/changes/sample.json');
  const save = () => writeFileSync(path, JSON.stringify(manifest));
  save();
  return { root, git, manifest, path, save };
}

test('同じ承認HEADでも追跡ファイルの未コミット変更を拒否する', t => {
  const { root } = fixture(t);
  assert.deepEqual(checkWorkflowRepository(root), []);
  writeFileSync(join(root, 'ticket.md'), '# Changed after approval\n');
  assert.ok(checkWorkflowRepository(root).some(error => error.includes('未コミット変更')), '承認後の編集を止める');
});

test('staged・untracked・rename・削除を完了時に拒否する', async t => {
  for (const action of ['staged', 'untracked', 'rename', 'delete']) await t.test(action, child => {
    const { root, git } = fixture(child);
    if (action === 'staged') { writeFileSync(join(root, 'ticket.md'), '# staged\n'); git('add', 'ticket.md'); }
    if (action === 'untracked') writeFileSync(join(root, 'new file\n名前.txt'), 'unreviewed');
    if (action === 'rename') git('mv', 'ticket.md', 'renamed ticket.md');
    if (action === 'delete') rmSync(join(root, 'ticket.md'));
    assert.ok(checkWorkflowRepository(root).some(error => error.includes('未コミット変更')), action);
  });
});

test('例外は有効な未追跡マニフェストだけで、追跡済みや不正JSONを許可しない', t => {
  const { root, git, manifest, path, save } = fixture(t);
  // Manifest can be untracked without being ignored; ignored build outputs remain allowed.
  writeFileSync(join(root, '.gitignore'), 'node_modules/\nignored/\n');
  git('add', '.gitignore'); git('commit', '-m', 'test: manifest is untracked');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  mkdirSync(join(root, 'ignored')); writeFileSync(join(root, 'ignored/build.txt'), 'build');
  assert.deepEqual(checkWorkflowRepository(root), []);
  writeFileSync(join(root, '.workflow/changes/not-a-manifest.json'), '{}');
  assert.ok(checkWorkflowRepository(root).length);
  rmSync(join(root, '.workflow/changes/not-a-manifest.json'));
  git('add', '.workflow/changes/sample.json'); git('commit', '-m', 'test: tracked manifest');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  assert.ok(checkWorkflowRepository(root).some(error => error.includes('Git追跡')));
  assert.ok(existsSync(path));
});

test('承認後のコミット変更は失効し、review状態なら通常の開発中検証を許可する', t => {
  const { root, git, manifest, save } = fixture(t);
  git('commit', '--allow-empty', '-m', 'test: new commit');
  assert.ok(checkWorkflowRepository(root).some(error => error.includes('失効')));
  manifest.state = 'review'; save();
  writeFileSync(join(root, 'ticket.md'), '# work in progress\n');
  assert.deepEqual(checkWorkflowRepository(root), []);
});

function cliFixture(t: TestContext, projectCode: string) {
  const result = fixture(t);
  const { root, git, manifest, save } = result;
  cpSync(join(source, 'scripts'), join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'docs/adr'), { recursive: true });
  symlinkSync(join(source, 'node_modules'), join(root, 'node_modules'), 'dir');
  writeFileSync(join(root, 'package.json'), JSON.stringify({ type: 'module', scripts: {
    'verify:contract': 'node scripts/workflow/check-contract.ts',
    'verify:project': 'node scripts/workflow/verify-project.ts',
  } }));
  const config = JSON.parse(readFileSync(join(root, 'workflow.config.json'), 'utf8'));
  config.projectChecks = [{ name: 'fixture', command: process.execPath, args: ['-e', projectCode] }];
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify(config));
  execFileSync(process.execPath, ['scripts/adr/generate.ts'], { cwd: root });
  git('add', '.'); git('commit', '-m', 'test: real CLI fixture');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  return result;
}

test('verifyは成功出力を要約し詳細をGit管理外のログへ保存する', t => {
  const { root, git } = cliFixture(t, "console.log('DETAIL-START'); console.log('passing detail\\n'.repeat(1000)); console.log('DETAIL-END')");
  const result = spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: root, encoding: 'utf8' });
  const output = result.stdout + result.stderr;
  assert.equal(result.status, 0, output);
  assert.doesNotMatch(output, /passing detail/);
  assert.ok(Buffer.byteLength(output) < 2000);
  assert.match(output, /Log: \.workflow\/logs\//);
  const logs = readdirSync(join(root, '.workflow/logs')).filter(file => file.endsWith('.log'));
  const content = logs.map(file => readFileSync(join(root, '.workflow/logs', file), 'utf8')).join('\n');
  assert.match(content, /DETAIL-START/);
  assert.match(content, /DETAIL-END/);
  assert.equal(git('status', '--porcelain'), '');
});

test('finalizeも出力を要約し成功時だけマニフェストを削除する', t => {
  const { root, path } = cliFixture(t, "console.log('FINALIZE-DETAIL\\n'.repeat(1000))");
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.ok(!result.stdout.includes('FINALIZE-DETAIL'), '成功詳細はログだけに残す');
  assert.match(result.stdout, /Log: \.workflow\/logs\//);
  assert.equal(existsSync(path), false);
});

test('過大な失敗出力は先頭と末尾を残し元の終了コードと記録を保持する', async t => {
  for (const entry of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) await t.test(entry, child => {
    const code = "const fs=require('node:fs');fs.writeSync(1,'OUTPUT-HEAD\\n');fs.writeSync(1,Buffer.alloc(2*1024*1024,120));fs.writeSync(1,'\\nOUTPUT-TAIL\\n');process.exit(7)";
    const { root, path } = cliFixture(child, code);
    const before = readFileSync(path, 'utf8');
    const result = spawnSync(process.execPath, [entry, ...(entry.endsWith('finalize.ts') ? ['sample'] : [])], { cwd: root, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
    const output = result.stdout + result.stderr;
    assert.equal(result.status, 7);
    assert.ok(Buffer.byteLength(output) < 10000, '失敗表示も上限付き');
    assert.match(output, /OUTPUT-HEAD/);
    assert.match(output, /OUTPUT-TAIL/);
    assert.match(output, /省略/);
    const files = [...output.matchAll(/Log: (\.workflow\/logs\/[^\s]+)/g)].map(match => match[1]);
    const log = readFileSync(join(root, files.at(-1)!));
    assert.ok(log.length <= 1024 * 1024, '単独ログ上限1MiB');
    assert.match(log.toString(), /OUTPUT-HEAD/);
    assert.match(log.toString(), /OUTPUT-TAIL/);
    assert.match(log.toString(), /省略/);
    assert.equal(readFileSync(path, 'utf8'), before);
  });
});

test('ログは10件・合計5MiB以内に整理し管理外のファイルを保持する', t => {
  const code = "require('node:fs').writeSync(1,Buffer.alloc(2*1024*1024,120));process.exit(1)";
  const { root, path } = cliFixture(t, code);
  const directory = join(root, '.workflow/logs');
  mkdirSync(directory);
  writeFileSync(join(directory, 'notes.txt'), 'user notes');
  let oldest = '';
  for (let index = 0; index < 7; index++) {
    const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.ok(existsSync(path));
    if (!index) oldest = /Log: (\.workflow\/logs\/[^\s]+)/.exec(result.stdout)![1];
  }
  const logs = readdirSync(directory).filter(file => file.endsWith('.log'));
  assert.ok(logs.length <= 10, '件数上限');
  assert.ok(logs.reduce((sum, file) => sum + statSync(join(directory, file)).size, 0) <= 5 * 1024 * 1024, '容量上限');
  assert.equal(existsSync(join(root, oldest)), false, '古いログから削除');
  assert.equal(readFileSync(join(directory, 'notes.txt'), 'utf8'), 'user notes');
});

test('ログ保存障害や保存先symlinkでは成功扱いせず記録と領域外データを保持する', async t => {
  for (const kind of ['file', 'symlink']) await t.test(kind, child => {
    const { root, path } = cliFixture(child, "console.log('passed')");
    const outside = mkdtempSync(join(tmpdir(), 'log-outside-'));
    child.after(() => rmSync(outside, { recursive: true, force: true }));
    writeFileSync(join(outside, 'keep.txt'), 'keep');
    if (kind === 'file') writeFileSync(join(root, '.workflow/logs'), 'not a directory');
    else symlinkSync(outside, join(root, '.workflow/logs'), 'dir');
    const before = readFileSync(path, 'utf8');
    for (const entry of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) {
      const result = spawnSync(process.execPath, [entry, ...(entry.endsWith('finalize.ts') ? ['sample'] : [])], { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, /検証ログ.*保存/);
      assert.equal(readFileSync(path, 'utf8'), before);
      assert.deepEqual(readdirSync(outside), ['keep.txt']);
    }
  });
});

test('検証後の完了境界の失敗も診断ログへ残す', t => {
  const { root, path } = cliFixture(t, "require('node:fs').writeFileSync('generated.txt','unreviewed')");
  const before = readFileSync(path, 'utf8');
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1);
  const files = [...result.stdout.matchAll(/Log: (\.workflow\/logs\/[^\s]+)/g)].map(match => match[1]);
  assert.match(readFileSync(join(root, files.at(-1)!), 'utf8'), /未コミット変更/);
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('ログ所有確認のGit失敗では新しいログを作らず診断付きで拒否する', t => {
  const { root, path } = cliFixture(t, "console.log('passed')");
  const bin = mkdtempSync(join(tmpdir(), 'logging-git-failure-'));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  const git = execFileSync('which', ['git'], { encoding: 'utf8' }).trim();
  // System-boundary fault injection: real Git handles everything except log ownership lookup.
  writeFileSync(join(bin, 'git'), `#!${process.execPath}\nconst {spawnSync}=require('node:child_process');const args=process.argv.slice(2);if(args.includes('.workflow/logs'))process.exit(23);const result=spawnSync(${JSON.stringify(git)},args,{stdio:'inherit'});process.exit(result.status??1);\n`, { mode: 0o755 });
  const directory = join(root, '.workflow/logs');
  mkdirSync(directory); writeFileSync(join(directory, 'notes.txt'), 'keep');
  const before = readFileSync(path, 'utf8');
  for (const entry of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) {
    const result = spawnSync(process.execPath, [entry, ...(entry.endsWith('finalize.ts') ? ['sample'] : [])], {
      cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /ログ.*所有確認/);
    assert.deepEqual(readdirSync(directory), ['notes.txt']);
    assert.equal(readFileSync(path, 'utf8'), before);
  }
});

test('ログ整理でもGit追跡へ変更されたログと偽装名の利用者ファイルは削除しない', t => {
  const { root, git, manifest, save } = cliFixture(t, "console.log('passed')");
  const run = () => spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: root, encoding: 'utf8' });
  const first = run();
  assert.equal(first.status, 0);
  const tracked = /Log: (\.workflow\/logs\/[^\s]+)/.exec(first.stdout)![1];
  const content = readFileSync(join(root, tracked), 'utf8');
  git('add', '-f', tracked); git('commit', '-m', 'test: user tracked a log');
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  const unknown = join(root, '.workflow/logs/verification-1-00000000-0000-0000-0000-000000000000.log');
  writeFileSync(unknown, 'user-owned content');
  for (let index = 0; index < 3; index++) {
    const result = run();
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  assert.equal(readFileSync(join(root, tracked), 'utf8'), content);
  assert.equal(readFileSync(unknown, 'utf8'), 'user-owned content');
  assert.equal(git('status', '--porcelain'), '');
});

test('researchingのverifyは草案を許可し承認不備・本文変更を拒否する', t => {
  const { root, manifest, path, save } = cliFixture(t, "console.log('fixture passed')");
  manifest.state = 'researching';
  delete manifest.review;
  save();
  const file = join(root, 'docs/adr/0001-approval.md');
  const body = '\n# ADR-0001: Approval fixture\n\nBody.\n';
  const draft = `---\nstatus: Draft\n---\n${body}`;
  const approved = '---\nstatus: Accepted\napprovedBy: "fixture-only"\n'
    + 'approvedAt: "2026-09-15T00:00:00Z"\n'
    + 'approvedBodySha256: "de79e697f08e2691c08eb1356da8a5024422c8e54756c72cd17ee9843b6e81c3"\n'
    + `---\n${body}`;
  const run = (script: string) => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  writeFileSync(file, draft);
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  const originalManifest = readFileSync(path, 'utf8');
  const draftVerification = run('scripts/verify.ts');
  assert.equal(draftVerification.status, 0, draftVerification.stdout + draftVerification.stderr);
  for (const [name, content] of [
    ['草案の形式不正', draft.replace('ADR-0001', 'ADR-0002')],
    ['承認欠落', draft.replace('Draft', 'Accepted')],
    ['承認型不正', approved.replace('"fixture-only"', 'false')],
    ['本文変更', approved.replace('Body.', 'Changed.')],
  ]) {
    writeFileSync(file, content);
    const result = run('scripts/verify.ts');
    assert.equal(result.status, 1, name + ': ' + result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /ADR検証失敗/);
    assert.equal(readFileSync(file, 'utf8'), content);
    assert.equal(readFileSync(path, 'utf8'), originalManifest);
  }
  writeFileSync(file, approved);
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  // 別の有効草案があるだけでは、承認済みADRの検証を妨げない。
  writeFileSync(join(root, 'docs/adr/0002-other.md'), draft.replace('ADR-0001', 'ADR-0002'));
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  const final = run('scripts/verify.ts');
  assert.equal(final.status, 0, final.stdout + final.stderr);
  assert.equal(readFileSync(path, 'utf8'), originalManifest);
  // マニフェストが片付いても、ADR自体の承認検査は続く。
  rmSync(path);
  assert.equal(run('scripts/adr/check.ts').status, 0);
  writeFileSync(file, approved.replace('Body.', 'Changed.'));
  assert.equal(run('scripts/adr/check.ts').status, 1);
});

test('ADR依存は調査中の草案を許可しready以降を拒否する', t => {
  const { root, manifest, path, save } = cliFixture(t, "console.log('fixture passed')");
  Object.assign(manifest, { state: 'researching', adrDependencies: ['0001'] });
  save();
  writeFileSync(join(root, 'docs/adr/0001-decision.md'), '---\nstatus: Draft\n---\n\n# ADR-0001: Decision\n');
  const run = (script: string) => spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8' });
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  const research = run('scripts/verify.ts');
  assert.equal(research.status, 0, research.stdout + research.stderr);
  for (const state of ['ready', 'implementing', 'review', 'complete'] as const) {
    manifest.state = state; save();
    const original = readFileSync(path, 'utf8');
    const result = run('scripts/verify.ts');
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /ADR依存.*0001.*本文承認/);
    assert.equal(readFileSync(path, 'utf8'), original);
  }
});

test('ADR成果物も依存として扱い不正な依存入力や成果物の代用を拒否する', t => {
  const { root, manifest, save } = cliFixture(t, '');
  const checkCli = () => spawnSync(process.execPath, ['scripts/workflow/check-contract.ts'], { cwd: root, encoding: 'utf8' });
  manifest.state = 'implementing';
  manifest.artifacts.adr = 'docs/adr/0001-decision.md';
  writeFileSync(join(root, manifest.artifacts.adr), '---\nstatus: Draft\n---\n\n# ADR-0001: Decision\n');
  save();
  assert.ok(checkWorkflowRepository(root).some(error => /ADR依存.*0001.*本文承認/.test(error)));
  manifest.artifacts.adr = 'ticket.md'; save();
  assert.ok(checkWorkflowRepository(root).some(error => /ADR成果物/.test(error)));
  delete manifest.artifacts.adr;
  for (const value of [null, {}, '0001', [1], ['../0001'], [''], ['0001', '0001']]) {
    Object.assign(manifest, { adrDependencies: value }); save();
    const result = checkCli();
    assert.equal(result.status, 1, JSON.stringify(value));
    assert.match(result.stdout + result.stderr, /adrDependencies/);
  }
  manifest.adrDependencies = ['9999']; save();
  const missing = checkCli();
  assert.equal(missing.status, 1);
  assert.match(missing.stdout + missing.stderr, /ADR依存9999が存在しません/);
  manifest.adrDependencies = []; save();
  assert.equal(checkCli().status, 0);
  delete manifest.adrDependencies;
  manifest.traits.architectureDecisionChanged = true; save();
  assert.ok(checkWorkflowRepository(root).some(error => /必要な成果物.*adr/.test(error)));
});

test('ADR依存の承認・失効・再承認とfinalizeの記録保持をCLIで確認する', t => {
  const { root, git, manifest, path, save } = cliFixture(t, "console.log('fixture passed')");
  const file = join(root, 'docs/adr/0001-decision.md');
  const body = '\n# ADR-0001: Decision\n\nBody.\n';
  // テスト専用の承認記録。実運用では人間が本文を承認した後だけ記録する。
  const approved = (text: string) => '---\nstatus: Accepted\napprovedBy: "fixture-only"\n'
    + 'approvedAt: "2026-09-15T00:00:00Z"\n'
    + `approvedBodySha256: "${createHash('sha256').update(text).digest('hex')}"\n---\n${text}`;
  const run = (script: string) => spawnSync(process.execPath, [script, ...(script.endsWith('finalize.ts') ? ['sample'] : [])], { cwd: root, encoding: 'utf8' });
  const commit = () => {
    git('add', '.'); git('commit', '--allow-empty', '-m', 'test: fixture approval');
    manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  };
  manifest.adrDependencies = ['0001'];
  writeFileSync(file, approved(body));
  writeFileSync(join(root, 'docs/adr/0002-other.md'), '---\nstatus: Draft\n---\n\n# ADR-0002: Other\n');
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  commit();
  for (const state of ['ready', 'implementing', 'review', 'complete'] as const) {
    manifest.state = state; save();
    const result = run('scripts/verify.ts');
    assert.equal(result.status, 0, result.stdout + result.stderr);
  }
  const mutations = [
    ['草案', `---\nstatus: Draft\n---\n${body}`, /ADR依存.*本文承認/],
    ['承認欠落', `---\nstatus: Accepted\n---\n${body}`, /承認記録/],
    ['承認型不正', approved(body).replace('"fixture-only"', 'false'), /承認記録/],
    ['誤字', approved(body).replace('Body.', 'Boddy.'), /本文が承認対象/],
    ['整形', approved(body) + '\n', /本文が承認対象/],
    ['リンク', approved(body) + '\n[Other](0002-other.md)\n', /本文が承認対象/],
  ] as const;
  for (const [name, content, diagnostic] of mutations) {
    writeFileSync(file, content);
    for (const state of ['implementing', 'complete'] as const) {
      manifest.state = state; commit();
      const before = readFileSync(path, 'utf8');
      for (const script of ['scripts/verify.ts', ...(state === 'complete' ? ['scripts/workflow/finalize.ts'] : [])]) {
        const result = run(script);
        assert.equal(result.status, 1, name + result.stdout + result.stderr);
        assert.match(result.stdout + result.stderr, diagnostic);
        assert.equal(readFileSync(path, 'utf8'), before);
        assert.equal(readFileSync(file, 'utf8'), content);
      }
    }
  }
  writeFileSync(file, approved(body + '\nReapproved fixture body.\n'));
  assert.equal(run('scripts/adr/generate.ts').status, 0);
  commit();
  const result = run('scripts/workflow/finalize.ts');
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path), false);
  assert.equal(git('status', '--porcelain'), '');
});

test('検証中に依存ADRが失効しても完了を成功扱いしない', async t => {
  for (const script of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) await t.test(script, child => {
    const code = "const fs = require('node:fs'); const p = 'docs/adr/0001-decision.md'; fs.appendFileSync(p, '\\nChanged.\\n')";
    const { root, git, manifest, path, save } = cliFixture(child, code);
    const body = '\n# ADR-0001: Approval fixture\n\nBody.\n';
    writeFileSync(join(root, 'docs/adr/0001-decision.md'), '---\nstatus: Accepted\napprovedBy: "fixture-only"\n'
      + 'approvedAt: "2026-09-15T00:00:00Z"\n'
      + 'approvedBodySha256: "de79e697f08e2691c08eb1356da8a5024422c8e54756c72cd17ee9843b6e81c3"\n'
      + `---\n${body}`);
    execFileSync(process.execPath, ['scripts/adr/generate.ts'], { cwd: root });
    git('add', '.'); git('commit', '-m', 'test: approved dependency');
    manifest.adrDependencies = ['0001']; manifest.review!.commit = git('rev-parse', 'HEAD'); save();
    const before = readFileSync(path, 'utf8');
    const result = spawnSync(process.execPath, [script, ...(script.endsWith('finalize.ts') ? ['sample'] : [])], { cwd: root, encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /本文が承認対象/);
    assert.equal(readFileSync(path, 'utf8'), before);
  });
});

function lightweightFixture(t: TestContext, projectCode = "console.log('fixture passed')") {
  const result = cliFixture(t, projectCode);
  const { git, manifest, save } = result;
  git('rm', 'ticket.md');
  git('commit', '-m', 'test: no ticket for lightweight change');
  Object.assign(manifest, {
    risk: 'low',
    lightweight: { reason: 'コメントの誤字だけを修正し、動作・仕様の意味は変わらない' },
    traits: { behaviorChanged: false, publicApiChanged: false, architectureDecisionChanged: false, dataMigration: false, highRiskCategories: [] },
    artifacts: {},
    review: { kind: 'agent', approver: 'independent-fixture-reviewer', reviewedAt: '2026-09-15T00:00:00Z',
      commit: git('rev-parse', 'HEAD'), lightweightConfirmed: true },
  });
  save();
  return result;
}

test('軽微変更はチケットなしでverifyとfinalizeを通り、一時記録だけを削除する', t => {
  const { root, path, git } = lightweightFixture(t);
  const before = git('rev-parse', 'HEAD');
  const verify = spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: root, encoding: 'utf8' });
  assert.equal(verify.status, 0, verify.stdout + verify.stderr);
  assert.ok(existsSync(path));
  const finalize = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(finalize.status, 0, finalize.stdout + finalize.stderr);
  assert.equal(existsSync(path), false);
  assert.equal(existsSync(join(root, 'ticket.md')), false);
  assert.equal(existsSync(join(root, 'docs/archive')), false);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('rev-parse', 'HEAD'), before);
});

test('軽微変更の空白だけの分類理由は拒否し、記録を保持する', t => {
  const { root, manifest, path, save } = lightweightFixture(t);
  manifest.lightweight!.reason = ' \n\t'; save();
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /分類理由/);
  assert.ok(existsSync(path));
});

test('軽微変更の分類を独立レビューが確認していなければ完了できない', async t => {
  for (const confirmed of [undefined, false]) await t.test(String(confirmed), child => {
    const { root, manifest, path, save } = lightweightFixture(child);
    manifest.review!.lightweightConfirmed = confirmed; save();
    const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
    assert.notEqual(result.status, 0, result.stdout + result.stderr);
    assert.match(result.stdout + result.stderr, /軽微変更.*レビュー/);
    assert.ok(existsSync(path));
  });
});

test('軽微変更と高リスク・変更特性の矛盾は拒否する', async t => {
  for (const trait of ['high', 'highRiskCategories', 'behaviorChanged', 'publicApiChanged', 'architectureDecisionChanged', 'dataMigration'] as const) {
    await t.test(trait, child => {
      const { root, manifest, path, save } = lightweightFixture(child);
      manifest.artifacts = { productSpec: 'AGENTS.md', changeSpec: 'AGENTS.md', adr: 'AGENTS.md' };
      if (trait === 'high' || trait === 'highRiskCategories') {
        manifest.risk = 'high'; manifest.review!.kind = 'human';
        if (trait === 'highRiskCategories') manifest.traits.highRiskCategories = ['completion-contract'];
      } else manifest.traits[trait] = true;
      save();
      const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, /軽微変更.*矛盾/);
      assert.ok(existsSync(path));
    });
  }
});

test('軽微変更でも不正JSONや不足した検証・レビューをCLIで拒否する', async t => {
  const cases: [string, Record<string, unknown>, RegExp][] = [
    ['null宣言', { lightweight: null }, /lightweight/],
    ['配列宣言', { lightweight: [] }, /lightweight/],
    ['理由なし', { lightweight: {} }, /reason/],
    ['理由の型不正', { lightweight: { reason: 1 } }, /reason/],
    ['未対応の分類', { lightweight: { reason: '誤字', kind: 'refactor' } }, /未対応/],
    ['検証なし', { checks: [] }, /検証結果/],
    ['検証失敗', { checks: [{ name: 'fixture', status: 'failed', evidence: 'failed run' }] }, /検証が成功/],
    ['未検証', { checks: [{ name: 'fixture', status: 'pending', evidence: 'not run' }] }, /検証が成功/],
    ['証跡なし', { checks: [{ name: 'fixture', status: 'passed' }] }, /検証証跡/],
    ['レビューなし', { review: undefined }, /レビュー/],
    ['分類未確定', { classificationConfirmed: false }, /分類の確定/],
    ['リスク未確定', { risk: null }, /リスク/],
  ];
  for (const [name, patch, diagnostic] of cases) await t.test(name, child => {
    const { root, path, manifest } = lightweightFixture(child);
    writeFileSync(path, JSON.stringify({ ...manifest, ...patch }));
    const before = readFileSync(path, 'utf8');
    for (const args of [['scripts/verify.ts'], ['scripts/workflow/finalize.ts', 'sample']]) {
      const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, diagnostic);
      assert.equal(readFileSync(path, 'utf8'), before);
    }
  });
});

test('軽微変更のレビュー分類確認はbooleanだけを受け付ける', t => {
  const { root, path, manifest } = lightweightFixture(t);
  writeFileSync(path, JSON.stringify({ ...manifest, review: { ...manifest.review, lightweightConfirmed: 'true' } }));
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /lightweightConfirmed.*boolean/);
  assert.ok(existsSync(path));
});

test('軽微変更の宣言を外して通常扱いへ戻すとチケットが必要になる', t => {
  const { root, manifest, path, git, save } = lightweightFixture(t);
  delete manifest.lightweight;
  manifest.review!.lightweightConfirmed = false;
  save();
  const denied = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(denied.status, 1, denied.stdout + denied.stderr);
  assert.match(denied.stdout + denied.stderr, /成果物.*ticket/);
  assert.ok(existsSync(path));
  writeFileSync(join(root, 'ticket.md'), '# Reviewed normal work\n');
  git('add', 'ticket.md'); git('commit', '-m', 'test: normal change ticket');
  manifest.artifacts.ticket = 'ticket.md';
  manifest.review!.commit = git('rev-parse', 'HEAD'); save();
  const accepted = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stdout + accepted.stderr);
  assert.equal(existsSync(path), false);
});

test('軽微変更の宣言がない従来形式は低リスクでもチケットを要求する', t => {
  const { root, manifest, path, save } = lightweightFixture(t);
  delete manifest.lightweight;
  delete manifest.review!.lightweightConfirmed;
  save();
  const result = spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /成果物.*ticket/);
  assert.ok(existsSync(path));
});

test('軽微変更も承認後のHEAD・staged・unstaged・untracked変更を拒否する', async t => {
  for (const change of ['HEAD', 'staged', 'unstaged', 'untracked']) await t.test(change, child => {
    const { root, git, path } = lightweightFixture(child);
    if (change === 'HEAD') git('commit', '--allow-empty', '-m', 'test: invalidate approval');
    if (change === 'staged' || change === 'unstaged') writeFileSync(join(root, 'AGENTS.md'), '# changed\n');
    if (change === 'staged') git('add', 'AGENTS.md');
    if (change === 'untracked') writeFileSync(join(root, 'new.txt'), 'new');
    for (const args of [['scripts/verify.ts'], ['scripts/workflow/finalize.ts', 'sample']]) {
      const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, change === 'HEAD' ? /失効/ : /未コミット変更/);
      assert.ok(existsSync(path));
    }
  });
});

test('軽微変更も検証中の生成物・記録変更・削除・検証失敗を拒否する', async t => {
  const cases: [string, string, RegExp][] = [
    ['生成物', "require('node:fs').writeFileSync('generated.txt', 'unreviewed')", /未コミット変更/],
    ['記録変更', "const fs=require('node:fs');const p='.workflow/changes/sample.json';const m=JSON.parse(fs.readFileSync(p));m.lightweight.reason='rewritten';fs.writeFileSync(p,JSON.stringify(m));", /検証中.*マニフェスト/],
    ['記録削除', "require('node:fs').unlinkSync('.workflow/changes/sample.json')", /検証中.*マニフェスト/],
    ['検証失敗', "process.exit(1)", /fixture/],
  ];
  for (const [name, code, diagnostic] of cases) {
    for (const args of [['scripts/verify.ts'], ['scripts/workflow/finalize.ts', 'sample']]) await t.test(`${name}: ${args[0]}`, child => {
      const { root, path } = lightweightFixture(child, code);
      const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
      assert.equal(result.status, 1, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, diagnostic);
      assert.equal(existsSync(path), name !== '記録削除');
    });
  }
});

test('検証コマンドが未コミット変更を生成したらfinalizeせずマニフェストを保持する', t => {
  const { root, path } = cliFixture(t, "require('node:fs').writeFileSync('generated.txt', 'changed during verification')");
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.ok(existsSync(path));
  assert.match(result.stdout + result.stderr, /未コミット変更/);
});

test('verifyも検証中に生成された未コミット変更を拒否する', t => {
  const { root } = cliFixture(t, "require('node:fs').writeFileSync('generated.txt', 'changed during verification')");
  const result = spawnSync(process.execPath, ['scripts/verify.ts'], { cwd: root, encoding: 'utf8' });
  assert.notEqual(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout + result.stderr, /未コミット変更/);
});

test('検証中に一時マニフェストを削除・状態変更しても完了判定を迂回できない', async t => {
  for (const entry of ['scripts/verify.ts', 'scripts/workflow/finalize.ts']) {
    for (const change of ['delete', 'downgrade']) await t.test(`${entry}: ${change}`, child => {
      const code = change === 'delete'
        ? "require('node:fs').unlinkSync('.workflow/changes/sample.json')"
        : "const fs=require('node:fs');const p='.workflow/changes/sample.json';const m=JSON.parse(fs.readFileSync(p));m.state='review';fs.writeFileSync(p, JSON.stringify(m));";
      const { root } = cliFixture(child, code);
      const result = spawnSync(process.execPath, [entry, ...(entry.includes('finalize') ? ['sample'] : [])], { cwd: root, encoding: 'utf8' });
      assert.notEqual(result.status, 0, result.stdout + result.stderr);
      assert.match(result.stdout + result.stderr, /検証中.*マニフェスト/);
    });
  }
});

test('未追跡の承認記録だけ更新すればfinalizeでき、追跡ファイルは変えない', t => {
  const { root, path, git } = cliFixture(t, "console.log('fixture passed')");
  const before = git('rev-parse', 'HEAD');
  const result = spawnSync(process.execPath, ['scripts/workflow/finalize.ts', 'sample'], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.equal(existsSync(path), false);
  assert.equal(git('status', '--porcelain'), '');
  assert.equal(git('rev-parse', 'HEAD'), before);
});

test('Gitやnpm不足を単なる検証失敗と区別して導入先を案内する', async t => {
  for (const [entry, tool] of [['scripts/workflow/check-contract.ts', 'Git'], ['scripts/workflow/finalize.ts', 'npm']]) {
    await t.test(tool, child => {
      const { root } = cliFixture(child, "console.log('fixture')");
      const empty = mkdtempSync(join(tmpdir(), 'no-workflow-tools-'));
      child.after(() => rmSync(empty, { recursive: true, force: true }));
      const result = spawnSync(process.execPath, [entry, ...(tool === 'npm' ? ['sample'] : [])], {
        cwd: root, encoding: 'utf8', env: { ...process.env, PATH: empty },
      });
      assert.equal(result.status, 1);
      assert.match(result.stdout + result.stderr, new RegExp(tool + '.*README'));
    });
  }
});
