import { useState } from 'react';
import { useStore } from '../store/useStore';
import { UserCircle } from 'lucide-react';

export default function LoginScreen() {
  const { hasVoiceConsent, setVoiceConsent, login } = useStore();
  const [grade, setGrade] = useState('1');
  const [classNumber, setClassNumber] = useState('1');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (code = accessCode) => {
    if (!hasVoiceConsent) {
      setError('음성 채점 서비스 이용 동의가 필요해요.');
      return;
    }
    if (code.length !== 4 || isSubmitting) return;
    setIsSubmitting(true);
    setError('');
    try {
      await login({ grade: Number(grade), classNumber: Number(classNumber), accessCode: code });
    } catch {
      setAccessCode('');
      setError('학년, 반, 접속번호를 다시 확인해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addDigit = (digit: string) => {
    if (isSubmitting || accessCode.length >= 4) return;
    const next = `${accessCode}${digit}`;
    setAccessCode(next);
    setError('');
    if (next.length === 4) void submit(next);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md text-center border-4 border-amber-100">
        <p className="mb-4 text-3xl font-black text-amber-500">도전! 구구단</p>
        <div className="flex justify-center mb-6 text-amber-500">
          <UserCircle size={80} />
        </div>
        <h1 className="text-3xl font-black text-slate-800 mb-2">학년, 반, 접속번호를 입력해요</h1>
        <p className="text-slate-500 mb-6">접속번호는 네 자리 숫자예요.</p>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 text-left">
            <label className="font-bold text-slate-700">학년
              <select aria-label="학년" value={grade} onChange={(event) => setGrade(event.target.value)} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-xl">
                {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>{value}학년</option>)}
              </select>
            </label>
            <label className="font-bold text-slate-700">반
              <select aria-label="반" value={classNumber} onChange={(event) => setClassNumber(event.target.value)} className="mt-1 w-full rounded-xl border-2 border-slate-200 bg-white p-3 text-xl">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => <option key={value} value={value}>{value}반</option>)}
              </select>
            </label>
          </div>
          <p aria-label="접속번호 입력 상태" className="rounded-xl bg-slate-100 py-4 text-2xl font-black tracking-[0.35em] text-slate-700">{Array.from({ length: 4 }, (_, index) => index < accessCode.length ? '●' : '○').join(' ')}</p>
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => <button key={digit} type="button" aria-label={`${digit} 입력`} onClick={() => addDigit(String(digit))} className="rounded-xl bg-slate-100 py-4 text-2xl font-black text-slate-800 hover:bg-amber-100">{digit}</button>)}
            <button type="button" aria-label="접속번호 지우기" onClick={() => setAccessCode((code) => code.slice(0, -1))} className="col-span-2 rounded-xl bg-slate-200 py-4 font-bold text-slate-700">지우기</button>
          </div>
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-amber-100 bg-amber-50 p-4 text-left text-slate-700">
            <input
              type="checkbox"
              aria-label="말하는 구구단 음성 채점을 위한 AI서비스 전송을 동의합니다"
              checked={hasVoiceConsent}
              onChange={(event) => setVoiceConsent(event.target.checked)}
              className="mt-1 h-5 w-5 accent-amber-500"
            />
            <span className="font-bold">말하는 구구단 음성 채점을 위한 AI서비스 전송을 동의합니다</span>
          </label>
          {error && <p role="alert" className="font-bold text-red-600">{error}</p>}
          <button
            type="button"
            onClick={() => void submit()}
            disabled={accessCode.length !== 4 || !hasVoiceConsent || isSubmitting}
            className={`w-full font-bold text-2xl py-4 rounded-xl shadow-lg transition-transform ${
              accessCode.length === 4 && hasVoiceConsent && !isSubmitting
                ? 'bg-amber-500 hover:bg-amber-600 text-white hover:scale-105' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? '확인 중...' : '시작하기!'}
          </button>
        </div>
      </div>
    </div>
  );
}
