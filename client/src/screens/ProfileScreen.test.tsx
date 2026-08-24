// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfileScreen from './ProfileScreen';
import { useStore } from '../store/useStore';

describe('ProfileScreen', () => {
  beforeEach(() => {
    useStore.setState({
      currentScreen: 'profile', sessionStatus: 'authenticated', userName: '구구',
      student: { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: '구구' },
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('changes the access code and logs the student out', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    render(<ProfileScreen />);

    fireEvent.change(screen.getByLabelText('현재 접속번호'), { target: { value: '1234' } });
    fireEvent.change(screen.getByLabelText('새 접속번호'), { target: { value: '4321' } });
    fireEvent.click(screen.getByRole('button', { name: '접속번호 변경' }));
    await waitFor(() => expect(screen.getByText('접속번호를 변경했어요.')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(useStore.getState().currentScreen).toBe('name'));
    expect(fetchMock).toHaveBeenLastCalledWith(expect.stringContaining('/api/auth/logout'), expect.objectContaining({ method: 'POST' }));
  });
});
