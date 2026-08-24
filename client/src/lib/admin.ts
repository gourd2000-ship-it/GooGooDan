export interface AdminStudent {
  id: string;
  grade: number;
  classNumber: number;
  studentName: string;
  isActive: boolean;
}

export interface AdminStudentInput {
  grade: number;
  classNumber: number;
  studentName: string;
  accessCode?: string;
}

export interface PracticeProgress { score: number; isPerfect: boolean; }
export interface AdminProgressStudent {
  studentId: string;
  studentName: string;
  grade: number;
  classNumber: number;
  tables: Record<number, Partial<Record<'speech' | 'tap', PracticeProgress>>>;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

function headers(idToken: string) {
  return { Authorization: `Bearer ${idToken}` };
}

async function readResponse<T>(response: Awaited<ReturnType<Fetcher>>, key: string): Promise<T> {
  const body = await response.json();
  if (!response.ok || !body || typeof body !== 'object' || !(key in body)) {
    const candidate = body && typeof body === 'object' ? body as Record<string, unknown> : null;
    const message = candidate && typeof candidate.error === 'string' ? candidate.error : '관리자 요청을 처리하지 못했어요.';
    throw new Error(message);
  }
  return (body as Record<string, unknown>)[key] as T;
}

export async function listAdminStudents(apiUrl: string, idToken: string, filters: Partial<Pick<AdminStudent, 'grade' | 'classNumber'>> = {}, fetcher: Fetcher = fetch): Promise<AdminStudent[]> {
  const params = new URLSearchParams();
  if (filters.grade) params.set('grade', String(filters.grade));
  if (filters.classNumber) params.set('classNumber', String(filters.classNumber));
  const suffix = params.size ? `?${params.toString()}` : '';
  return readResponse<AdminStudent[]>(await fetcher(`${apiUrl}/api/admin/students${suffix}`, { headers: headers(idToken), credentials: 'include' }), 'students');
}

export async function createAdminStudent(apiUrl: string, idToken: string, input: AdminStudentInput, fetcher: Fetcher = fetch): Promise<AdminStudent> {
  return readResponse<AdminStudent>(await fetcher(`${apiUrl}/api/admin/students`, { method: 'POST', headers: { ...headers(idToken), 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(input) }), 'student');
}

export async function updateAdminStudent(apiUrl: string, idToken: string, studentId: string, input: AdminStudentInput & { resetAccessCode?: string }, fetcher: Fetcher = fetch): Promise<AdminStudent> {
  return readResponse<AdminStudent>(await fetcher(`${apiUrl}/api/admin/students/${encodeURIComponent(studentId)}`, { method: 'PATCH', headers: { ...headers(idToken), 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(input) }), 'student');
}

export async function importAdminStudents(apiUrl: string, idToken: string, rows: AdminStudentInput[], fetcher: Fetcher = fetch): Promise<AdminStudent[]> {
  return readResponse<AdminStudent[]>(await fetcher(`${apiUrl}/api/admin/students/import`, { method: 'POST', headers: { ...headers(idToken), 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ rows }) }), 'students');
}

export async function getAdminProgress(apiUrl: string, idToken: string, filters: Partial<Pick<AdminStudent, 'grade' | 'classNumber'>> = {}, fetcher: Fetcher = fetch): Promise<AdminProgressStudent[]> {
  const params = new URLSearchParams();
  if (filters.grade) params.set('grade', String(filters.grade));
  if (filters.classNumber) params.set('classNumber', String(filters.classNumber));
  const suffix = params.size ? `?${params.toString()}` : '';
  return readResponse<AdminProgressStudent[]>(await fetcher(`${apiUrl}/api/admin/progress${suffix}`, { headers: headers(idToken), credentials: 'include' }), 'students');
}
