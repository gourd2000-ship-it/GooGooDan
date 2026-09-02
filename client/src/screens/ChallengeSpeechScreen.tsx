import { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';
import { API_URL } from '../config';
import { saveChallengeRecord } from '../lib/challengeRanking';
import { calculateChallengeStars } from '../lib/practice';
import { useStore } from '../store/useStore';

const MAX_RECORDING_DURATION_MS = 60_000;

function audioFilename(mimeType: string) {
  if (mimeType.includes('mp4')) return 'challenge.m4a';
  if (mimeType.includes('ogg')) return 'challenge.ogg';
  return 'challenge.webm';
}

export default function ChallengeSpeechScreen() {
  const {
    challengeMode, challengeQuestionCount, challengeQuestions, setChallengeEvaluationResult,
    setScreen, setTotalTime, setTimeLimitReached, setChallengeRecordPayload, setChallengeRecordStatus,
  } = useStore();
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!recording) return;
    const interval = setInterval(() => setElapsed(Math.min(Date.now() - startedAt.current, MAX_RECORDING_DURATION_MS)), 100);
    const timeout = setTimeout(() => stopRecording(true), MAX_RECORDING_DURATION_MS);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [recording]);

  if (!challengeMode?.endsWith('speech') || challengeQuestions.length === 0) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><button type="button" onClick={() => setScreen('home')} className="rounded-xl bg-blue-600 px-5 py-3 font-bold text-white">홈으로 돌아가기</button></div>;
  }

  const upload = async (blob: Blob, totalTime: number) => {
    const formData = new FormData();
    formData.append('audio', blob, audioFilename(blob.type));
    formData.append('practiceKind', 'challenge');
    formData.append('challengeMode', challengeMode);
    formData.append('expectedAnswers', JSON.stringify(challengeQuestions.map((question) => question.expression)));
    formData.append('totalTime', String(totalTime));
    try {
      const response = await fetch(`${API_URL}/api/evaluate`, { method: 'POST', body: formData, credentials: 'include' });
      const data = await response.json() as { results?: Array<{ question: string; expected: string; spoken: string; isCorrect: boolean }>; totalCorrect?: number; feedback?: string; error?: string };
      if (!response.ok || !Array.isArray(data.results) || typeof data.totalCorrect !== 'number') throw new Error(data.error || '채점 결과를 받을 수 없어요.');
      setChallengeEvaluationResult({
        results: data.results.map((result) => ({ ...result, selected: result.spoken })),
        totalCorrect: data.totalCorrect,
        feedback: data.feedback || '결과를 확인해요.',
      });
      if (challengeQuestions.length === challengeQuestionCount) {
        const record = {
          questionCount: challengeQuestionCount,
          challengeMode,
          totalCorrect: data.totalCorrect,
          totalTime,
          starCount: calculateChallengeStars(data.totalCorrect, challengeQuestions.length),
        };
        setChallengeRecordPayload(record);
        setChallengeRecordStatus('saving');
        void saveChallengeRecord(API_URL, record).then(
          () => setChallengeRecordStatus('saved'),
          () => setChallengeRecordStatus('error'),
        );
      }
      setScreen('challengeResult');
    } catch {
      setScreen('challengeSpeech');
    }
  };

  const stopRecording = (reachedTimeLimit = false) => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    const totalTime = Math.min(Date.now() - startedAt.current, MAX_RECORDING_DURATION_MS);
    setElapsed(totalTime);
    setTotalTime(totalTime);
    setTimeLimitReached(reachedTimeLimit);
    setRecording(false);
    setScreen('loading');
    recorder.stop();
    recorder.stream.getTracks().forEach((track) => track.stop());
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size > 0) chunksRef.current.push(event.data); };
      recorder.onstop = () => void upload(new Blob(chunksRef.current, { type: recorder.mimeType }), Math.min(Date.now() - startedAt.current, MAX_RECORDING_DURATION_MS));
      startedAt.current = Date.now();
      setElapsed(0);
      setTimeLimitReached(false);
      recorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const isExpressionMode = challengeMode === 'expression-speech';
  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 p-4">
      <main className="mt-8 w-full max-w-2xl rounded-3xl border-4 border-amber-100 bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between rounded-2xl bg-amber-50 p-4"><h1 className="text-2xl font-black text-amber-800">구구단 챌린지 · {isExpressionMode ? '식 말하기' : '답 말하기'}</h1><span className="font-mono text-xl font-bold text-amber-700">{(elapsed / 1000).toFixed(2)}초</span></div>
        <p className="my-5 text-center font-bold text-slate-500">아래 문제를 순서대로 말해 주세요.</p>
        <div className="space-y-2">
          {challengeQuestions.map((question, index) => <div key={question.expression} className="rounded-xl border-2 border-slate-100 p-3 text-center text-2xl font-black text-slate-800">{index + 1}. {isExpressionMode ? `${question.answer} = ?` : `${question.expression} = ?`}</div>)}
        </div>
        <div className="mt-8 flex justify-center"><button type="button" onClick={recording ? () => stopRecording() : startRecording} className={`rounded-full px-8 py-5 text-xl font-black text-white ${recording ? 'bg-slate-800 hover:bg-slate-900' : 'bg-red-500 hover:bg-red-600'}`}>{recording ? <><Square className="mr-2 inline" fill="currentColor" />말하기 끝내기</> : <><Mic className="mr-2 inline" />말하기 시작</>}</button></div>
      </main>
    </div>
  );
}
