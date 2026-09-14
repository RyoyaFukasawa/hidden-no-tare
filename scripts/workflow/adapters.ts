import type { WorkflowManifest } from './contract.ts';

export interface AdapterManifest {
  schemaVersion: 1;
  id: string;
  workflow: { name: string; repository: string; commit: string };
  stages: string[];
  transforms: { from: string; to: string; mode: 'path' | 'format' | 'lifecycle' }[];
  requiredPermissions: ('filesystem-read' | 'filesystem-write' | 'network-read' | 'external-write')[];
  certification: { status: 'candidate' | 'certified'; testedAt?: string; contractVersion: number; tests: string[] };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function checkCertificationClaim(manifest: WorkflowManifest, adapters: AdapterManifest[]): string[] {
  if (!manifest.workflow || manifest.workflow.certified === false) return [];
  const workflow = manifest.workflow;
  const adapter = adapters.find(candidate => candidate.id === workflow.adapter);
  if (!adapter) return [`認証済みアダプターがありません: ${manifest.workflow.adapter}`];
  if (adapter.certification.status !== 'certified') return [`アダプターは候補状態です: ${adapter.id}`];
  if (adapter.workflow.commit !== manifest.workflow.version) return [`アダプターの固定commitが一致しません: ${adapter.id}`];
  return [];
}

export function checkAdapter(adapter: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(adapter)) return ['adapterはobjectで指定してください'];
  if (adapter.schemaVersion !== 1) errors.push('adapterのschemaVersionは1にしてください');
  if (typeof adapter.id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adapter.id)) errors.push('adapter IDが不正です');
  if (!isRecord(adapter.workflow)) errors.push('adapter.workflowはobjectで指定してください');
  else {
    if (typeof adapter.workflow.name !== 'string' || !adapter.workflow.name.trim()) errors.push('外部workflowの名前が必要です');
    if (typeof adapter.workflow.repository !== 'string' || !/^https:\/\/github\.com\//.test(adapter.workflow.repository)) errors.push('外部workflowのGitHub出所が必要です');
    if (typeof adapter.workflow.commit !== 'string' || !/^[0-9a-f]{7,40}$/.test(adapter.workflow.commit)) errors.push('外部workflowはcommitで固定してください');
  }
  if (!Array.isArray(adapter.stages)) errors.push('stageは文字列の配列で指定してください');
  else {
    if (!adapter.stages.length) errors.push('stageが必要です');
    if (!adapter.stages.every(stage => typeof stage === 'string' && stage.trim())) errors.push('stageに不正な値があります');
    else if (new Set(adapter.stages).size !== adapter.stages.length) errors.push('stageが重複しています');
  }
  if (!Array.isArray(adapter.transforms)) errors.push('成果物変換はオブジェクトの配列で指定してください');
  else {
    if (!adapter.transforms.length) errors.push('成果物変換の宣言が必要です');
    for (const transform of adapter.transforms) {
      if (!isRecord(transform) || typeof transform.from !== 'string' || !transform.from.trim() || typeof transform.to !== 'string' || !transform.to.trim() || typeof transform.mode !== 'string') errors.push('成果物変換には文字列のfrom・to・modeが必要です');
      else if (!['path', 'format', 'lifecycle'].includes(transform.mode)) errors.push('成果物変換のmodeが不正です');
    }
  }
  const permissions = ['filesystem-read', 'filesystem-write', 'network-read', 'external-write'];
  if (!Array.isArray(adapter.requiredPermissions)) errors.push('requiredPermissionsは配列で指定してください');
  else if (!adapter.requiredPermissions.every(permission => typeof permission === 'string' && permissions.includes(permission))) errors.push('requiredPermissionsに不正な値があります');
  if (!isRecord(adapter.certification)) errors.push('adapter.certificationはobjectで指定してください');
  else {
    const { certification } = adapter;
    if (!['candidate', 'certified'].includes(certification.status as string)) errors.push('adapterのcertification.statusはcandidateまたはcertifiedにしてください');
    if (certification.contractVersion !== 1) errors.push('未対応のcontractVersionです');
    if (!Array.isArray(certification.tests) || !certification.tests.every(test => typeof test === 'string' && test.trim())) errors.push('certification.testsは文字列の配列で指定してください');
    if (certification.status === 'certified') {
    const requiredTests = ['success', 'failure', 'hostile'];
      if (Array.isArray(certification.tests)) for (const test of requiredTests) if (!certification.tests.includes(test)) errors.push(`認証テストがありません: ${test}`);
      if (typeof certification.testedAt !== 'string' || Number.isNaN(Date.parse(certification.testedAt))) errors.push('認証日時が必要です');
    }
  }
  return errors;
}
