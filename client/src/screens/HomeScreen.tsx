import { Play, Trophy, UserRoundCog } from 'lucide-react';
import { buildTapQuestions, createQuestionOrder } from '../lib/practice';
import type { PracticeOrder, PracticeType, TapGameMode } from '../lib/practice';
import { useStore } from '../store/useStore';

const tables = [2, 3, 4, 5, 6, 7, 8, 9];
const orders: { value: PracticeOrder; label: string }[] = [
  { value: 'sequential', label: '순서대로' },
  { value: 'reverse', label: '거꾸로' },
  { value: 'random', label: '섞어서' },
];
const tapGameModes: { value: TapGameMode; label: string }[] = [
  { value: 'answer', label: '답 고르기' },
  { value: 'expression', label: '식 고르기' },
  { value: 'mixed', label: '답과 식 섞기' },
];

interface PracticeTypeCardProps {
  type: PracticeType;
  title: string;
  isActive: boolean;
  table: number;
  order: PracticeOrder;
  tapGameMode: TapGameMode;
  onSelect: () => void;
  onTableChange: (table: number) => void;
  onOrderChange: (order: PracticeOrder) => void;
  onTapGameModeChange: (mode: TapGameMode) => void;
}

function PracticeTypeCard({
  type, title, isActive, table, order, tapGameMode,
  onSelect, onTableChange, onOrderChange, onTapGameModeChange,
}: PracticeTypeCardProps) {
  return (
    <section className={`rounded-2xl border-2 p-5 text-left transition-all ${isActive ? 'border-blue-300 shadow-md' : 'border-slate-200 opacity-60'}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-800">{title}</h2>
          <p className="text-sm font-medium text-slate-500">{type === 'speech' ? '마이크에 답을 말해요' : '보기 중 정답을 눌러요'}</p>
        </div>
        <button type="button" aria-label={`${title} 선택`} aria-pressed={isActive} onClick={onSelect}
          className={`rounded-xl px-3 py-2 font-bold ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
          {isActive ? '선택됨' : '선택하기'}
        </button>
      </div>

      <fieldset disabled={!isActive} className="space-y-4">
        <div>
          <legend className="mb-2 block font-bold text-slate-700">몇 단을 연습할까요?</legend>
          <div className="grid grid-cols-4 gap-2">
            {tables.map((number) => (
              <button key={number} type="button" aria-label={`${title} ${number}단`} onClick={() => onTableChange(number)}
                className={`rounded-xl p-2 font-bold transition-all ${table === number ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {number}단
              </button>
            ))}
          </div>
        </div>
        <div>
          <legend className="mb-2 block font-bold text-slate-700">어떻게 연습할까요?</legend>
          <div className="flex gap-2">
            {orders.map(({ value, label }) => (
              <button key={value} type="button" onClick={() => onOrderChange(value)}
                className={`flex-1 rounded-xl px-2 py-2 text-sm font-bold transition-all ${order === value ? 'bg-amber-400 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {type === 'tap' && (
          <div>
            <legend className="mb-2 block font-bold text-slate-700">어떤 문제를 풀까요?</legend>
            <div className="grid grid-cols-3 gap-2">
              {tapGameModes.map(({ value, label }) => (
                <button key={value} type="button" onClick={() => onTapGameModeChange(value)}
                  className={`rounded-xl px-2 py-2 text-sm font-bold transition-all ${tapGameMode === value ? 'bg-violet-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </fieldset>
    </section>
  );
}

export default function HomeScreen() {
  const store = useStore();
  const handleStart = () => {
    const table = store.practiceType === 'speech' ? store.speechTable : store.tapTable;
    const order = store.practiceType === 'speech' ? store.speechMode : store.tapMode;
    store.setSelectedTable(table);
    store.setMode(order);
    store.setEvaluationResult(null);
    store.setTapEvaluationResult(null);
    store.setTapRecordStatus('idle');
    store.setTotalTime(0);
    if (store.practiceType === 'tap') {
      store.setTapQuestions(buildTapQuestions(table, order, store.tapGameMode));
      store.setScreen('tapPractice');
      return;
    }
    store.setExpectedQuestions(createQuestionOrder(table, order));
    store.setScreen('practice');
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center bg-slate-50 p-4">
      <div className="absolute top-0 flex w-full max-w-4xl items-center justify-between p-4">
        <button type="button" aria-label="내 정보" onClick={() => store.setScreen('profile')} className="flex items-center gap-2 rounded-full border-2 border-slate-100 bg-white px-4 py-2 font-bold text-slate-700 shadow-sm"><UserRoundCog size={18} /><span>{store.userName} 어린이</span></button>
        <button type="button" onClick={() => store.setScreen('ranking')} className="flex items-center gap-2 rounded-full border-2 border-amber-200 bg-amber-100 px-4 py-2 font-bold text-amber-700 shadow-sm transition-transform hover:scale-105 hover:bg-amber-200"><Trophy size={18} />명예의 전당</button>
      </div>
      <main className="mt-16 w-full max-w-4xl rounded-3xl border-4 border-blue-100 bg-white p-6 shadow-xl sm:p-8">
        <h1 className="mb-2 text-center text-4xl font-black text-blue-600">구구단 연습!</h1>
        <p className="mb-6 text-center font-medium text-slate-500">원하는 학습 방법을 하나 골라 주세요.</p>
        <div className="grid gap-5 md:grid-cols-2">
          <PracticeTypeCard type="speech" title="말하는 구구단" isActive={store.practiceType === 'speech'} table={store.speechTable} order={store.speechMode} tapGameMode={store.tapGameMode}
            onSelect={() => store.setPracticeType('speech')} onTableChange={store.setSpeechTable} onOrderChange={store.setSpeechMode} onTapGameModeChange={store.setTapGameMode} />
          <PracticeTypeCard type="tap" title="누르는 구구단" isActive={store.practiceType === 'tap'} table={store.tapTable} order={store.tapMode} tapGameMode={store.tapGameMode}
            onSelect={() => store.setPracticeType('tap')} onTableChange={store.setTapTable} onOrderChange={store.setTapMode} onTapGameModeChange={store.setTapGameMode} />
        </div>
        <button type="button" onClick={handleStart} className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-4 text-2xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] hover:bg-blue-700 active:scale-[0.98]">
          <Play fill="currentColor" size={28} />시작하기!
        </button>
      </main>
    </div>
  );
}
