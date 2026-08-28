import { useMemo, useRef, useState } from 'react';
import { buildChallengeTapQuestions } from '../lib/practice';
import { useStore } from '../store/useStore';

export default function ChallengeTapScreen() {
  const {
    challengeMode, challengeQuestions, setChallengeEvaluationResult,
    setScreen, setTotalTime,
  } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Array<{ question: string; expected: string; selected: string; isCorrect: boolean }>>([]);
  const startedAt = useRef(Date.now());
  const isTapMode = challengeMode === 'answer-tap' || challengeMode === 'expression-tap';
  const questions = useMemo(
    () => isTapMode ? buildChallengeTapQuestions(challengeQuestions, challengeMode) : [],
    [isTapMode, challengeMode, challengeQuestions],
  );
  const question = questions[currentIndex];

  if (!isTapMode || !question) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><button type="button" onClick={() => setScreen('home')} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">홈으로 돌아가기</button></div>;
  }

  const choose = (choice: string) => {
    const nextAnswers = [...answers, {
      question: question.expression,
      expected: question.correctChoice,
      selected: choice,
      isCorrect: choice === question.correctChoice,
    }];
    if (currentIndex < questions.length - 1) {
      setAnswers(nextAnswers);
      setCurrentIndex((index) => index + 1);
      return;
    }
    const totalTime = Date.now() - startedAt.current;
    setTotalTime(totalTime);
    setChallengeEvaluationResult({
      results: nextAnswers,
      totalCorrect: nextAnswers.filter((answer) => answer.isCorrect).length,
      feedback: '챌린지를 끝까지 풀었어요! 결과를 확인해 볼까요?',
    });
    setScreen('challengeResult');
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 p-4">
      <main className="mt-8 w-full max-w-2xl rounded-3xl border-4 border-amber-100 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4">
          <h1 className="text-2xl font-black text-amber-800">구구단 챌린지</h1>
          <span className="font-bold text-amber-700">{challengeMode === 'answer-tap' ? '답 누르기' : '식 누르기'}</span>
        </div>
        <p className="mt-8 text-center font-bold text-slate-500">{currentIndex + 1} / {questions.length} 문제</p>
        <h2 className="my-8 text-center text-5xl font-black text-slate-800">{question.prompt}</h2>
        <div className="grid grid-cols-2 gap-3" aria-label="챌린지 답 선택지">
          {question.choices.map((choice) => <button key={choice} type="button" onClick={() => choose(choice)}
            className="min-h-20 rounded-2xl border-2 border-amber-100 bg-amber-50 p-4 text-xl font-black text-slate-800 hover:border-amber-400 hover:bg-amber-100">
            {choice}
          </button>)}
        </div>
      </main>
    </div>
  );
}
