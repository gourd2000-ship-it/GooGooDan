import { describe, expect, it, vi } from 'vitest';
import { changeStudentAccessCode, loginStudent, logoutStudent, restoreStudentSession } from './auth';

describe('student auth API', () => {
  it('restores a valid student session with credentials included', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ student: { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim' } }),
    });

    await expect(restoreStudentSession('https://api.example', fetcher)).resolves.toEqual({ id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim' });
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/auth/session', { credentials: 'include' });
  });

  it('rejects malformed session responses and logs out with credentials included', async () => {
    const malformed = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ student: { id: 1 } }) });
    await expect(restoreStudentSession('https://api.example', malformed)).rejects.toThrow('Invalid student session');

    const logout = vi.fn().mockResolvedValue({ ok: true });
    await expect(logoutStudent('https://api.example', logout)).resolves.toBeUndefined();
    expect(logout).toHaveBeenCalledWith('https://api.example/api/auth/logout', { method: 'POST', credentials: 'include' });
  });

  it('logs in with the selected class and a four-digit access code', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ student: { id: 'student-a', schoolId: 'school-a', grade: 3, classNumber: 2, studentName: 'Kim' } }),
    });

    await expect(loginStudent('https://api.example', { grade: 3, classNumber: 2, accessCode: '1234' }, fetcher))
      .resolves.toMatchObject({ studentName: 'Kim' });
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/auth/student/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ grade: 3, classNumber: 2, accessCode: '1234' }),
    });
  });

  it('changes the current student access code using credentials', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true });

    await expect(changeStudentAccessCode('https://api.example', { currentAccessCode: '1234', newAccessCode: '4321' }, fetcher)).resolves.toBeUndefined();
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/auth/access-code', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
      body: JSON.stringify({ currentAccessCode: '1234', newAccessCode: '4321' }),
    });
  });
});
