import React from 'react';
import { useStore } from '../store/useStore';
import { Play, Trophy } from 'lucide-react';

export default function HomeScreen() {
  const { userName, selectedTable, setSelectedTable, mode, setMode, setScreen, setExpectedQuestions } = useStore();

  const handleStart = () => {
    // Generate questions
    const questions = [];
    let multipliers = [1,2,3,4,5,6,7,8,9];
    
    if (mode === 'reverse') {
      multipliers = [9,8,7,6,5,4,3,2,1];
    } else if (mode === 'random') {
      multipliers = [...multipliers].sort(() => Math.random() - 0.5);
    }
    
    for (let i = 0; i < 9; i++) {
      questions.push(`${selectedTable} x ${multipliers[i]}`);
    }

    setExpectedQuestions(questions);
    setScreen('practice');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 relative">
      {/* 상단 네비게이션 바 (환영 인사 & 명예의 전당) */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center max-w-2xl">
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border-2 border-slate-100">
          <span className="font-bold text-slate-700">{userName}</span>어린이 👋
        </div>
        <button
          onClick={() => setScreen('ranking')}
          className="flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-700 px-4 py-2 rounded-full font-bold shadow-sm transition-transform hover:scale-105 border-2 border-amber-200"
        >
          <Trophy size={18} />
          명예의 전당
        </button>
      </div>
      
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border-4 border-blue-100 mt-16">
        <h1 className="text-4xl font-black text-blue-600 mb-8 drop-shadow-sm">말하는 구구단!</h1>
        
        <div className="mb-8">
          <label className="block text-lg font-bold text-slate-700 mb-3">몇 단을 연습할까요?</label>
          <div className="grid grid-cols-4 gap-2">
            {[2,3,4,5,6,7,8,9].map((num) => (
              <button
                key={num}
                onClick={() => setSelectedTable(num)}
                className={`p-3 text-xl font-bold rounded-xl transition-all ${
                  selectedTable === num 
                    ? 'bg-blue-500 text-white shadow-md transform scale-105' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {num}단
              </button>
            ))}
          </div>
        </div>

        <div className="mb-10">
          <label className="block text-lg font-bold text-slate-700 mb-3">어떻게 연습할까요?</label>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setMode('sequential')}
              className={`flex-1 py-3 px-2 font-bold rounded-xl transition-all ${
                mode === 'sequential' ? 'bg-amber-400 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              순서대로
            </button>
            <button
              onClick={() => setMode('reverse')}
              className={`flex-1 py-3 px-2 font-bold rounded-xl transition-all ${
                mode === 'reverse' ? 'bg-amber-400 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              거꾸로
            </button>
            <button
              onClick={() => setMode('random')}
              className={`flex-1 py-3 px-2 font-bold rounded-xl transition-all ${
                mode === 'random' ? 'bg-amber-400 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              섞어서
            </button>
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleStart}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-2xl py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play fill="currentColor" size={28} />
            시작하기!
          </button>
        </div>
      </div>
    </div>
  );
}
