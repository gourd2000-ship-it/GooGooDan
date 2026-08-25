import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import type { EvaluationResult } from '../store/useStore';
import { Mic, Square, ChevronDown } from 'lucide-react';
import { API_URL } from '../config';

const getCurrentTime = () => Date.now();
const MAX_RECORDING_DURATION_MS = 60_000;
const PREFERRED_AUDIO_MIME_TYPES = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/webm', 'audio/ogg'];

function getPreferredAudioMimeType() {
  return PREFERRED_AUDIO_MIME_TYPES.find((mimeType) => MediaRecorder.isTypeSupported(mimeType));
}

function getAudioFilename(mimeType: string) {
  const mimeTypeWithoutCodecs = mimeType.split(';', 1)[0];
  const extensionByMimeType: Record<string, string> = {
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/mpeg': 'mp3',
    'audio/wav': 'wav',
  };
  return `recording.${extensionByMimeType[mimeTypeWithoutCodecs] || 'webm'}`;
}

function getApiErrorMessage(value: unknown, fallback: string) {
  if (value && typeof value === 'object' && 'error' in value && typeof value.error === 'string') {
    return value.error;
  }
  return fallback;
}

function isEvaluationResult(value: unknown): value is EvaluationResult {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EvaluationResult>;
  return Array.isArray(candidate.results)
    && typeof candidate.totalCorrect === 'number'
    && typeof candidate.feedback === 'string';
}

export default function PracticeScreen() {
  const { userName, selectedTable, mode, expectedQuestions, setScreen, setEvaluationResult, setTotalTime, setTimeLimitReached } = useStore();
  const [time, setTime] = useState(0);
  const timeRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    const checkScroll = () => {
      const isScrollable = document.documentElement.scrollHeight > window.innerHeight;
      const scrolledToBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 100;
      setShowScrollHint(isScrollable && !scrolledToBottom);
    };
    checkScroll();
    setTimeout(checkScroll, 300);
    window.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      window.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (isRecording) {
      timer = setInterval(() => {
        const elapsed = Math.min(getCurrentTime() - startTimeRef.current, MAX_RECORDING_DURATION_MS);
        timeRef.current = elapsed;
        setTime(elapsed);
      }, 100);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRecording]);

  const stopRecording = useCallback((reachedTimeLimit = false) => {
    setIsRecording(false);
    if (startTimeRef.current > 0) {
      const finalTime = Math.min(getCurrentTime() - startTimeRef.current, MAX_RECORDING_DURATION_MS);
      timeRef.current = finalTime;
      setTime(finalTime);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      setTimeLimitReached(reachedTimeLimit);
      setScreen('loading');
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }, [setScreen, setTimeLimitReached]);

  useEffect(() => {
    if (!isRecording) return;

    const remainingDuration = Math.max(
      0,
      MAX_RECORDING_DURATION_MS - (getCurrentTime() - startTimeRef.current),
    );
    const timeout = setTimeout(() => stopRecording(true), remainingDuration);

    return () => clearTimeout(timeout);
  }, [isRecording, stopRecording]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const preferredAudioMimeType = getPreferredAudioMimeType();
      const mediaRecorder = preferredAudioMimeType
        ? new MediaRecorder(stream, { mimeType: preferredAudioMimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        console.log('녹음 완료, 파일 크기:', audioBlob.size, '형식:', mediaRecorder.mimeType);
        await uploadAudio(audioBlob);
      };

      startTimeRef.current = getCurrentTime();
      timeRef.current = 0;
      setTime(0);
      setTimeLimitReached(false);
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      alert("마이크 권한을 허용해주세요!");
    }
  };

  const handleStopRecording = () => {
    stopRecording();
  };

  const uploadAudio = async (blob: Blob) => {
    setScreen('loading');
    const finalElapsed = timeRef.current > 0 ? timeRef.current : time;

    const formData = new FormData();
    formData.append('audio', blob, getAudioFilename(blob.type));
    formData.append('table', String(selectedTable));
    formData.append('mode', mode);
    formData.append('expectedAnswers', JSON.stringify(expectedQuestions));
    formData.append('userName', userName);
    formData.append('totalTime', String(finalElapsed));

    console.log('🔊 채점 요청을 보낼 API 주소:', `${API_URL}/api/evaluate`);

    try {
      const res = await fetch(`${API_URL}/api/evaluate`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      const rawText = await res.text();
      let data: unknown;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = undefined;
      }

      if (!res.ok) {
        const errorDetail = getApiErrorMessage(data, rawText || `서버 응답 실패 (HTTP ${res.status})`);
        throw new Error(errorDetail);
      }
      if (!isEvaluationResult(data)) {
        throw new Error('채점 결과 형식이 올바르지 않습니다.');
      }
      
      setEvaluationResult(data);
      setTotalTime(finalElapsed);
      setScreen('result');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('❌ 채점 중 에러 발생:', error);
      alert(`채점 중 오류가 발생했습니다.\n상세 사유: ${errorMessage}`);
      setScreen('home');
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-2xl mt-8">
        <div className="flex justify-between items-center bg-white p-4 rounded-2xl shadow-sm mb-6 border-2 border-slate-100">
          <h2 className="text-2xl font-black text-slate-700">{selectedTable}단 연습 중!</h2>
          <div className="text-3xl font-bold text-blue-600 font-mono tracking-wider">
            {(time / 1000).toFixed(2)}초
          </div>
        </div>

        {/* 시작 버튼 및 녹음 상태 (상단) */}
        <div className="flex justify-center mb-8">
          {!isRecording ? (
            <button
              onClick={handleStartRecording}
              className="bg-red-500 hover:bg-red-600 text-white font-bold text-2xl py-4 px-10 rounded-full flex items-center gap-3 shadow-xl transition-transform hover:scale-105 animate-bounce"
            >
              <Mic size={28} />
              마이크 켜고 시작!
            </button>
          ) : (
            <div className="text-center text-red-500 font-bold text-xl animate-pulse bg-red-50 py-4 px-10 rounded-full flex items-center gap-2 border-2 border-red-200">
              <Mic size={28} />
              🔴 녹음 중... 문제를 순서대로 또박또박 읽어주세요!
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 mb-8 relative pb-4">
          {expectedQuestions.map((q, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm text-center border-2 border-slate-100">
              <span className="text-3xl font-black text-slate-800">{q} = ?</span>
            </div>
          ))}
          {showScrollHint && (
            <div className="fixed bottom-12 left-1/2 transform -translate-x-1/2 text-blue-500 animate-bounce bg-white/90 p-2 rounded-full shadow-lg z-50 border border-blue-100 pointer-events-none">
              <ChevronDown size={32} />
            </div>
          )}
        </div>

        {/* 종료 버튼 (하단) */}
        <div className="flex justify-center mt-8 mb-16">
          <button
            onClick={handleStopRecording}
            disabled={!isRecording}
            className={`font-bold text-2xl py-6 px-12 rounded-full flex items-center gap-3 shadow-xl transition-transform ${
              isRecording 
                ? 'bg-slate-800 hover:bg-slate-900 text-white hover:scale-105 cursor-pointer' 
                : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-70'
            }`}
          >
            <Square fill="currentColor" size={24} />
            다 말했어요! (완료)
          </button>
        </div>
      </div>
    </div>
  );
}
