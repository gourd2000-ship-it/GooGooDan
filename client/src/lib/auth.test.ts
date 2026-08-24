import { describe, expect, it, vi } from 'vitest';
import { logoutStudent, restoreStudentSession } from './auth';

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
});
