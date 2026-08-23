// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import LoginScreen from './LoginScreen';
import { useStore } from '../store/useStore';

describe('LoginScreen', () => {
  beforeEach(() => {
    useStore.setState({ currentScreen: 'name', userName: '', hasVoiceConsent: false });
  });

  it('requires AI voice-use consent before allowing the child to start', () => {
    render(<LoginScreen />);

    fireEvent.change(screen.getByPlaceholderText('이름 입력하기...'), { target: { value: '구구' } });
    expect(screen.getByRole('button', { name: '시작하기!' })).toBeDisabled();

    fireEvent.click(screen.getByRole('checkbox', { name: '말하는 구구단 음성 채점을 위한 AI서비스 전송을 동의합니다' }));
    expect(screen.getByRole('button', { name: '시작하기!' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: '시작하기!' }));
    expect(useStore.getState().hasVoiceConsent).toBe(true);
    expect(useStore.getState().userName).toBe('구구');
    expect(useStore.getState().currentScreen).toBe('home');
  });
});
