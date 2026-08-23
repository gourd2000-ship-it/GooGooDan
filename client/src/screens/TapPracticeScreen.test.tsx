// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TapPracticeScreen from './TapPracticeScreen';
import { useStore } from '../store/useStore';

describe('TapPracticeScreen', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useStore.getState().resetApp();
    useStore.setState({
      currentScreen: 'tapPractice',
      practiceType: 'tap',
      selectedTable: 2,
      tapQuestions: [
        {
          expression: '2 x 1',
          prompt: '2 x 1 = ?',
          correctChoice: '2',
          choices: ['2', '4', '6', '8'],
          kind: 'answer',
        },
        {
          expression: '2 x 2',
          prompt: '4 = ?',
          correctChoice: '2 x 2',
          choices: ['2 x 1', '2 x 2', '2 x 3', '2 x 4'],
          kind: 'expression',
        },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('locks an answer, shows feedback, then advances and creates a tap result', () => {
    render(<TapPracticeScreen />);

    fireEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByText('정답이에요!')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '4' })).toBeDisabled();

    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText('4 = ?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2 x 2' }));
    act(() => vi.advanceTimersByTime(800));

    expect(useStore.getState().currentScreen).toBe('result');
    expect(useStore.getState().tapEvaluationResult?.totalCorrect).toBe(2);
  });
});
