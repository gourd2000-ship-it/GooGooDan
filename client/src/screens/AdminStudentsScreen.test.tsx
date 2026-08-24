// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminStudentsScreen from './AdminStudentsScreen';

describe('AdminStudentsScreen', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('lists school students and creates a student through the administrator API', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ students: [{ id: 'student-a', grade: 3, classNumber: 2, studentName: 'Kim', isActive: true }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ student: { id: 'student-b', grade: 4, classNumber: 1, studentName: 'Lee', isActive: true } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ students: [{ id: 'student-a', grade: 3, classNumber: 2, studentName: 'Kim', isActive: true }, { id: 'student-b', grade: 4, classNumber: 1, studentName: 'Lee', isActive: true }] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminStudentsScreen idToken="google-id-token" onDashboard={() => {}} onSignOut={() => {}} />);

    expect(await screen.findByText('Kim')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('학생 이름'), { target: { value: 'Lee' } });
    fireEvent.click(screen.getByRole('button', { name: '학생 등록' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/admin/students'), expect.objectContaining({ method: 'POST' })));
    expect(await screen.findByText('Lee')).toBeInTheDocument();
  });

  it('shows the CSV row number before an invalid import request is sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ students: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminStudentsScreen idToken="google-id-token" onDashboard={() => {}} onSignOut={() => {}} />);
    await screen.findByText('등록된 학생이 없습니다.');

    fireEvent.change(screen.getByLabelText('CSV 학생 목록'), { target: { value: 'grade,classNumber,studentName,accessCode\n3,2,,1234' } });
    fireEvent.click(screen.getByRole('button', { name: 'CSV 일괄 등록' }));

    expect(screen.getByText('2행의 학생 이름을 입력해 주세요.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('shows the signed-in Google subject after administrator access is denied', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: 'Administrator access required' }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<AdminStudentsScreen idToken="google-id-token" googleSubject="123456789012345678901" onDashboard={() => {}} onSignOut={() => {}} />);

    expect(await screen.findByLabelText('관리자 등록용 Google sub')).toHaveValue('123456789012345678901');
  });
});
