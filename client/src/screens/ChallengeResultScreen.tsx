import { calculateChallengeStars } from '../lib/practice';
import { useStore } from '../store/useStore';

const gradeNames = ['', '다시 도전', '조금만 더', '실력 쑥쑥', '챌린지 달인', '구구단 마스터'];

export default function ChallengeResultScreen() {
  const {
    challengeMode, challengeQuestions, challengeEvaluationResult, totalTime,
    setChallengeQuestions, setChallengeEvaluationResult, setScreen,
  } = useStore();
  const results = challengeEvaluationResult?.results ?? [];
  const totalCorrect = challengeEvaluationResult?.totalCorrect ?? 0;
  const stars = calculateChallengeStars(totalCorrect, results.length);
  const starText = `${'★'.repeat(stars)}${'☆'.repeat(5 - stars)}`;
  const incorrectQuestions = results.filter((result) => !result.isCorrect)
    .map((result) => challengeQuestions.find((question) => question.expression === result.question))
    .filter((question): question is NonNullable<typeof question> => Boolean(question));

  const retryIncorrect = () => {
    setChallengeQuestions(incorrectQuestions);
    setChallengeEvaluationResult(null);
    setScreen(challengeMode?.endsWith('tap') ? 'challengeTap' : 'challengeSpeech');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <main className="w-full max-w-2xl rounded-3xl border-4 border-green-100 bg-white p-6 text-center shadow-xl sm:p-8">
        <h1 className="text-4xl font-black text-green-600">챌린지 결과</h1>
        <p className="mt-3 text-lg font-bold text-slate-600">{challengeEvaluationResult?.feedback ?? '결과를 확인해요.'}</p>
        <p className="mt-8 text-5xl tracking-wide text-amber-500" aria-label={`${stars}개 별`}>{starText}</p>
        <p className="mt-2 text-xl font-black text-amber-700">{gradeNames[stars]}</p>
        <div className="mt-8 grid grid-cols-2 gap-4 text-center">
          <div className="rounded-2xl bg-slate-50 p-4"><p className="font-bold text-slate-500">정답</p><p className="text-3xl font-black text-green-600">{totalCorrect} / {results.length}</p></div>
          <div className="rounded-2xl bg-slate-50 p-4"><p className="font-bold text-slate-500">걸린 시간</p><p className="text-3xl font-black text-slate-800">{(totalTime / 1000).toFixed(2)}초</p></div>
        </div>
        <div className="mt-8 space-y-2 text-left">
          {results.map((result) => <div key={result.question} className={`flex justify-between rounded-xl border-2 p-3 font-bold ${result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
            <span>{result.question}</span><span>{result.isCorrect ? 'O' : `X (정답 ${result.expected})`}</span>
          </div>)}
        </div>
        {incorrectQuestions.length > 0 && <button type="button" onClick={retryIncorrect} className="mt-8 w-full rounded-2xl bg-amber-600 py-4 text-xl font-black text-white hover:bg-amber-700">틀린 문제 다시 풀기</button>}
        <button type="button" onClick={() => setScreen('home')} className="mt-3 w-full rounded-2xl bg-blue-600 py-4 text-xl font-black text-white hover:bg-blue-700">홈으로 돌아가기</button>
      </main>
    </div>
  );
}
