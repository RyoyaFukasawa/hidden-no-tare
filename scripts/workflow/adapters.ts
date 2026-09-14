export interface AdapterManifest {
  schemaVersion: 1;
  id: string;
  workflow: { name: string; repository: string; commit: string };
  stages: string[];
  transforms: { from: string; to: string; mode: 'path' | 'format' | 'lifecycle' }[];
  requiredPermissions: ('filesystem-read' | 'filesystem-write' | 'network-read' | 'external-write')[];
  certification: { status: 'candidate' | 'certified'; testedAt?: string; contractVersion: number; tests: string[] };
}

export function checkAdapter(adapter: AdapterManifest): string[] {
  const errors: string[] = [];
  if (adapter.schemaVersion !== 1) errors.push('adapterのschemaVersionは1にしてください');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(adapter.id)) errors.push('adapter IDが不正です');
  if (!adapter.workflow.name || !/^https:\/\/github\.com\//.test(adapter.workflow.repository)) errors.push('外部workflowの名前とGitHub出所が必要です');
  if (!/^[0-9a-f]{7,40}$/.test(adapter.workflow.commit)) errors.push('外部workflowはcommitで固定してください');
  if (!adapter.stages.length) errors.push('stageが必要です');
  if (new Set(adapter.stages).size !== adapter.stages.length) errors.push('stageが重複しています');
  if (!adapter.transforms.length) errors.push('成果物変換の宣言が必要です');
  if (adapter.certification.status === 'certified') {
    const requiredTests = ['success', 'failure', 'hostile'];
    for (const test of requiredTests) if (!adapter.certification.tests.includes(test)) errors.push(`認証テストがありません: ${test}`);
    if (!adapter.certification.testedAt || Number.isNaN(Date.parse(adapter.certification.testedAt))) errors.push('認証日時が必要です');
  }
  if (adapter.certification.contractVersion !== 1) errors.push('未対応のcontractVersionです');
  return errors;
}
