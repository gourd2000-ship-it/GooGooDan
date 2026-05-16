import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { UserCircle } from 'lucide-react';

export default function LoginScreen() {
  const { setUserName, setScreen } = useStore();
  const [inputValue, setInputValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      setUserName(inputValue.trim());
      setScreen('home');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border-4 border-amber-100">
        <div className="flex justify-center mb-6 text-amber-500">
          <UserCircle size={80} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">안녕! 내 이름은 뭘까?</h1>
        <p className="text-slate-500 mb-8">친구의 멋진 이름이나 별명을 적어주세요!</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="이름 입력하기..."
            className="w-full text-center text-2xl font-bold py-4 px-4 rounded-xl border-4 border-slate-100 focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all"
            autoFocus
            maxLength={10}
          />
          <button
            type="submit"
            disabled={!inputValue.trim()}
            className={`w-full font-bold text-2xl py-4 rounded-xl shadow-lg transition-transform ${
              inputValue.trim() 
                ? 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-105' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            시작하기!
          </button>
        </form>
      </div>
    </div>
  );
}
