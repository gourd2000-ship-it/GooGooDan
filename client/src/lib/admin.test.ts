import { describe, expect, it, vi } from 'vitest';
import { createAdminStudent, getAdminProgress, listAdminStudents } from './admin';

describe('administrator API client', () => {
  it('uses the Google ID token to scope student roster requests', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ students: [{ id: 'student-a', grade: 3, classNumber: 2, studentName: 'Kim', isActive: true }] }) });

    await expect(listAdminStudents('https://api.example', 'google-id-token', { grade: 3, classNumber: 2 }, fetcher)).resolves.toHaveLength(1);
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/admin/students?grade=3&classNumber=2', {
      headers: { Authorization: 'Bearer google-id-token' }, credentials: 'include',
    });
  });

  it('creates a student without exposing an access-code hash', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ student: { id: 'student-b', grade: 4, classNumber: 1, studentName: 'Lee', isActive: true } }) });

    await expect(createAdminStudent('https://api.example', 'google-id-token', { grade: 4, classNumber: 1, studentName: 'Lee', accessCode: '1234' }, fetcher)).resolves.toMatchObject({ id: 'student-b' });
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/admin/students', expect.objectContaining({ method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer google-id-token' }) }));
  });

  it('requests filtered achievement progress with the Google ID token', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ students: [] }) });

    await expect(getAdminProgress('https://api.example', 'google-id-token', { grade: 3 }, fetcher)).resolves.toEqual([]);
    expect(fetcher).toHaveBeenCalledWith('https://api.example/api/admin/progress?grade=3', { headers: { Authorization: 'Bearer google-id-token' }, credentials: 'include' });
  });
});
