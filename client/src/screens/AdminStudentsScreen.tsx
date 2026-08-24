import { useCallback, useEffect, useMemo, useState } from 'react';
import { type AdminStudent, type AdminStudentInput, createAdminStudent, importAdminStudents, listAdminStudents, updateAdminStudent } from '../lib/admin';
import { API_URL } from '../config';

interface Props {
  idToken: string;
  onDashboard: () => void;
  onSignOut: () => void;
}

const emptyInput: AdminStudentInput = { grade: 1, classNumber: 1, studentName: '', accessCode: '' };

function parseCsv(text: string): AdminStudentInput[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('헤더와 한 명 이상의 학생이 필요해요.');
  const headers = lines[0].split(',').map((value) => value.trim());
  const required = ['grade', 'classNumber', 'studentName'];
  if (required.some((name) => !headers.includes(name))) throw new Error('CSV 헤더는 grade,classNumber,studentName,accessCode 형식이어야 해요.');
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').map((value) => value.trim());
    const valueFor = (name: string) => values[headers.indexOf(name)] ?? '';
    const rowNumber = index + 2;
    const studentName = valueFor('studentName');
    if (!studentName) throw new Error(`${rowNumber}행의 학생 이름을 입력해 주세요.`);
    const grade = Number(valueFor('grade'));
    const classNumber = Number(valueFor('classNumber'));
    if (!Number.isInteger(grade) || grade < 1 || grade > 6) throw new Error(`${rowNumber}행의 학년을 확인해 주세요.`);
    if (!Number.isInteger(classNumber) || classNumber < 1) throw new Error(`${rowNumber}행의 반을 확인해 주세요.`);
    const accessCode = valueFor('accessCode');
    if (accessCode && !/^\d{4}$/.test(accessCode)) throw new Error(`${rowNumber}행의 접속번호는 네 자리 숫자여야 해요.`);
    return { grade, classNumber, studentName, ...(accessCode ? { accessCode } : {}) };
  });
}

