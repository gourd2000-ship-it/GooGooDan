import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { Trophy, Home, Timer, Star } from 'lucide-react';
import { API_URL } from '../config';
import type { ChallengeMode, PracticeType } from '../lib/practice';

interface PracticeRankingRecord {
  student_name: string;
  table_number: number;
  mode: 'sequential' | 'reverse' | 'random';
  score: number;
  total_time_ms: number;
}

interface ChallengeRankingRecord {
  student_name: string;
  question_count: 20 | 25 | 30;
  challenge_mode: ChallengeMode;
  total_correct: number;
  star_count: number;
  total_time_ms: number;
}

type RankingRecord = PracticeRankingRecord | ChallengeRankingRecord;
type RankingKind = 'speech' | 'tap' | 'challenge';

const challengeModes: { value: ChallengeMode; label: string }[] = [
  { value: 'answer-speech', label: '답 말하기' },
  { value: 'answer-tap', label: '답 누르기' },
  { value: 'expression-speech', label: '식 말하기' },
  { value: 'expression-tap', label: '식 누르기' },
];

const isChallengeRecord = (record: RankingRecord): record is ChallengeRankingRecord => 'question_count' in record;

const practiceModeLabels: Record<PracticeRankingRecord['mode'], string> = {
  sequential: '순서대로',
  reverse: '거꾸로',
  random: '섞어서',
};

export default function RankingScreen() {
  const { setScreen } = useStore();
  const [ranking, setRanking] = useState<RankingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<'all' | number>('all');
  const [selectedKind, setSelectedKind] = useState<RankingKind>('speech');
  const [questionCount, setQuestionCount] = useState<20 | 25 | 30>(20);
  const [challengeMode, setChallengeMode] = useState<ChallengeMode>('answer-tap');
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      setError(false);
      try {
        const url = selectedKind === 'challenge'
          ? `${API_URL}/api/challenge/ranking?${new URLSearchParams({ questionCount: String(questionCount), challengeMode }).toString()}`
          : (() => {
            const params = new URLSearchParams({ practiceType: selectedKind as PracticeType });
            if (selectedTable !== 'all') params.set('table', String(selectedTable));
            return `${API_URL}/api/ranking?${params.toString()}`;
          })();
        const response = await fetch(url);
        const data: unknown = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error('Failed to fetch ranking');
        setRanking(data as RankingRecord[]);
      } catch {
        setRanking([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    void fetchRanking();
  }, [selectedKind, selectedTable, questionCount, challengeMode]);

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 p-4">
      <main className="mt-8 w-full max-w-2xl rounded-3xl border-4 border-amber-100 bg-white p-8 shadow-xl">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3"><Trophy className="text-amber-500" size={40} /><h1 className="text-4xl font-black text-slate-800">명예의 전당</h1></div>
          <button type="button" aria-label="홈으로 돌아가기" onClick={() => setScreen('home')} className="rounded-full bg-slate-100 p-3 text-slate-600 hover:bg-slate-200"><Home size={24} /></button>
        </div>

        <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-2">
          {([
            { value: 'speech', label: '말하는 구구단' },
            { value: 'tap', label: '누르는 구구단' },
            { value: 'challenge', label: '챌린지 랭킹' },
          ] as const).map(({ value, label }) => <button key={value} type="button" aria-pressed={selectedKind === value} onClick={() => setSelectedKind(value)}
            className={`rounded-xl px-3 py-3 font-bold transition-colors ${selectedKind === value ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>{label}</button>)}
        </div>

        {selectedKind === 'challenge' ? (
          <div className="mb-6 space-y-3">
            <div className="grid grid-cols-3 gap-2" aria-label="챌린지 문제 수">
              {([20, 25, 30] as const).map((count) => <button key={count} type="button" aria-pressed={questionCount === count} onClick={() => setQuestionCount(count)}
                className={`rounded-xl px-3 py-2 font-bold ${questionCount === count ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>{count}문제</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2" aria-label="챌린지 방식">
              {challengeModes.map(({ value, label }) => <button key={value} type="button" aria-pressed={challengeMode === value} onClick={() => setChallengeMode(value)}
                className={`rounded-xl px-3 py-2 font-bold ${challengeMode === value ? 'bg-violet-600 text-white' : 'bg-violet-50 text-violet-800 hover:bg-violet-100'}`}>{label}</button>)}
            </div>
          </div>
        ) : (
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            <button type="button" onClick={() => setSelectedTable('all')} className={`whitespace-nowrap rounded-full px-4 py-2 font-bold ${selectedTable === 'all' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>전체 랭킹</button>
            {[2, 3, 4, 5, 6, 7, 8, 9].map((table) => <button key={table} type="button" onClick={() => setSelectedTable(table)} className={`whitespace-nowrap rounded-full px-4 py-2 font-bold ${selectedTable === table ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500'}`}>{table}단</button>)}
          </div>
        )}

        {loading ? <div className="py-20 text-center font-bold text-slate-400">랭킹을 불러오고 있어요...</div>
          : error ? <div role="alert" className="py-16 text-center font-bold text-red-500">랭킹을 불러오지 못했어요. 다시 시도해 주세요.</div>
            : ranking.length === 0 ? <div className="py-16 text-center font-bold text-slate-400">아직 랭킹 기록이 없어요. 먼저 도전해 보세요!</div>
              : <div className="space-y-4">{ranking.map((record, index) => {
                const challenge = isChallengeRecord(record);
                return <div key={`${record.student_name}-${index}`} className={`flex items-center justify-between rounded-2xl border-2 p-5 ${index === 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-100 bg-white'}`}>
                  <div className="flex items-center gap-4"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl font-black text-slate-600">{index + 1}</div><div><div className="flex items-center gap-2 text-xl font-bold text-slate-800">{record.student_name}{index === 0 && <Star size={16} fill="currentColor" className="text-amber-500" />}</div>
                    <div className="mt-1 text-xs font-bold text-violet-700">{challenge ? `${record.question_count}문제 · ${challengeModes.find((mode) => mode.value === record.challenge_mode)?.label}` : <><span>{record.table_number}단</span><span className="ml-2">{practiceModeLabels[record.mode]}</span></>}</div></div></div>
                  <div className="text-right"><div className="text-2xl font-black text-blue-600">{challenge ? `${record.total_correct}개 · ${'★'.repeat(record.star_count)}` : `${record.score}점`}</div><div className="flex items-center justify-end gap-1 font-mono text-sm text-slate-400"><Timer size={14} />{(record.total_time_ms / 1000).toFixed(2)}초</div></div>
                </div>;
              })}</div>}
      </main>
    </div>
  );
}
