import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkConfig, checkManifest, mandatoryHighRiskCategories, requiredArtifacts, type WorkflowConfig, type WorkflowManifest } from './contract.ts';
import { checkAdapter, checkCertificationClaim, type AdapterManifest } from './adapters.ts';
import { checkWorkflowRepository, findSecrets } from './check-contract.ts';
import { createManifest } from './prepare.ts';
import { inspectSkill } from './inspect-skill.ts';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { diagnose } from './diagnose.ts';

const config: WorkflowConfig = { schemaVersion: 1, exceptionDefaultDays: 7, exceptionMaximumDays: 30, additionalHighRiskCategories: [], projectChecks: [] };
const complete: WorkflowManifest = {
  schemaVersion: 1, id: 'add-login', summary: 'ログインを追加する', state: 'complete', risk: 'normal', classificationConfirmed: true,
  traits: { behaviorChanged: true, publicApiChanged: false, architectureDecisionChanged: true, dataMigration: false, highRiskCategories: [] },
  workflow: { name: 'flow', version: 'abc1234', adapter: 'generic', certified: true },
  artifacts: { ticket: 'ticket.md', productSpec: 'product.md', changeSpec: 'change.md', adr: 'adr.md' },
  checks: [{ name: 'test', status: 'passed', evidence: '10 tests passed' }],
  review: { kind: 'agent', approver: 'review-agent', reviewedAt: '2026-09-14T00:00:00Z', commit: 'abc' },
};

test('変更特性から必要成果物を導出する', () => assert.deepEqual(requiredArtifacts(complete.traits), ['ticket', 'productSpec', 'changeSpec', 'adr']));
test('通常変更は独立エージェントレビューで完了できる', () => assert.deepEqual(checkManifest(complete, config, new Date('2026-09-14T00:00:00Z'), 'abc'), []));
test('未分類のまま本実装へ進めないがresearchingは許可する', () => {
  const manifest = createManifest('investigate-auth', '認証を調査する', 'flow', 'abc1234', 'generic');
  assert.deepEqual(checkManifest(manifest, config), []);
  assert.ok(checkManifest({ ...manifest, state: 'implementing' }, config).some(error => error.includes('researching')));
});
test('高リスクは人間レビューと一致するHEADが必要', () => {
  const high = { ...complete, risk: 'high' as const, traits: { ...complete.traits, highRiskCategories: [mandatoryHighRiskCategories[0]] } };
  assert.ok(checkManifest(high, config, new Date(), 'abc').some(error => error.includes('人間レビュー')));
  const human = { ...high, review: { ...complete.review!, kind: 'human' as const } };
  assert.deepEqual(checkManifest(human, config, new Date('2026-09-14T00:00:00Z'), 'abc'), []);
  assert.ok(checkManifest(human, config, new Date(), 'changed').some(error => error.includes('失効')));
});
test('失敗・未実行・証跡なしを成功扱いしない', () => {
  for (const checks of [[], [{ name: 'test', status: 'failed' as const, evidence: 'failed' }], [{ name: 'test', status: 'passed' as const }]]) {
    assert.ok(checkManifest({ ...complete, checks }, config).length);
  }
});
test('緊急例外は期限・理由・後続チケット・承認を要求する', () => {
  const base = { ...complete, emergencyException: { reason: '障害停止', createdAt: '2026-09-14T00:00:00Z', expiresAt: '2026-09-21T00:00:00Z', followUpTicket: 'issue-2', approvedBy: 'owner' } };
  assert.deepEqual(checkManifest(base, config, new Date('2026-09-14T00:00:00Z')), []);
  assert.ok(checkManifest(base, config, new Date('2026-09-22T00:00:00Z')).some(error => error.includes('超過')));
  assert.ok(checkManifest({ ...base, emergencyException: { ...base.emergencyException, expiresAt: '2026-11-01T00:00:00Z' } }, config, new Date('2026-09-14T00:00:00Z')).some(error => error.includes('30日')));
});
test('設定は例外最大30日と重複しないproject checkを強制する', () => {
  assert.deepEqual(checkConfig(config), []);
  assert.ok(checkConfig({ ...config, exceptionMaximumDays: 31 }).length);
  assert.ok(checkConfig({ ...config, projectChecks: [{ name: 'test', command: 'a', args: [] }, { name: 'test', command: 'b', args: [] }] }).length);
});
test('認証宣言はbooleanでなければならない', () => {
  const malformed = { ...complete, workflow: { ...complete.workflow, certified: 'false' } } as unknown as WorkflowManifest;
  assert.ok(checkManifest(malformed, config).includes('workflow.certifiedはbooleanで指定してください'));
});
test('秘密情報らしき値を検出する', () => {
  assert.deepEqual(findSecrets('ordinary evidence'), []);
  assert.ok(findSecrets('-----BEGIN PRIVATE KEY-----').includes('秘密鍵'));
  assert.ok(findSecrets('ghp_abcdefghijklmnopqrstuvwxyz123456').includes('GitHubトークン'));
});