export default function AdminStudentsScreen({ idToken, onDashboard, onSignOut }: Props) {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [filters, setFilters] = useState({ grade: '', classNumber: '', search: '' });
  const [input, setInput] = useState<AdminStudentInput>(emptyInput);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [csv, setCsv] = useState('grade,classNumber,studentName,accessCode\n');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const results = await listAdminStudents(API_URL, idToken, { grade: filters.grade ? Number(filters.grade) : undefined, classNumber: filters.classNumber ? Number(filters.classNumber) : undefined });
      setStudents(results);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '학생 목록을 불러오지 못했어요.');
    } finally { setLoading(false); }
  }, [filters.classNumber, filters.grade, idToken]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const visibleStudents = useMemo(() => students.filter((student) => student.studentName.includes(filters.search.trim())), [students, filters.search]);

  const submitStudent = async () => {
    try {
      if (!input.studentName.trim()) throw new Error('학생 이름을 입력해 주세요.');
      if (editingStudentId) await updateAdminStudent(API_URL, idToken, editingStudentId, { ...input, resetAccessCode: input.accessCode || undefined });
      else await createAdminStudent(API_URL, idToken, { ...input, accessCode: input.accessCode || undefined });
      setInput(emptyInput);
      setEditingStudentId(null);
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : '학생 정보를 저장하지 못했어요.'); }
  };

  const startEdit = (student: AdminStudent) => {
    setEditingStudentId(student.id);
    setInput({ grade: student.grade, classNumber: student.classNumber, studentName: student.studentName, accessCode: '' });
    setMessage('');
  };

  const submitCsv = async () => {
    try {
      const rows = parseCsv(csv);
      await importAdminStudents(API_URL, idToken, rows);
      setCsv('grade,classNumber,studentName,accessCode\n');
      await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'CSV를 등록하지 못했어요.'); }
  };

  return <div className="min-h-screen bg-slate-50 p-4">
    <main className="mx-auto max-w-5xl rounded-3xl border-4 border-indigo-100 bg-white p-6 shadow-xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-800">학생 명부 관리</h1><p className="text-slate-500">내 학교 학생만 관리할 수 있어요.</p></div><div className="flex gap-2"><button type="button" onClick={onDashboard} className="rounded-xl bg-indigo-100 px-4 py-2 font-bold text-indigo-700">성취 대시보드</button><button type="button" onClick={onSignOut} className="rounded-xl bg-slate-100 px-4 py-2 font-bold text-slate-700">로그아웃</button></div></header>
      <section className="grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-3"><label>학년<select aria-label="명부 학년 필터" value={filters.grade} onChange={(event) => setFilters((value) => ({ ...value, grade: event.target.value }))} className="mt-1 w-full rounded-lg border p-2"><option value="">전체</option>{[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}학년</option>)}</select></label><label>반<select aria-label="명부 반 필터" value={filters.classNumber} onChange={(event) => setFilters((value) => ({ ...value, classNumber: event.target.value }))} className="mt-1 w-full rounded-lg border p-2"><option value="">전체</option>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}반</option>)}</select></label><label>이름 검색<input aria-label="학생 검색" value={filters.search} onChange={(event) => setFilters((value) => ({ ...value, search: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label></section>
      <section className="mt-6 rounded-2xl border p-4"><h2 className="text-xl font-black">{editingStudentId ? '학생 수정' : '학생 등록'}</h2><div className="mt-3 grid gap-3 md:grid-cols-4"><label>학년<input aria-label="등록 학년" type="number" min="1" max="6" value={input.grade} onChange={(event) => setInput((value) => ({ ...value, grade: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>반<input aria-label="등록 반" type="number" min="1" value={input.classNumber} onChange={(event) => setInput((value) => ({ ...value, classNumber: Number(event.target.value) }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>이름<input aria-label="학생 이름" value={input.studentName} onChange={(event) => setInput((value) => ({ ...value, studentName: event.target.value }))} className="mt-1 w-full rounded-lg border p-2" /></label><label>접속번호<input aria-label="접속번호" inputMode="numeric" maxLength={4} value={input.accessCode} onChange={(event) => setInput((value) => ({ ...value, accessCode: event.target.value.replace(/\D/g, '') }))} placeholder="비우면 자동 생성" className="mt-1 w-full rounded-lg border p-2" /></label></div><div className="mt-3 flex gap-2"><button type="button" onClick={() => void submitStudent()} className="rounded-xl bg-indigo-600 px-4 py-2 font-bold text-white">{editingStudentId ? '학생 수정' : '학생 등록'}</button>{editingStudentId && <button type="button" onClick={() => { setEditingStudentId(null); setInput(emptyInput); }} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">취소</button>}</div></section>
      <section className="mt-6 rounded-2xl border p-4"><h2 className="text-xl font-black">CSV 일괄 등록</h2><p className="mt-1 text-sm text-slate-500">헤더: grade,classNumber,studentName,accessCode (접속번호는 비워 둘 수 있음)</p><textarea aria-label="CSV 학생 목록" value={csv} onChange={(event) => setCsv(event.target.value)} rows={5} className="mt-3 w-full rounded-lg border p-3 font-mono text-sm" /><button type="button" onClick={() => void submitCsv()} className="mt-2 rounded-xl bg-violet-600 px-4 py-2 font-bold text-white">CSV 일괄 등록</button></section>
      {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 font-bold text-red-700">{message}</p>}
      <section className="mt-6"><h2 className="text-xl font-black">학생 목록</h2>{loading ? <p className="py-6 text-slate-500">불러오는 중...</p> : visibleStudents.length === 0 ? <p className="py-6 text-slate-500">등록된 학생이 없습니다.</p> : <ul className="divide-y">{visibleStudents.map((student) => <li key={student.id} className="flex items-center justify-between py-3"><span><b>{student.studentName}</b> · {student.grade}학년 {student.classNumber}반</span><button type="button" onClick={() => startEdit(student)} className="rounded-lg bg-slate-100 px-3 py-1 font-bold">수정</button></li>)}</ul>}</section>
    </main>
  </div>;
}
