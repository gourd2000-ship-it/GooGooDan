
import { calculateScore } from '../lib/practice';
import { saveTapRecord } from '../lib/tapRecord';
import { API_URL } from '../config';
import { useStore } from '../store/useStore';
import { RotateCcw } from 'lucide-react';

export default function ResultScreen() {
  const {
    resetApp, evaluationResult, tapEvaluationResult, practiceType, totalTime, mode,
    userName, selectedTable, tapGameMode, tapRecordStatus, setTapRecordStatus,
  } = useStore();
  const isTapPractice = practiceType === 'tap';
  const results = isTapPractice
    ? (tapEvaluationResult?.results ?? []).map((result) => ({ question: result.question, selected: result.selected, isCorrect: result.isCorrect }))
    : (evaluationResult?.results ?? []).map((result) => ({ question: result.question, selected: result.spoken, isCorrect: result.isCorrect }));
  const correct = isTapPractice ? (tapEvaluationResult?.totalCorrect ?? 0) : (evaluationResult?.totalCorrect ?? 0);
  const score = calculateScore(correct, mode);
  const accuracy = Math.round((correct / 10) * 100);
  const feedback = isTapPractice ? (tapEvaluationResult?.feedback ?? '참 잘했어요!') : (evaluationResult?.feedback ?? '참 잘했어요!');

  const retrySave = () => {
    if (!tapEvaluationResult) return;
    setTapRecordStatus('saving');
    void saveTapRecord(API_URL, {
      table: selectedTable,
      mode,
      gameMode: tapGameMode,
      userName,
      totalCorrect: tapEvaluationResult.totalCorrect,
      totalTime,
    }).then(
      () => setTapRecordStatus('saved'),
      () => setTapRecordStatus('error'),
    );
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-2xl mt-8 bg-white p-8 rounded-3xl shadow-xl border-4 border-green-100">
        <h1 className="text-4xl font-black text-center text-green-600 mb-2">결과 확인</h1>
        <p className="text-center text-slate-500 mb-8 font-medium whitespace-pre-wrap">{feedback}</p>

        <div className="grid grid-cols-3 gap-4 mb-8 text-center">
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="text-slate-500 font-bold mb-1">소요 시간</div>
            <div className="text-3xl font-black text-slate-800 font-mono">{(totalTime / 1000).toFixed(2)}초</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="text-slate-500 font-bold mb-1">점수</div>
            <div className="text-3xl font-black text-blue-600">{score}점</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="text-slate-500 font-bold mb-1">정답률</div>
            <div className="text-3xl font-black text-green-600">{accuracy}%</div>
          </div>
        </div>

        <div className="space-y-3 mb-10">
          {results.map((res, idx) => (
            <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border-2 ${res.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <span className="text-xl font-bold text-slate-700">{res.question}</span>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">{isTapPractice ? '내가 고른 답' : '내가 한 말'}: <strong className="text-slate-700">{res.selected}</strong></span>
                {res.isCorrect ? (
                  <span className="text-2xl font-black text-green-500">O</span>
                ) : (
                  <span className="text-2xl font-black text-red-500">X</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {isTapPractice && tapRecordStatus !== 'idle' && (
          <div className={`mb-6 rounded-xl p-4 text-center font-bold ${tapRecordStatus === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
            {tapRecordStatus === 'saving' && '명예의 전당에 기록을 저장하고 있어요...'}
            {tapRecordStatus === 'saved' && '명예의 전당에 기록을 저장했어요!'}
            {tapRecordStatus === 'error' && (
              <>
                <p>기록을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
                <button type="button" onClick={retrySave} className="mt-3 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700">기록 저장 다시 시도</button>
              </>
            )}
          </div>
        )}

        <button
          onClick={resetApp}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xl py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02]"
        >
          <RotateCcw size={24} />
          처음으로 돌아가기
        </button>
      </div>
    </div>
  );
}
