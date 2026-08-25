import { useEffect, useState } from 'react';
import { type AdminProgressStudent, getAdminProgress } from '../lib/admin';
import { API_URL } from '../config';

interface Props { idToken: string; onStudents: () => void; onSignOut: () => void; }
const tables = [2, 3, 4, 5, 6, 7, 8, 9];

function colorFor(scores: number[]) {
  const score = Math.max(...scores);
  if (score >= 100) return 'bg-green-100 text-green-900';
  if (score >= 30) return 'bg-yellow-100 text-yellow-900';
  return 'bg-red-50 text-red-800';
}

function Score({ label, value, best }: { label: string; value?: { score: number; isPerfect: boolean }; best: number }) {
  if (!value) return null;
  return <span className={value.score === best ? 'font-black underline decoration-2' : 'font-medium'}>{label} {value.score}점{value.isPerfect ? ' ✓' : ''}</span>;
}

export default function AdminDashboardScreen({ idToken, onStudents, onSignOut }: Props) {
  const [students, setStudents] = useState<AdminProgressStudent[]>([]);
  const [grade, setGrade] = useState('');
  const [classNumber, setClassNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    let active = true;
    void getAdminProgress(API_URL, idToken, { grade: grade ? Number(grade) : undefined, classNumber: classNumber ? Number(classNumber) : undefined })
      .then((results) => { if (active) { setStudents(results); setError(''); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : '성취 정보를 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [idToken, grade, classNumber, refreshVersion]);

  return <div className="min-h-screen bg-slate-50 p-4"><main className="mx-auto max-w-[1500px] rounded-3xl border-4 border-emerald-100 bg-white p-6 shadow-xl">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-800">성취 대시보드</h1><p className="text-slate-500">말하기와 누르기 중 높은 점수를 굵게 표시해요.</p></div><div className="flex gap-2"><button type="button" onClick={() => { setLoading(true); setRefreshVersion((version) => version + 1); }} disabled={loading} className="rounded-xl bg-emerald-100 px-4 py-2 font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">새로고침</button><button type="button" onClick={onStudents} className="rounded-xl bg-indigo-100 px-4 py-2 font-bold text-indigo-700">학생 명부</button><button type="button" onClick={onSignOut} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">로그아웃</button></div></header>
    <section className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4"><label>학년<select aria-label="대시보드 학년 필터" value={grade} onChange={(event) => { setLoading(true); setGrade(event.target.value); }} className="ml-2 rounded-lg border p-2"><option value="">전체</option>{[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}학년</option>)}</select></label><label>반<select aria-label="대시보드 반 필터" value={classNumber} onChange={(event) => { setLoading(true); setClassNumber(event.target.value); }} className="ml-2 rounded-lg border p-2"><option value="">전체</option>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}반</option>)}</select></label></section>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p> : loading ? <p className="py-8 text-slate-500">성취 정보를 불러오는 중...</p> : students.length === 0 ? <p className="py-8 text-slate-500">조건에 맞는 학습 기록이 없습니다.</p> : <div className="mt-6 overflow-x-auto"><table className="min-w-full border-separate border-spacing-2"><thead><tr><th className="sticky left-0 bg-white p-2 text-left">학생</th>{tables.map((table) => <th key={table} className="p-2 text-center">{table}단</th>)}</tr></thead><tbody>{students.map((student) => <tr key={student.studentId}><th className="sticky left-0 bg-white p-2 text-left">{student.studentName}<small className="ml-1 text-slate-500">{student.grade}-{student.classNumber}</small></th>{tables.map((table) => { const progress = student.tables[table]; const scores = [progress?.speech?.score, progress?.tap?.score].filter((value): value is number => value !== undefined); const best = Math.max(...scores, 0); return <td key={table} data-testid={`progress-${student.studentId}-table-${table}`} className={`min-w-36 rounded-xl p-3 text-center text-sm ${scores.length ? colorFor(scores) : 'bg-red-50 text-red-800'}`}>{scores.length ? <div className="space-y-1"><Score label="말" value={progress?.speech} best={best} /><br /><Score label="누" value={progress?.tap} best={best} /></div> : '기록 없음'}</td>; })}</tr>)}</tbody></table></div>}
    <p className="mt-4 text-sm text-slate-500">색상 기준: 100점 이상 초록, 30~99점 노랑, 30점 미만 또는 기록 없음 빨강. ✓는 모두 정답입니다.</p>
  </main></div>;
}
