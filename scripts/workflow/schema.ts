import { workflowStates, riskLevels } from './vocabulary.ts';

type Rule = (value: unknown, path: string) => string[];
const scalar = (type: 'string' | 'boolean' | 'number'): Rule => (value, path) =>
  typeof value === type ? [] : [`${path}は${type}で指定してください`];
const string = scalar('string');
const boolean = scalar('boolean');
const number = scalar('number');
const optional = (rule: Rule): Rule => (value, path) => value === undefined ? [] : rule(value, path);
const nullable = (rule: Rule): Rule => (value, path) => value === null ? [] : rule(value, path);
const oneOf = (values: readonly unknown[]): Rule => (value, path) =>
  values.includes(value) ? [] : [`${path}の値が不正です`];
const array = (rule: Rule): Rule => (value, path) => Array.isArray(value)
  ? value.flatMap((item, index) => rule(item, `${path}[${index}]`)) : [`${path}は配列で指定してください`];
const object = (fields: Record<string, Rule>): Rule => (value, path) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return [`${path}はobjectで指定してください`];
  const record = value as Record<string, unknown>;
  return [
    ...Object.keys(record).filter(key => !Object.hasOwn(fields, key)).map(key => `${path}.${key}は未対応の項目です`),
    ...Object.entries(fields).flatMap(([key, rule]) => rule(record[key], `${path}.${key}`)),
  ];
};

const config = object({
  schemaVersion: oneOf([1]), exceptionDefaultDays: number, exceptionMaximumDays: number,
  additionalHighRiskCategories: array(string),
  projectChecks: array(object({ name: string, command: string, args: array(string) })),
});
const manifest = object({
  schemaVersion: oneOf([1]), id: string, summary: string,
  state: oneOf(workflowStates),
  risk: nullable(oneOf(riskLevels)), classificationConfirmed: boolean,
  traits: object({
    behaviorChanged: nullable(boolean), publicApiChanged: nullable(boolean),
    architectureDecisionChanged: nullable(boolean), dataMigration: nullable(boolean),
    highRiskCategories: array(string),
  }),
  workflow: optional(object({ name: string, version: string, adapter: string, certified: boolean })),
  artifacts: object({ ticket: optional(string), productSpec: optional(string), changeSpec: optional(string), adr: optional(string) }),
  checks: array(object({ name: string, status: oneOf(['pending', 'passed', 'failed']), evidence: optional(string) })),
  review: optional(object({ kind: oneOf(['agent', 'human']), approver: string, reviewedAt: string, commit: string })),
  emergencyException: optional(object({ reason: string, createdAt: string, expiresAt: string, followUpTicket: string, approvedBy: string })),
});

export const checkConfigShape = (value: unknown): string[] => config(value, 'workflow設定');
export const checkManifestShape = (value: unknown): string[] => manifest(value, 'manifest');
