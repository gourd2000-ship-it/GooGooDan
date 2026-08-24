import { describe, expect, it, vi } from 'vitest';
import { saveTapRecord } from './tapRecord';

describe('saveTapRecord', () => {
  it('sends the completed tap mode record to the record endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ saved: true, score: 60 }) });

    await saveTapRecord('https://api.example.com', {
      table: 3,
      mode: 'sequential',
      gameMode: 'answer',
      userName: '학생',
      totalCorrect: 6,
      totalTime: 8000,
    }, fetcher);

    expect(fetcher).toHaveBeenCalledWith('https://api.example.com/api/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        table: 3,
        mode: 'sequential',
        gameMode: 'answer',
        userName: '학생',
        totalCorrect: 6,
        totalTime: 8000,
      }),
    });
  });

  it('returns the server error so the result screen can offer a retry', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: '저장 실패' }) });

    await expect(saveTapRecord('https://api.example.com', {
      table: 3, mode: 'sequential', gameMode: 'answer', userName: '학생', totalCorrect: 6, totalTime: 8000,
    }, fetcher)).rejects.toThrow('저장 실패');
  });
});
