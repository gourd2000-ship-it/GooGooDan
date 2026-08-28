// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ChallengeTapScreen from './ChallengeTapScreen';
import { useStore } from '../store/useStore';

describe('ChallengeTapScreen', () => {
  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({
      currentScreen: 'challengeTap',
      challengeMode: 'answer-tap',
      challengeQuestionCount: 20,
      challengeQuestions: [{ left: 3, right: 4, expression: '3 x 4', answer: 12 }],
    });
  });

  afterEach(() => document.body.replaceChildren());

  it('keeps the chosen tap mode and sends a completed attempt to the challenge result screen', () => {
    render(<ChallengeTapScreen />);

    expect(screen.getByText('1 / 1 문제')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '12' }));

    expect(useStore.getState().challengeMode).toBe('answer-tap');
    expect(useStore.getState().currentScreen).toBe('challengeResult');
    expect(useStore.getState().challengeEvaluationResult).toMatchObject({ totalCorrect: 1 });
  });
});
