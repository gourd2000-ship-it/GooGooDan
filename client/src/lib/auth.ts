export interface StudentSession {
  id: string;
  schoolId: string;
  grade: number;
  classNumber: number;
  studentName: string;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export interface StudentLoginInput {
  grade: number;
  classNumber: number;
  accessCode: string;
}

export interface ChangeAccessCodeInput {
  currentAccessCode: string;
  newAccessCode: string;
}

function isStudentSession(value: unknown): value is StudentSession {
  if (!value || typeof value !== 'object') return false;
  const student = value as Partial<StudentSession>;
  return typeof student.id === 'string' && typeof student.schoolId === 'string'
    && Number.isInteger(student.grade) && Number.isInteger(student.classNumber)
    && typeof student.studentName === 'string';
}

export async function restoreStudentSession(apiUrl: string, fetcher: Fetcher = fetch): Promise<StudentSession> {
  const response = await fetcher(`${apiUrl}/api/auth/session`, { credentials: 'include' });
  const body = await response.json();
  if (!response.ok || !body || typeof body !== 'object' || !('student' in body) || !isStudentSession(body.student)) {
    throw new Error('Invalid student session');
  }
  return body.student;
}

async function readStudentResponse(response: Awaited<ReturnType<Fetcher>>): Promise<StudentSession> {
  const body = await response.json();
  if (!response.ok || !body || typeof body !== 'object' || !('student' in body) || !isStudentSession(body.student)) {
    throw new Error('Invalid student session');
  }
  return body.student;
}

export async function loginStudent(apiUrl: string, input: StudentLoginInput, fetcher: Fetcher = fetch): Promise<StudentSession> {
  const response = await fetcher(`${apiUrl}/api/auth/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  return readStudentResponse(response);
}

export async function changeStudentAccessCode(apiUrl: string, input: ChangeAccessCodeInput, fetcher: Fetcher = fetch): Promise<void> {
  const response = await fetcher(`${apiUrl}/api/auth/access-code`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error('Unable to change access code');
}

export async function logoutStudent(apiUrl: string, fetcher: Fetcher = fetch): Promise<void> {
  const response = await fetcher(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
  if (!response.ok) throw new Error('Unable to log out');
}
