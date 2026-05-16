import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Mic, Square, ChevronDown } from 'lucide-react';

export default function PracticeScreen() {
  const { userName, selectedTable, mode, expectedQuestions, setScreen, setEvaluationResult, setTotalTime } = useStore();
  const [time, setTime] = useState(0);
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
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setTime((prev) => prev + 10); // 10ms
      }, 10);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
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

      mediaRecorder.start();
      setTime(0);
      setIsRecording(true);
    } catch (err) {
      alert("마이크 권한을 허용해주세요!");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const uploadAudio = async (blob: Blob) => {
    setScreen('loading');
    const formData = new FormData();
    formData.append('audio', blob, 'recording.webm');
    formData.append('table', String(selectedTable));
    formData.append('mode', mode);
    formData.append('expectedAnswers', JSON.stringify(expectedQuestions));
    formData.append('userName', userName);
    formData.append('totalTime', String(time));

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiUrl}/api/evaluate`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setEvaluationResult(data);
      setTotalTime(time);
      setScreen('result');
    } catch (error) {
      console.error(error);
      alert('채점 중 오류가 발생했습니다.');
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
