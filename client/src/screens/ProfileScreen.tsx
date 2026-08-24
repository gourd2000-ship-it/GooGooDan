import { useState } from 'react';
import { useStore } from '../store/useStore';

export default function ProfileScreen() {
  const { student, changeAccessCode, logout, setScreen } = useStore();
  const [currentAccessCode, setCurrentAccessCode] = useState('');
  const [newAccessCode, setNewAccessCode] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!student) return null;

  const handleChange = async () => {
    if (!/^\d{4}$/.test(currentAccessCode) || !/^\d{4}$/.test(newAccessCode)) {
      setMessage('접속번호는 각각 네 자리 숫자로 입력해 주세요.');
      return;
    }
    setIsSaving(true);
    try {
      await changeAccessCode({ currentAccessCode, newAccessCode });
      setCurrentAccessCode('');
      setNewAccessCode('');
      setMessage('접속번호를 변경했어요.');
    } catch {
      setMessage('접속번호를 변경하지 못했어요. 현재 번호를 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
    <main className="w-full max-w-md rounded-3xl border-4 border-blue-100 bg-white p-8 shadow-xl">
      <h1 className="text-3xl font-black text-slate-800">내 정보</h1>
      <p className="mt-3 rounded-xl bg-blue-50 p-4 font-bold text-blue-800">{student.grade}학년 {student.classNumber}반 {student.studentName}</p>
      <div className="mt-6 space-y-4">
        <label className="block font-bold text-slate-700">현재 접속번호<input aria-label="현재 접속번호" type="password" inputMode="numeric" maxLength={4} value={currentAccessCode} onChange={(event) => setCurrentAccessCode(event.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-xl border-2 border-slate-200 p-3 text-xl" /></label>
        <label className="block font-bold text-slate-700">새 접속번호<input aria-label="새 접속번호" type="password" inputMode="numeric" maxLength={4} value={newAccessCode} onChange={(event) => setNewAccessCode(event.target.value.replace(/\D/g, ''))} className="mt-1 w-full rounded-xl border-2 border-slate-200 p-3 text-xl" /></label>
        {message && <p role="status" className="font-bold text-slate-600">{message}</p>}
        <button type="button" onClick={() => void handleChange()} disabled={isSaving} className="w-full rounded-xl bg-blue-600 py-3 text-xl font-bold text-white disabled:bg-slate-300">접속번호 변경</button>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button type="button" onClick={() => setScreen('home')} className="rounded-xl bg-slate-100 py-3 font-bold text-slate-700">홈으로</button>
        <button type="button" onClick={() => void logout()} className="rounded-xl bg-red-500 py-3 font-bold text-white">로그아웃</button>
      </div>
    </main>
  </div>;
}
