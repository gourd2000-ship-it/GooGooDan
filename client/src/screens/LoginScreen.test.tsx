// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LoginScreen from './LoginScreen';
import { useStore } from '../store/useStore';

describe('LoginScreen', () => {
  beforeEach(() => {
    useStore.setState({ currentScreen: 'name', userName: '', student: null, sessionStatus: 'anonymous', hasVoiceConsent: false });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('submits a masked four-digit PIN with the selected grade and class', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ student: { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: '구구' } }),
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<LoginScreen />);

    expect(screen.getByText('도전! 구구단')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('학년'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('반'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('checkbox', { name: '말하는 구구단 음성 채점을 위한 AI서비스 전송을 동의합니다' }));

    for (const digit of ['1', '2', '3', '4']) fireEvent.click(screen.getByRole('button', { name: `${digit} 입력` }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/auth/student/login'), expect.objectContaining({ credentials: 'include' })));
    expect(useStore.getState().student?.studentName).toBe('구구');
    expect(useStore.getState().currentScreen).toBe('home');
    expect(screen.getByText('● ● ● ●')).toBeInTheDocument();
  });

  it('does not submit a PIN until voice-use consent is selected', () => {
    render(<LoginScreen />);

    for (const digit of ['1', '2', '3', '4']) fireEvent.click(screen.getByRole('button', { name: `${digit} 입력` }));
    expect(screen.getByText('음성 채점 서비스 이용 동의가 필요해요.')).toBeInTheDocument();
  });
});
