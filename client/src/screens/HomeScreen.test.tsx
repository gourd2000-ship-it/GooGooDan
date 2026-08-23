// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import HomeScreen from './HomeScreen';
import { useStore } from '../store/useStore';

describe('HomeScreen', () => {
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
    fireEvent.click(screen.getByRole('button', { name: '시작하기!' }));

    expect(useStore.getState().tapGameMode).toBe('expression');
    expect(useStore.getState().selectedTable).toBe(3);
    expect(useStore.getState().currentScreen).toBe('tapPractice');
    expect(useStore.getState().tapQuestions).toHaveLength(10);
  });
});
