// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RankingScreen from './RankingScreen';
import { useStore } from '../store/useStore';

describe('challenge ranking tab', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({ currentScreen: 'ranking' });
    fetchMock.mockResolvedValue({ ok: true, json: async () => [] });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('loads the independently grouped 20-question answer-tap challenge ranking', async () => {
    render(<RankingScreen />);

    fireEvent.click(screen.getByRole('button', { name: '챌린지 랭킹' }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/challenge/ranking?questionCount=20&challengeMode=answer-tap')));
    expect(screen.getByRole('button', { name: '챌린지 랭킹' })).toHaveAttribute('aria-pressed', 'true');
  });
});
