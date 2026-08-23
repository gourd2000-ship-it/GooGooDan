import { useEffect, useRef, useState } from 'react';
import { saveTapRecord } from '../lib/tapRecord';
import { API_URL } from '../config';
import { useStore } from '../store/useStore';

const FEEDBACK_DELAY_MS = 800;

export default function TapPracticeScreen() {
  const {
    userName, selectedTable, mode, tapGameMode, tapQuestions,
    setScreen, setTapEvaluationResult, setTapRecordStatus, setTotalTime,
  } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Array<{ question: string; expected: string; selected: string; isCorrect: boolean }>>([]);
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const question = tapQuestions[currentIndex];

  useEffect(() => {
    startedAtRef.current = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - (startedAtRef.current ?? Date.now())), 100);
    return () => {
      clearInterval(timer);
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const handleChoice = (choice: string) => {
    if (!question || selectedChoice !== null) return;
    const isCorrect = choice === question.correctChoice;
    const nextAnswers = [...answers, { question: question.expression, expected: question.correctChoice, selected: choice, isCorrect }];
    setSelectedChoice(choice);
    setAnswers(nextAnswers);
    advanceTimerRef.current = setTimeout(() => {
      if (currentIndex < tapQuestions.length - 1) {
        setCurrentIndex((index) => index + 1);
        setSelectedChoice(null);
        return;
      }
      const totalCorrect = nextAnswers.filter((answer) => answer.isCorrect).length;
      const totalTime = Date.now() - (startedAtRef.current ?? Date.now());
      setTotalTime(totalTime);
      setTapEvaluationResult({
        results: nextAnswers,
        totalCorrect,
        feedback: totalCorrect === tapQuestions.length ? '완벽해요! 정말 잘했어요!' : '끝까지 도전했어요! 다음에는 더 잘할 수 있어요!',
      });
      setScreen('result');
      setTapRecordStatus('saving');
      void saveTapRecord(API_URL, {
        table: selectedTable,
        mode,
        gameMode: tapGameMode,
        userName,
        totalCorrect,
        totalTime,
      }).then(
        () => setTapRecordStatus('saved'),
        () => setTapRecordStatus('error'),
      );
    }, FEEDBACK_DELAY_MS);
  };

  if (!question) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><button className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white" onClick={() => setScreen('home')}>연습을 다시 선택하기</button></div>;
  }

  const isCorrect = selectedChoice === question.correctChoice;
  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 p-4">
      <main className="mt-8 w-full max-w-2xl rounded-3xl border-4 border-violet-100 bg-white p-6 shadow-xl sm:p-8">
        <div className="mb-8 flex items-center justify-between rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
          <h1 className="text-2xl font-black text-slate-700">{selectedTable}단 누르는 구구단</h1>
          <span className="font-mono text-2xl font-bold text-violet-600">{(elapsed / 1000).toFixed(2)}초</span>
        </div>
        <p className="mb-2 text-center font-bold text-slate-500">{currentIndex + 1} / {tapQuestions.length} 문제</p>
        <h2 className="mb-8 text-center text-5xl font-black text-slate-800">{question.prompt}</h2>
        <div className="grid grid-cols-2 gap-3" aria-label="답안 선택지">
          {question.choices.map((choice) => {
            const wasSelected = choice === selectedChoice;
            const stateClass = selectedChoice === null
              ? 'bg-slate-100 text-slate-800 hover:bg-violet-100 hover:border-violet-300'
              : wasSelected && isCorrect ? 'border-green-400 bg-green-100 text-green-800'
                : wasSelected ? 'border-red-400 bg-red-100 text-red-800'
                  : choice === question.correctChoice ? 'border-green-300 bg-green-50 text-green-700'
                    : 'bg-slate-100 text-slate-400';
            return <button key={choice} type="button" disabled={selectedChoice !== null} aria-pressed={wasSelected} onClick={() => handleChoice(choice)}
              className={`min-h-20 rounded-2xl border-2 p-4 text-xl font-black transition-all disabled:cursor-not-allowed ${stateClass}`}>{choice}</button>;
          })}
        </div>
        {selectedChoice !== null && <p role="status" className={`mt-6 text-center text-2xl font-black ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
          {isCorrect ? '정답이에요!' : `아쉬워요! 정답은 ${question.correctChoice}예요.`}
        </p>}
      </main>
    </div>
  );
}
