// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ChallengeSetupScreen from './ChallengeSetupScreen';
import { useStore } from '../store/useStore';

describe('ChallengeSetupScreen', () => {
  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({ currentScreen: 'challengeSetup', challengeMode: 'answer-tap' });
  });

  afterEach(() => document.body.replaceChildren());

  it('starts the selected number of questions with the already selected fixed mode', () => {
    render(<ChallengeSetupScreen />);

    fireEvent.click(screen.getByRole('button', { name: '30개' }));
    fireEvent.click(screen.getByRole('button', { name: '챌린지 시작' }));

    expect(useStore.getState().challengeQuestionCount).toBe(30);
    expect(useStore.getState().challengeQuestions).toHaveLength(30);
    expect(useStore.getState().challengeMode).toBe('answer-tap');
    expect(useStore.getState().currentScreen).toBe('challengeTap');
  });
});
