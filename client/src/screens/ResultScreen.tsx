import React from 'react';
import { useStore } from '../store/useStore';
import { RotateCcw } from 'lucide-react';

export default function ResultScreen() {
  const { resetApp, evaluationResult, totalTime } = useStore();

  const results = evaluationResult?.results || [];
  const score = Math.round(((evaluationResult?.totalCorrect || 0) / 9) * 100);
  const feedback = evaluationResult?.feedback || "참 잘했어요!";

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-2xl mt-8 bg-white p-8 rounded-3xl shadow-xl border-4 border-green-100">
        <h1 className="text-4xl font-black text-center text-green-600 mb-2">결과 확인</h1>
        <p className="text-center text-slate-500 mb-8 font-medium whitespace-pre-wrap">{feedback}</p>

        <div className="grid grid-cols-2 gap-4 mb-8 text-center">
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="text-slate-500 font-bold mb-1">소요 시간</div>
            <div className="text-3xl font-black text-slate-800 font-mono">{(totalTime / 1000).toFixed(2)}초</div>
          </div>
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-slate-100">
            <div className="text-slate-500 font-bold mb-1">점수</div>
            <div className="text-3xl font-black text-blue-600">{score}점</div>
          </div>
        </div>

        <div className="space-y-3 mb-10">
          {results.map((res: any, idx: number) => (
            <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border-2 ${res.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <span className="text-xl font-bold text-slate-700">{res.question}</span>
              <div className="flex items-center gap-4">
                <span className="text-slate-500">내가 한 말: <strong className="text-slate-700">{res.spoken}</strong></span>
                {res.isCorrect ? (
                  <span className="text-2xl font-black text-green-500">O</span>
                ) : (
                  <span className="text-2xl font-black text-red-500">X</span>
                )}
              </div>
            </div>
          ))}
        </div>

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
