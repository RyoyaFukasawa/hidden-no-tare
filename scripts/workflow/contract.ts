import { checkConfigShape, checkManifestShape } from './schema.ts';
import { workflowStates, riskLevels } from './vocabulary.ts';
export { workflowStates, riskLevels } from './vocabulary.ts';

export const mandatoryHighRiskCategories = [
  'authentication-authorization', 'secrets-cryptography', 'payments-billing',
  'personal-confidential-data', 'irreversible-data-change', 'breaking-public-api',
  'security-boundary', 'production-infrastructure', 'legal-compliance',
  'completion-contract', 'supply-chain',
] as const;

export type WorkflowState = typeof workflowStates[number];
export type RiskLevel = typeof riskLevels[number];
export type CheckResult = { name: string; status: 'pending' | 'passed' | 'failed'; evidence?: string };
export type Review = {
  kind: 'agent' | 'human'; approver: string; reviewedAt: string; commit: string;
};
export type EmergencyException = {
  reason: string; createdAt: string; expiresAt: string; followUpTicket: string; approvedBy: string;
};
export type ChangeTraits = {
  behaviorChanged: boolean | null;
  publicApiChanged: boolean | null;
  architectureDecisionChanged: boolean | null;
  dataMigration: boolean | null;
  highRiskCategories: string[];
};
export type ArtifactMap = { ticket?: string; productSpec?: string; changeSpec?: string; adr?: string };

export interface WorkflowManifest {
  schemaVersion: 1;
  id: string;
  summary: string;
  state: WorkflowState;
  risk: RiskLevel | null;
  classificationConfirmed: boolean;
  traits: ChangeTraits;
  workflow?: { name: string; version: string; adapter: string; certified: boolean };
  artifacts: ArtifactMap;
  checks: CheckResult[];
  review?: Review;
  emergencyException?: EmergencyException;
}

export interface WorkflowConfig {
  schemaVersion: 1;
  exceptionDefaultDays: number;
  exceptionMaximumDays: number;
  additionalHighRiskCategories: string[];
  projectChecks: { name: string; command: string; args: string[] }[];
}

export function requiredArtifacts(traits: ChangeTraits): (keyof ArtifactMap)[] {
  const required: (keyof ArtifactMap)[] = ['ticket'];
  if (traits.behaviorChanged) required.push('productSpec', 'changeSpec');
  if (traits.architectureDecisionChanged) required.push('adr');
  return required;
}

export function checkConfig(value: unknown): string[] {
  const shapeErrors = checkConfigShape(value);
  if (shapeErrors.length) return shapeErrors;
  const config = value as WorkflowConfig;
  const errors: string[] = [];
  if (config.schemaVersion !== 1) errors.push('workflow設定のschemaVersionは1にしてください');
  if (!Number.isInteger(config.exceptionDefaultDays) || config.exceptionDefaultDays < 1) errors.push('緊急例外の既定日数は1以上の整数にしてください');
  if (!Number.isInteger(config.exceptionMaximumDays) || config.exceptionMaximumDays < config.exceptionDefaultDays) errors.push('緊急例外の最大日数は既定日数以上にしてください');
  if (config.exceptionMaximumDays > 30) errors.push('緊急例外の最大日数は30日以下にしてください');
  if (new Set(config.additionalHighRiskCategories).size !== config.additionalHighRiskCategories.length) errors.push('追加の高リスク分類が重複しています');
  for (const category of config.additionalHighRiskCategories) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) errors.push(`追加の高リスク分類が不正です: ${category}`);
    if ((mandatoryHighRiskCategories as readonly string[]).includes(category)) errors.push(`共通の高リスク分類を追加側へ重複記載しないでください: ${category}`);
  }
  const names = new Set<string>();
  for (const check of config.projectChecks) {
    if (!check.name.trim() || !check.command.trim()) errors.push('projectChecksにはnameとcommandが必要です');
    if (names.has(check.name)) errors.push(`projectChecksの名前が重複しています: ${check.name}`);
    names.add(check.name);
  }
  return errors;
}

