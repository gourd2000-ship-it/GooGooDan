// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeScreen from './PracticeScreen';
import { useStore } from '../store/useStore';

class FakeMediaRecorder {
  state: RecordingState = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
  }

  start() {
    this.state = 'recording';
  }

  stop = vi.fn(() => {
    this.state = 'inactive';
    this.ondataavailable?.({ data: new Blob(['answer']) } as BlobEvent);
    this.onstop?.(new Event('stop'));
  });
}

describe('PracticeScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.getState().resetApp();
    useStore.setState({
      currentScreen: 'practice',
      userName: '구구',
      selectedTable: 2,
      expectedQuestions: ['2 x 1'],
      mode: 'sequential',
    });
    vi.stubGlobal('MediaRecorder', FakeMediaRecorder);
    vi.stubGlobal('navigator', {
      mediaDevices: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ results: [], totalCorrect: 0, feedback: '채점 완료' }),
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('automatically stops recording and moves to grading after one minute', async () => {
    render(<PracticeScreen />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button')[0]);
    });

    act(() => vi.advanceTimersByTime(60_000));

    expect(useStore.getState().currentScreen).toBe('loading');
  });
});
