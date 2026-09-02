// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ChallengeSpeechScreen from './ChallengeSpeechScreen';
import { useStore } from '../store/useStore';

describe('ChallengeSpeechScreen', () => {
  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({
      currentScreen: 'challengeSpeech',
      challengeMode: 'answer-speech',
      challengeQuestionCount: 20,
      challengeQuestions: [
        { left: 3, right: 4, expression: '3 x 4', answer: 12 },
        { left: 5, right: 6, expression: '5 x 6', answer: 30 },
      ],
    });
  });

  afterEach(() => document.body.replaceChildren());

  it('shows answer-speaking prompts without question numbers', () => {
    render(<ChallengeSpeechScreen />);

    const firstQuestion = screen.getByText('3 x 4 = ?', { exact: true });
    const startButton = screen.getByRole('button', { name: '말하기 시작' });

    expect(firstQuestion).toBeInTheDocument();
    expect(screen.getByText('5 x 6 = ?', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText(/^1\.\s/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^2\.\s/)).not.toBeInTheDocument();
    expect(startButton.compareDocumentPosition(firstQuestion) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
