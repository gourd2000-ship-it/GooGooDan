// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import HomeScreen from './HomeScreen';
import { useStore } from '../store/useStore';

describe('HomeScreen', () => {
  afterEach(cleanup);

  beforeEach(() => {
    useStore.getState().resetApp();
    useStore.setState({ currentScreen: 'home', userName: '테스트' });
  });

  it('activates only the selected tap card and starts the selected tap game mode', () => {
    render(<HomeScreen />);

    fireEvent.click(screen.getByRole('button', { name: '누르는 구구단 선택' }));
    expect(useStore.getState().practiceType).toBe('tap');
    expect(screen.getByRole('button', { name: '말하는 구구단 3단' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '누르는 구구단 3단' }));
    fireEvent.click(screen.getByRole('button', { name: '식 고르기' }));
    fireEvent.click(screen.getAllByRole('button', { name: '시작하기' })[1]);

    expect(useStore.getState().tapGameMode).toBe('expression');
    expect(useStore.getState().selectedTable).toBe(3);
    expect(useStore.getState().currentScreen).toBe('tapPractice');
    expect(useStore.getState().tapQuestions).toHaveLength(10);
  });

  it('starts challenge setup only after selecting one of the four fixed challenge modes', () => {
    render(<HomeScreen />);

    const challengeButton = screen.getByRole('button', { name: '도전하기' });
    expect(challengeButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '답 누르기' }));
    fireEvent.click(challengeButton);

    expect(useStore.getState().challengeMode).toBe('answer-tap');
    expect(useStore.getState().currentScreen).toBe('challengeSetup');
  });

  it('places the challenge below the two side-by-side core practice cards on desktop', () => {
    render(<HomeScreen />);

    expect(screen.getByTestId('home-practice-layout')).toHaveClass('md:grid-cols-2');
    expect(screen.getByTestId('challenge-card')).toHaveClass('md:col-span-2');
  });

  it('keeps a consistent gap above the challenge start button', () => {
    render(<HomeScreen />);

    expect(screen.getByRole('button', { name: '도전하기' })).toHaveClass('mt-6');
  });

  it('places a start button directly below each core practice card', () => {
    render(<HomeScreen />);

    const startButtons = screen.getAllByRole('button', { name: '시작하기' });
    expect(startButtons).toHaveLength(2);

    fireEvent.click(startButtons[1]);
    expect(useStore.getState().currentScreen).toBe('tapPractice');
  });

  it('shows all four compact challenge mode buttons in one row', () => {
    render(<HomeScreen />);

    const modes = screen.getByLabelText('챌린지 방식 선택');
    expect(modes).toHaveClass('grid-cols-4');
    expect(screen.getByRole('button', { name: '답 말하기' })).toHaveClass('px-2', 'py-2', 'text-sm');
  });
});
