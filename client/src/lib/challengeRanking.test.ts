import { describe, expect, it, vi } from 'vitest';
import { saveChallengeRecord } from './challengeRanking';

describe('saveChallengeRecord', () => {
  it('sends the selected question count and challenge mode with the completed record', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });

    await saveChallengeRecord('http://localhost:5000', {
      questionCount: 25,
      challengeMode: 'expression-tap',
      totalCorrect: 22,
      totalTime: 12_300,
      starCount: 4,
    }, fetchMock);

    expect(fetchMock).toHaveBeenCalledWith('http://localhost:5000/api/challenge/record', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        questionCount: 25,
        challengeMode: 'expression-tap',
        totalCorrect: 22,
        totalTime: 12_300,
        starCount: 4,
      }),
    });
  });
});
