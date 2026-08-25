// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeScreen from './PracticeScreen';
import { useStore } from '../store/useStore';

let stopTrack: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

class FakeMediaRecorder {
  static current: FakeMediaRecorder | undefined;
  state: RecordingState = 'inactive';
  mimeType = 'audio/webm';
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  stream: MediaStream;

  constructor(stream: MediaStream) {
    this.stream = stream;
    FakeMediaRecorder.current = this;
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
    FakeMediaRecorder.current = undefined;
    stopTrack = vi.fn();
    fetchMock = vi.fn(() => new Promise(() => {}));
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
          getTracks: () => [{ stop: stopTrack }],
        }),
      },
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('stops the microphone and submits a 60-second recording for grading automatically', async () => {
    render(<PracticeScreen />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button')[0]);
    });

    act(() => vi.advanceTimersByTime(60_000));

    expect(useStore.getState().currentScreen).toBe('loading');
    expect(FakeMediaRecorder.current?.state).toBe('inactive');
    expect(stopTrack).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect((request.body as FormData).get('totalTime')).toBe('60000');
  });
});
