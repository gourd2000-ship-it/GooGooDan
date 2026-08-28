import type { ChallengeMode, ChallengeQuestionCount } from './practice';

export interface ChallengeRecordPayload {
  questionCount: ChallengeQuestionCount;
  challengeMode: ChallengeMode;
  totalCorrect: number;
  totalTime: number;
  starCount: number;
}

export async function saveChallengeRecord(
  apiUrl: string,
  record: ChallengeRecordPayload,
  request: typeof fetch = fetch,
): Promise<void> {
  const response = await request(`${apiUrl}/api/challenge/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(record),
  });
  if (!response.ok) throw new Error('Failed to save challenge record');
}
