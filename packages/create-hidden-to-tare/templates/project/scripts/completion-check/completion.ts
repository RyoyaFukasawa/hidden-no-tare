/** Project-owned completion contract. No skill, Markdown, filesystem or CLI dependency. */
export const ticketStatuses = ['ready-for-agent', 'in-progress', 'done'] as const;

export interface CompletionRecord {
  status: string;
  criteriaCount: number;
  uncheckedCriteria: readonly string[];
  hasVerificationResults: boolean;
  archived: boolean;
}

export function checkCompletion(record: CompletionRecord): string[] {
  const errors: string[] = [];
  if (!ticketStatuses.some(status => status === record.status)) {
    errors.push(`statusは${ticketStatuses.join(' / ')}にしてください`);
  }
  if (record.criteriaCount < 1) errors.push('受け入れ条件を1件以上記入してください');
  if (record.archived && record.status !== 'done') {
    errors.push('アーカイブ内のチケットはstatus: doneが必要です');
  }
  if (record.status === 'done') {
    for (const criterion of record.uncheckedCriteria) {
      errors.push('完了チケットに未チェックの受け入れ条件があります: ' + criterion);
    }
    if (!record.hasVerificationResults) errors.push('完了チケットには具体的な検証結果が必要です');
  }
  return errors;
}
