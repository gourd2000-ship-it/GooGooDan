import type { PracticeOrder, TapGameMode } from './practice';

export interface TapRecordPayload {
  table: number;
  mode: PracticeOrder;
  gameMode: TapGameMode;
  userName: string;
  totalCorrect: number;
  totalTime: number;
}

type Fetcher = (input: string, init: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

function getErrorMessage(body: unknown): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') return body.error;
  return '기록을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

export async function saveTapRecord(apiUrl: string, payload: TapRecordPayload, fetcher: Fetcher = fetch): Promise<void> {
  const response = await fetcher(`${apiUrl}/api/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(getErrorMessage(body));
}