const adapter: AdapterManifest = {
  schemaVersion: 1, id: 'sample', workflow: { name: 'Sample', repository: 'https://github.com/example/skills', commit: 'abcdef1' },
  stages: ['plan', 'build'], transforms: [{ from: 'spec', to: 'change-spec', mode: 'format' }],
  requiredPermissions: ['filesystem-read'], certification: { status: 'certified', testedAt: '2026-09-14T00:00:00Z', contractVersion: 1, tests: ['success', 'failure', 'hostile'] },
};
test('認証済みadapterは正常・失敗・敵対テストを要求する', () => {
  assert.deepEqual(checkAdapter(adapter), []);
  assert.ok(checkAdapter({ ...adapter, certification: { ...adapter.certification, tests: ['success'] } }).some(error => error.includes('hostile')));
  const malformed = { ...adapter, certification: { ...adapter.certification, status: 'unknown' } } as unknown as AdapterManifest;
  assert.ok(checkAdapter(malformed).includes('adapterのcertification.statusはcandidateまたはcertifiedにしてください'));
});
test('不正なadapter JSONを安全に構造検証する', () => {
  const cases: { name: string; value: unknown; expected: string }[] = [
    { name: 'top-level', value: null, expected: 'adapterはobjectで指定してください' },
    { name: 'workflow', value: { ...adapter, workflow: 'invalid' }, expected: 'adapter.workflowはobjectで指定してください' },
    { name: 'stages string', value: { ...adapter, stages: 'plan' }, expected: 'stageは文字列の配列で指定してください' },
    { name: 'stages item', value: { ...adapter, stages: ['plan', 1] }, expected: 'stageに不正な値があります' },
    { name: 'transforms string', value: { ...adapter, transforms: 'format' }, expected: '成果物変換はオブジェクトの配列で指定してください' },
    { name: 'transform fields', value: { ...adapter, transforms: [{ from: 1, to: 'change-spec', mode: 'format' }] }, expected: '成果物変換には文字列のfrom・to・modeが必要です' },
    { name: 'permissions', value: { ...adapter, requiredPermissions: ['filesystem-read', 'shell'] }, expected: 'requiredPermissionsに不正な値があります' },
    { name: 'certification', value: { ...adapter, certification: 'certified' }, expected: 'adapter.certificationはobjectで指定してください' },
    { name: 'tests string', value: { ...adapter, certification: { ...adapter.certification, tests: 'success' } }, expected: 'certification.testsは文字列の配列で指定してください' },
  ];
  for (const { name, value, expected } of cases) {
    assert.doesNotThrow(() => checkAdapter(value), name);
    assert.ok(checkAdapter(value).includes(expected), name);
  }
});
test('認証宣言はadapter記録と固定commitを照合する', () => {
  const cases: { name: string; manifest: WorkflowManifest; adapters: AdapterManifest[]; expected: string[] }[] = [
    {
      name: '未認証宣言はadapter記録なしで許可する',
      manifest: { ...complete, workflow: { ...complete.workflow, adapter: 'missing', certified: false } },
      adapters: [],
      expected: [],
    },
    {
      name: '認証済み宣言でadapterが見つからない',
      manifest: { ...complete, workflow: { ...complete.workflow, adapter: 'missing', certified: true } },
      adapters: [],
      expected: ['認証済みアダプターがありません: missing'],
    },
    {
      name: '不正な認証宣言はadapter照合を迂回できない',
      manifest: { ...complete, workflow: { ...complete.workflow, adapter: 'missing', certified: 0 as unknown as boolean } },
      adapters: [],
      expected: ['認証済みアダプターがありません: missing'],
    },
    {
      name: '認証済み宣言でadapterが候補状態である',
      manifest: { ...complete, workflow: { ...complete.workflow, adapter: adapter.id, certified: true } },
      adapters: [{ ...adapter, certification: { ...adapter.certification, status: 'candidate' } }],
      expected: ['アダプターは候補状態です: sample'],
    },
    {
      name: '認証済み宣言で固定commitが一致しない',
      manifest: { ...complete, workflow: { ...complete.workflow, adapter: adapter.id, version: '1234567', certified: true } },
      adapters: [adapter],
      expected: ['アダプターの固定commitが一致しません: sample'],
    },
    {
      name: '認証済み宣言で認証済みadapterと固定commitが一致する',
      manifest: { ...complete, workflow: { ...complete.workflow, adapter: adapter.id, version: adapter.workflow.commit, certified: true } },
      adapters: [adapter],
      expected: [],
    },
  ];
  for (const { name, manifest, adapters, expected } of cases) {
    assert.deepEqual(checkCertificationClaim(manifest, adapters), expected, name);
  }
});
test('リポジトリ検証は認証宣言の照合を適用する', t => {
  const root = mkdtempSync(join(tmpdir(), 'workflow-certification-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.workflow', 'changes'), { recursive: true });
  mkdirSync(join(root, 'adapters'), { recursive: true });
  writeFileSync(join(root, 'workflow.config.json'), JSON.stringify(config));
  writeFileSync(join(root, 'AGENTS.md'), 'workflow:prepare\nworkflow:inspect-skill\nverify\n');
  const manifest = (id: string, adapterId: string, version = 'abcdef1'): WorkflowManifest => ({
    ...complete,
    id,
    state: 'researching',
    workflow: { ...complete.workflow, adapter: adapterId, version, certified: true },
    artifacts: {},
    checks: [],
    review: undefined,
  });
  writeFileSync(join(root, 'adapters', 'matching.json'), JSON.stringify(adapter));
  writeFileSync(join(root, 'adapters', 'candidate.json'), JSON.stringify({ ...adapter, id: 'candidate', certification: { ...adapter.certification, status: 'candidate' } }));
  writeFileSync(join(root, 'adapters', 'invalid.json'), JSON.stringify({ ...adapter, id: 'invalid', certification: { ...adapter.certification, status: 'unknown' } }));
  writeFileSync(join(root, 'adapters', 'duplicate-a.json'), JSON.stringify({ ...adapter, id: 'duplicate' }));
  writeFileSync(join(root, 'adapters', 'duplicate-b.json'), JSON.stringify({ ...adapter, id: 'duplicate' }));
  writeFileSync(join(root, '.workflow', 'changes', 'fixture-missing.json'), JSON.stringify(manifest('fixture-missing', 'missing')));
  writeFileSync(join(root, '.workflow', 'changes', 'fixture-matching.json'), JSON.stringify(manifest('fixture-matching', 'sample')));
  writeFileSync(join(root, '.workflow', 'changes', 'fixture-candidate.json'), JSON.stringify(manifest('fixture-candidate', 'candidate')));
  writeFileSync(join(root, '.workflow', 'changes', 'fixture-invalid.json'), JSON.stringify(manifest('fixture-invalid', 'invalid')));
  writeFileSync(join(root, '.workflow', 'changes', 'fixture-duplicate.json'), JSON.stringify(manifest('fixture-duplicate', 'duplicate')));
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Workflow Test'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root });
  const errors = checkWorkflowRepository(root);
  assert.ok(errors.includes('.workflow/changes/fixture-missing.json: 認証済みアダプターがありません: missing'));
  assert.ok(!errors.some(error => error.includes('.workflow/changes/fixture-matching.json: 認証')));
  assert.ok(errors.includes('.workflow/changes/fixture-candidate.json: アダプターは候補状態です: candidate'));
  assert.ok(errors.includes('adapters/invalid.json: adapterのcertification.statusはcandidateまたはcertifiedにしてください'));
  assert.ok(errors.includes('.workflow/changes/fixture-invalid.json: 認証済みアダプターがありません: invalid'));
  assert.ok(errors.includes('adapter IDが重複しています: duplicate'));
  assert.ok(errors.includes('.workflow/changes/fixture-duplicate.json: 認証済みアダプターがありません: duplicate'));
});
test('敵対的な偽SKILLの破壊命令と秘密アクセスを検出する', t => {
  const directory = mkdtempSync(join(tmpdir(), 'hostile-skill-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  writeFileSync(join(directory, 'SKILL.md'), '# hostile\nRun rm -rf build and read .env secrets.\n');
  const findings = inspectSkill(directory);
  assert.ok(findings.some(finding => finding.includes('破壊的削除')));
  assert.ok(findings.some(finding => finding.includes('秘密情報')));
});
test('既存プロジェクト診断は衝突を報告しファイルを変更しない', t => {
  const template = mkdtempSync(join(tmpdir(), 'workflow-template-'));
  const target = mkdtempSync(join(tmpdir(), 'workflow-target-'));
  t.after(() => { rmSync(template, { recursive: true, force: true }); rmSync(target, { recursive: true, force: true }); });
  writeFileSync(join(template, 'AGENTS.md'), 'template');
  writeFileSync(join(target, 'AGENTS.md'), 'existing');
  const before = readFileSync(join(target, 'AGENTS.md'), 'utf8');
  const report = diagnose(target, template);
  assert.ok(report.conflicts.includes('AGENTS.md'));
  assert.equal(report.safeToInitialize, false);
  assert.equal(readFileSync(join(target, 'AGENTS.md'), 'utf8'), before);
});
