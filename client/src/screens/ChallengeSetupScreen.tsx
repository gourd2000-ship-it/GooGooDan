import { createChallengeQuestions, type ChallengeQuestionCount } from '../lib/practice';
import { useStore } from '../store/useStore';

const questionCounts: ChallengeQuestionCount[] = [20, 25, 30];

export default function ChallengeSetupScreen() {
  const {
    challengeMode, challengeQuestionCount, setChallengeQuestionCount,
    setChallengeQuestions, setScreen,
  } = useStore();

  if (!challengeMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <button type="button" onClick={() => setScreen('home')} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">홈으로 돌아가기</button>
      </div>
    );
  }

  const startChallenge = () => {
    setChallengeQuestions(createChallengeQuestions(challengeQuestionCount));
    setScreen(challengeMode.endsWith('tap') ? 'challengeTap' : 'challengeSpeech');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <main className="w-full max-w-xl rounded-3xl border-4 border-amber-100 bg-white p-6 text-center shadow-xl sm:p-8">
        <h1 className="text-3xl font-black text-amber-700">구구단 챌린지</h1>
        <p className="mt-2 font-bold text-slate-600">문제 수를 골라 주세요.</p>
        <div className="mt-8 grid grid-cols-3 gap-3">
          {questionCounts.map((count) => (
            <button key={count} type="button" aria-pressed={challengeQuestionCount === count} onClick={() => setChallengeQuestionCount(count)}
              className={`rounded-2xl py-5 text-xl font-black ${challengeQuestionCount === count ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'}`}>
              {count}개
            </button>
          ))}
        </div>
        <button type="button" onClick={startChallenge} className="mt-8 w-full rounded-2xl bg-amber-600 py-4 text-xl font-black text-white hover:bg-amber-700">
          챌린지 시작
        </button>
      </main>
    </div>
  );
}
