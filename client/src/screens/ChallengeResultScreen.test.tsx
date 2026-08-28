// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ChallengeResultScreen from './ChallengeResultScreen';
import { useStore } from '../store/useStore';

describe('ChallengeResultScreen', () => {
  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({
      currentScreen: 'challengeResult',
      challengeMode: 'answer-tap',
      challengeQuestions: [
        { left: 3, right: 4, expression: '3 x 4', answer: 12 },
        { left: 2, right: 6, expression: '2 x 6', answer: 12 },
      ],
      challengeEvaluationResult: {
        totalCorrect: 1,
        feedback: '결과를 확인해요.',
        results: [
          { question: '3 x 4', expected: '12', selected: '12', isCorrect: true },
          { question: '2 x 6', expected: '12', selected: '11', isCorrect: false },
        ],
      },
    });
  });

  afterEach(() => document.body.replaceChildren());

  it('shows a star grade and retries only incorrect questions with the same mode', () => {
    render(<ChallengeResultScreen />);

    expect(screen.getByText('★☆☆☆☆')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '틀린 문제 다시 풀기' }));

    expect(useStore.getState().challengeMode).toBe('answer-tap');
    expect(useStore.getState().challengeQuestions).toEqual([{ left: 2, right: 6, expression: '2 x 6', answer: 12 }]);
    expect(useStore.getState().currentScreen).toBe('challengeTap');
  });
});
