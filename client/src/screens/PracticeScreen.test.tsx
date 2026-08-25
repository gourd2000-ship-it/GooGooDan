// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeScreen from './PracticeScreen';
import { useStore } from '../store/useStore';

let stopTrack: ReturnType<typeof vi.fn>;
let fetchMock: ReturnType<typeof vi.fn>;

class FakeMediaRecorder {
  static current: FakeMediaRecorder | undefined;
  static nextMimeType = 'audio/webm';
  state: RecordingState = 'inactive';
  mimeType = FakeMediaRecorder.nextMimeType;
  options: MediaRecorderOptions | undefined;
  ondataavailable: ((event: BlobEvent) => void) | null = null;
  onstop: ((event: Event) => void) | null = null;
  stream: MediaStream;

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.options = options;
    FakeMediaRecorder.current = this;
  }

  static isTypeSupported = vi.fn((mimeType: string) => mimeType === 'audio/webm;codecs=opus');

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
    FakeMediaRecorder.nextMimeType = 'audio/webm';
    FakeMediaRecorder.isTypeSupported.mockClear();
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
    cleanup();
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

  it('uses a supported Opus WebM recording format when the device provides it', async () => {
    render(<PracticeScreen />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button')[0]);
    });

    expect(FakeMediaRecorder.current?.options).toEqual({ mimeType: 'audio/webm;codecs=opus' });
  });

  it('uploads an audio filename that matches the recorder MIME type', async () => {
    FakeMediaRecorder.nextMimeType = 'audio/mp4';
    render(<PracticeScreen />);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button')[0]);
    });
    fireEvent.click(screen.getByRole('button', { name: /다 말했어요/ }));

    await act(async () => {});
    expect(fetchMock).toHaveBeenCalledOnce();
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    const audioFile = (request.body as FormData).get('audio') as File;
    expect(audioFile.name).toBe('recording.m4a');
  });
});
