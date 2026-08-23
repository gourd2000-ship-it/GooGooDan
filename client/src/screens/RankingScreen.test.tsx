// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RankingScreen from './RankingScreen';
import { useStore } from '../store/useStore';

describe('RankingScreen', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({ currentScreen: 'ranking' });
    fetchMock.mockResolvedValue({
      json: async () => [{ student_name: '기록친구', table_number: 3, mode: 'random', score: 200, total_time_ms: 9000 }],
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests an isolated tap ranking when the tap hall-of-fame tab is selected', async () => {
    render(<RankingScreen />);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(await screen.findByText('섞어서')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '누르는 구구단' }));

    await waitFor(() => expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('practiceType=tap')));
    expect(screen.getByRole('button', { name: '누르는 구구단' })).toHaveAttribute('aria-pressed', 'true');
  });
});