function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function checkManifest(value: unknown, config: WorkflowConfig, now = new Date(), head?: string): string[] {
  const shapeErrors = [...checkManifestShape(value), ...checkConfig(config)];
  if (shapeErrors.length) return shapeErrors;
  const manifest = value as WorkflowManifest;
  const errors: string[] = [];
  if (manifest.schemaVersion !== 1) errors.push('manifestのschemaVersionは1にしてください');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id)) errors.push('変更IDは小文字英数字とハイフンで記載してください');
  if (!manifest.summary.trim()) errors.push('変更概要が必要です');
  if (!workflowStates.includes(manifest.state)) errors.push('不正な作業状態です');
  if (manifest.risk !== null && !riskLevels.includes(manifest.risk)) errors.push('不正なリスク分類です');
  if (manifest.workflow) {
    if (!manifest.workflow.name.trim() || !manifest.workflow.version.trim() || !manifest.workflow.adapter.trim()) errors.push('外部ワークフローの名前・固定バージョン・アダプターが必要です');
    if (typeof manifest.workflow.certified !== 'boolean') errors.push('workflow.certifiedはbooleanで指定してください');
  }
  const unknown = Object.entries(manifest.traits).filter(([key, value]) => key !== 'highRiskCategories' && value === null);
  if (unknown.length && !['unclassified', 'researching'].includes(manifest.state)) errors.push('未分類の変更特性があるためresearchingより先へ進めません');
  if (!['unclassified', 'researching'].includes(manifest.state) && (manifest.risk === null || !manifest.classificationConfirmed)) errors.push('researchingより先へ進むにはリスクと変更分類の確定が必要です');
  const categories: readonly string[] = [...mandatoryHighRiskCategories, ...config.additionalHighRiskCategories];
  for (const category of manifest.traits.highRiskCategories) if (!categories.includes(category)) errors.push(`未定義の高リスク分類です: ${category}`);
  if (manifest.traits.highRiskCategories.length && manifest.risk !== 'high') errors.push('高リスク分類がある変更はrisk: highが必要です');
  if (manifest.state === 'complete') {
    for (const key of requiredArtifacts(manifest.traits)) if (!manifest.artifacts[key]?.trim()) errors.push(`必要な成果物がありません: ${key}`);
    if (!manifest.checks.length) errors.push('完了には検証結果が1件以上必要です');
    for (const check of manifest.checks) {
      if (check.status !== 'passed') errors.push(`検証が成功していません: ${check.name}`);
      if (!check.evidence?.trim()) errors.push(`検証証跡がありません: ${check.name}`);
    }
    if (!manifest.review) errors.push('完了には意味的レビューが必要です');
    else {
      if (manifest.risk === 'high' && manifest.review.kind !== 'human') errors.push('高リスク変更には人間レビューが必要です');
      if (!manifest.review.approver.trim() || !validDate(manifest.review.reviewedAt)) errors.push('レビューには承認者とUTC日時が必要です');
      if (head && manifest.review.commit !== head) errors.push('承認後に差分が変わったためレビューが失効しています');
    }
  }
  const exception = manifest.emergencyException;
  if (exception) {
    if (!exception.reason.trim() || !exception.followUpTicket.trim() || !exception.approvedBy.trim()) errors.push('緊急例外には理由・後続チケット・承認者が必要です');
    if (!validDate(exception.createdAt)) errors.push('緊急例外の作成日時はUTC日時で記録してください');
    if (!validDate(exception.expiresAt)) errors.push('緊急例外の期限はUTC日時で記録してください');
    else if (Date.parse(exception.expiresAt) < now.getTime()) errors.push('緊急例外の解消期限を超過しています');
    const maximum = Date.parse(exception.createdAt) + config.exceptionMaximumDays * 86_400_000;
    if (validDate(exception.createdAt) && validDate(exception.expiresAt) && Date.parse(exception.expiresAt) <= Date.parse(exception.createdAt)) errors.push('緊急例外の期限は作成日時より後にしてください');
    if (validDate(exception.expiresAt) && Date.parse(exception.expiresAt) > maximum) errors.push(`緊急例外は${config.exceptionMaximumDays}日以内にしてください`);
  }
  return errors;
}
