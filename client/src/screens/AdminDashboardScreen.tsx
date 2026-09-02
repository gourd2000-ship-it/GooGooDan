import { useEffect, useState } from 'react';
import { type AdminChallengeRankingEntry, type AdminProgressStudent, type AdminRankingEntry, getAdminChallengeRanking, getAdminProgress, getAdminRanking } from '../lib/admin';
import { API_URL } from '../config';
import type { ChallengeMode, ChallengeQuestionCount } from '../lib/practice';

interface Props { idToken: string; onStudents: () => void; onSignOut: () => void; }
const tables = [2, 3, 4, 5, 6, 7, 8, 9];
const challengeModes: { value: ChallengeMode; label: string }[] = [
  { value: 'answer-speech', label: '답 말하기' },
  { value: 'answer-tap', label: '답 누르기' },
  { value: 'expression-speech', label: '식 말하기' },
  { value: 'expression-tap', label: '식 누르기' },
];
type RankingKind = 'speech' | 'tap' | 'challenge';
type RankingEntry = AdminRankingEntry | AdminChallengeRankingEntry;
function isChallengeRankingEntry(entry: RankingEntry): entry is AdminChallengeRankingEntry { return 'totalCorrect' in entry; }

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
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [rankingKind, setRankingKind] = useState<RankingKind>('speech');
  const [rankingTable, setRankingTable] = useState('all');
  const [rankingQuestionCount, setRankingQuestionCount] = useState<ChallengeQuestionCount>(20);
  const [rankingChallengeMode, setRankingChallengeMode] = useState<ChallengeMode>('answer-tap');
  const [rankingError, setRankingError] = useState('');
  const [rankingLoading, setRankingLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void getAdminProgress(API_URL, idToken, { grade: grade ? Number(grade) : undefined, classNumber: classNumber ? Number(classNumber) : undefined })
      .then((results) => { if (active) { setStudents(results); setError(''); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : '성취 정보를 불러오지 못했어요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [idToken, grade, classNumber, refreshVersion]);

  useEffect(() => {
    let active = true;
    const request = rankingKind === 'challenge'
      ? getAdminChallengeRanking(API_URL, idToken, { questionCount: rankingQuestionCount, challengeMode: rankingChallengeMode })
      : getAdminRanking(API_URL, idToken, { practiceType: rankingKind, table: rankingTable === 'all' ? 'all' : Number(rankingTable) });
    void request
      .then((results) => { if (active) { setRanking(results); setRankingError(''); } })
      .catch((reason: unknown) => { if (active) setRankingError(reason instanceof Error ? reason.message : '랭킹을 불러오지 못했어요.'); })
      .finally(() => { if (active) setRankingLoading(false); });
    return () => { active = false; };
  }, [idToken, rankingKind, rankingTable, rankingQuestionCount, rankingChallengeMode, refreshVersion]);

  return <div className="min-h-screen bg-slate-50 p-4"><main className="mx-auto max-w-[1500px] rounded-3xl border-4 border-emerald-100 bg-white p-6 shadow-xl">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-black text-slate-800">성취 대시보드</h1><p className="text-slate-500">말하기와 누르기 중 높은 점수를 굵게 표시해요.</p></div><div className="flex gap-2"><button type="button" onClick={() => { setLoading(true); setRankingLoading(true); setRefreshVersion((version) => version + 1); }} disabled={loading || rankingLoading} className="rounded-xl bg-emerald-100 px-4 py-2 font-bold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">새로고침</button><button type="button" onClick={onStudents} className="rounded-xl bg-indigo-100 px-4 py-2 font-bold text-indigo-700">학생 명부</button><button type="button" onClick={onSignOut} className="rounded-xl bg-slate-100 px-4 py-2 font-bold">로그아웃</button></div></header>
    <section className="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4"><label>학년<select aria-label="대시보드 학년 필터" value={grade} onChange={(event) => { setLoading(true); setGrade(event.target.value); }} className="ml-2 rounded-lg border p-2"><option value="">전체</option>{[1,2,3,4,5,6].map((value) => <option key={value} value={value}>{value}학년</option>)}</select></label><label>반<select aria-label="대시보드 반 필터" value={classNumber} onChange={(event) => { setLoading(true); setClassNumber(event.target.value); }} className="ml-2 rounded-lg border p-2"><option value="">전체</option>{[1,2,3,4,5,6,7,8,9,10].map((value) => <option key={value} value={value}>{value}반</option>)}</select></label></section>
    {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 font-bold text-red-700">{error}</p> : loading ? <p className="py-8 text-slate-500">성취 정보를 불러오는 중...</p> : students.length === 0 ? <p className="py-8 text-slate-500">조건에 맞는 학습 기록이 없습니다.</p> : <div className="mt-6 overflow-x-auto"><table className="min-w-full border-separate border-spacing-2"><thead><tr><th className="sticky left-0 bg-white p-2 text-left">학생</th>{tables.map((table) => <th key={table} className="p-2 text-center">{table}단</th>)}</tr></thead><tbody>{students.map((student) => <tr key={student.studentId}><th className="sticky left-0 bg-white p-2 text-left">{student.studentName}<small className="ml-1 text-slate-500">{student.grade}-{student.classNumber}</small></th>{tables.map((table) => { const progress = student.tables[table]; const scores = [progress?.speech?.score, progress?.tap?.score].filter((value): value is number => value !== undefined); const best = Math.max(...scores, 0); return <td key={table} data-testid={`progress-${student.studentId}-table-${table}`} className={`min-w-36 rounded-xl p-3 text-center text-sm ${scores.length ? colorFor(scores) : 'bg-red-50 text-red-800'}`}>{scores.length ? <div className="space-y-1"><Score label="말" value={progress?.speech} best={best} /><br /><Score label="누" value={progress?.tap} best={best} /></div> : '기록 없음'}</td>; })}</tr>)}</tbody></table></div>}
    <section data-testid="admin-ranking" className="mt-8 rounded-2xl border-2 border-amber-100 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-black text-amber-900">학교 랭킹</h2><p className="text-sm text-amber-800">학생별 최고 기록으로 표시해요.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => { setRankingLoading(true); setRankingKind('speech'); }} aria-pressed={rankingKind === 'speech'} className={`rounded-lg px-3 py-2 font-bold ${rankingKind === 'speech' ? 'bg-amber-500 text-white' : 'bg-white text-amber-800'}`}>말하기</button><button type="button" onClick={() => { setRankingLoading(true); setRankingKind('tap'); }} aria-pressed={rankingKind === 'tap'} className={`rounded-lg px-3 py-2 font-bold ${rankingKind === 'tap' ? 'bg-amber-500 text-white' : 'bg-white text-amber-800'}`}>누르기</button><button type="button" onClick={() => { setRankingLoading(true); setRankingKind('challenge'); }} aria-pressed={rankingKind === 'challenge'} className={`rounded-lg px-3 py-2 font-bold ${rankingKind === 'challenge' ? 'bg-violet-600 text-white' : 'bg-white text-violet-800'}`}>챌린지</button></div></div>
      {rankingKind === 'challenge' ? <div className="mt-3 space-y-2"><div className="flex flex-wrap gap-2" aria-label="챌린지 문제 수">{([20, 25, 30] as const).map((count) => <button key={count} type="button" onClick={() => { setRankingLoading(true); setRankingQuestionCount(count); }} aria-pressed={rankingQuestionCount === count} className={`rounded-lg px-3 py-2 font-bold ${rankingQuestionCount === count ? 'bg-amber-500 text-white' : 'bg-white text-amber-800'}`}>{count}문제</button>)}</div><div className="flex flex-wrap gap-2" aria-label="챌린지 방식">{challengeModes.map(({ value, label }) => <button key={value} type="button" onClick={() => { setRankingLoading(true); setRankingChallengeMode(value); }} aria-pressed={rankingChallengeMode === value} className={`rounded-lg px-3 py-2 font-bold ${rankingChallengeMode === value ? 'bg-violet-600 text-white' : 'bg-white text-violet-800'}`}>{label}</button>)}</div></div> : <label className="mt-3 inline-block rounded-lg bg-white px-2 py-1 font-bold text-amber-900">단<select aria-label="랭킹 단 필터" value={rankingTable} onChange={(event) => { setRankingLoading(true); setRankingTable(event.target.value); }} className="ml-2 rounded border p-1"><option value="all">전체</option>{tables.map((table) => <option key={table} value={table}>{table}단</option>)}</select></label>}
      {rankingError ? <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 font-bold text-red-700">{rankingError}</p> : rankingLoading ? <p className="mt-4 text-amber-800">랭킹을 불러오는 중...</p> : ranking.length === 0 ? <p className="mt-4 text-amber-800">표시할 랭킹 기록이 없습니다.</p> : <ol className="mt-4 grid gap-2 md:grid-cols-2">{ranking.map((record, index) => { const challenge = isChallengeRankingEntry(record); return <li key={`${record.studentName}-${index}`} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><span className="w-7 text-center text-lg font-black text-amber-600">{index + 1}</span><strong className="flex-1 text-slate-800">{record.studentName}</strong>{challenge ? <><span className="font-black text-violet-700">{record.totalCorrect}개 · {'★'.repeat(record.starCount)}</span><span className="text-sm text-slate-500">{(record.totalTimeMs / 1000).toFixed(2)}초</span></> : <><span className="text-slate-600">{record.table}단</span><span className="font-black text-amber-700">{record.score}점</span><span className="text-sm text-slate-500">{(record.totalTimeMs / 1000).toFixed(2)}초</span></>}</li>; })}</ol>}
    </section>
    <p className="mt-4 text-sm text-slate-500">색상 기준: 100점 이상 초록, 30~99점 노랑, 30점 미만 또는 기록 없음 빨강. ✓는 모두 정답입니다.</p>
  </main></div>;
}
