// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { useStore } from './store/useStore';

const originalRestoreSession = useStore.getState().restoreSession;

describe('App loading screen', () => {
  beforeEach(() => {
    useStore.setState({
      currentScreen: 'loading',
      sessionStatus: 'authenticated',
      timeLimitReached: true,
      restoreSession: vi.fn().mockResolvedValue(undefined),
    });
  });

  afterEach(() => {
    useStore.setState({ restoreSession: originalRestoreSession, timeLimitReached: false });
  });

  it('tells the student when grading follows a time-limit stop', () => {
    render(<App />);

    expect(screen.getByText('1분이 넘었어요. 아쉬워요!')).toBeInTheDocument();
  });
});
