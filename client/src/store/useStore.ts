import { create } from 'zustand';
import type { PracticeOrder, PracticeType, TapGameMode, TapQuestion } from '../lib/practice';
import { changeStudentAccessCode, loginStudent, logoutStudent, restoreStudentSession, type ChangeAccessCodeInput, type StudentLoginInput, type StudentSession } from '../lib/auth';
import { API_URL } from '../config';
import { pushScreenHistory, replaceScreenHistory } from '../lib/screenHistory';

export type ScreenType = 'name' | 'home' | 'practice' | 'tapPractice' | 'loading' | 'result' | 'ranking' | 'profile';

export interface EvaluationItem {
  question: string;
  expected: string;
  spoken: string;
  isCorrect: boolean;
}

export interface EvaluationResult {
  results: EvaluationItem[];
  totalCorrect: number;
  feedback: string;
}

export interface TapEvaluationItem {
  question: string;
  expected: string;
  selected: string;
  isCorrect: boolean;
}

export interface TapEvaluationResult {
  results: TapEvaluationItem[];
  totalCorrect: number;
  feedback: string;
}

export type TapRecordStatus = 'idle' | 'saving' | 'saved' | 'error';
export type SessionStatus = 'restoring' | 'authenticated' | 'anonymous';

interface AppState {
  currentScreen: ScreenType;
  userName: string;
  student: StudentSession | null;
  sessionStatus: SessionStatus;
  hasVoiceConsent: boolean;
  practiceType: PracticeType;
  tapGameMode: TapGameMode;
  speechTable: number;
  speechMode: PracticeOrder;
  tapTable: number;
  tapMode: PracticeOrder;
  selectedTable: number;
  mode: PracticeOrder;
  expectedQuestions: string[];
  tapQuestions: TapQuestion[];
  evaluationResult: EvaluationResult | null;
  tapEvaluationResult: TapEvaluationResult | null;
  tapRecordStatus: TapRecordStatus;
  totalTime: number;
  setScreen: (screen: ScreenType) => void;
  setUserName: (name: string) => void;
  login: (input: StudentLoginInput) => Promise<void>;
  changeAccessCode: (input: ChangeAccessCodeInput) => Promise<void>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  setVoiceConsent: (hasConsent: boolean) => void;
  setPracticeType: (type: PracticeType) => void;
  setTapGameMode: (mode: TapGameMode) => void;
  setSpeechTable: (table: number) => void;
  setSpeechMode: (mode: PracticeOrder) => void;
  setTapTable: (table: number) => void;
  setTapMode: (mode: PracticeOrder) => void;
  setSelectedTable: (table: number) => void;
  setMode: (mode: PracticeOrder) => void;
  setExpectedQuestions: (questions: string[]) => void;
  setTapQuestions: (questions: TapQuestion[]) => void;
  setEvaluationResult: (result: EvaluationResult | null) => void;
  setTapEvaluationResult: (result: TapEvaluationResult | null) => void;
  setTapRecordStatus: (status: TapRecordStatus) => void;
  setTotalTime: (time: number) => void;
  resetApp: () => void;
}

export const useStore = create<AppState>((set) => ({
  currentScreen: 'name',
  userName: '',
  student: null,
  sessionStatus: 'restoring',
  hasVoiceConsent: false,
  practiceType: 'speech',
  tapGameMode: 'answer',
  speechTable: 2,
  speechMode: 'sequential',
  tapTable: 2,
  tapMode: 'sequential',
  selectedTable: 2,
  mode: 'sequential',
  expectedQuestions: [],
  tapQuestions: [],
  evaluationResult: null,
  tapEvaluationResult: null,
  tapRecordStatus: 'idle',
  totalTime: 0,
  setScreen: (screen) => {
    pushScreenHistory(screen);
    set({ currentScreen: screen });
  },
  setUserName: (userName) => set({ userName }),
  login: async (input) => {
    const student = await loginStudent(API_URL, input);
    replaceScreenHistory('home');
    set({ student, userName: student.studentName, sessionStatus: 'authenticated', currentScreen: 'home' });
  },
  changeAccessCode: async (input) => changeStudentAccessCode(API_URL, input),
  restoreSession: async () => {
    try {
      const student = await restoreStudentSession(API_URL);
      replaceScreenHistory('home');
      set({ student, userName: student.studentName, sessionStatus: 'authenticated', currentScreen: 'home' });
    } catch {
      replaceScreenHistory('name');
      set({ student: null, userName: '', sessionStatus: 'anonymous', currentScreen: 'name' });
    }
  },
  logout: async () => {
    try {
      await logoutStudent(API_URL);
    } finally {
      replaceScreenHistory('name');
      set({
        currentScreen: 'name', userName: '', student: null, sessionStatus: 'anonymous',
        practiceType: 'speech', tapGameMode: 'answer', speechTable: 2, speechMode: 'sequential',
        tapTable: 2, tapMode: 'sequential', selectedTable: 2, mode: 'sequential',
        expectedQuestions: [], tapQuestions: [], evaluationResult: null, tapEvaluationResult: null,
        tapRecordStatus: 'idle', totalTime: 0,
      });
    }
  },
  setVoiceConsent: (hasVoiceConsent) => set({ hasVoiceConsent }),
  setPracticeType: (practiceType) => set({ practiceType }),
  setTapGameMode: (tapGameMode) => set({ tapGameMode }),
  setSpeechTable: (speechTable) => set({ speechTable }),
  setSpeechMode: (speechMode) => set({ speechMode }),
  setTapTable: (tapTable) => set({ tapTable }),
  setTapMode: (tapMode) => set({ tapMode }),
  setSelectedTable: (selectedTable) => set({ selectedTable }),
  setMode: (mode) => set({ mode }),
  setExpectedQuestions: (expectedQuestions) => set({ expectedQuestions }),
  setTapQuestions: (tapQuestions) => set({ tapQuestions }),
  setEvaluationResult: (evaluationResult) => set({ evaluationResult }),
  setTapEvaluationResult: (tapEvaluationResult) => set({ tapEvaluationResult }),
  setTapRecordStatus: (tapRecordStatus) => set({ tapRecordStatus }),
  setTotalTime: (totalTime) => set({ totalTime }),
  resetApp: () => set((state) => ({
    currentScreen: state.userName ? 'home' : 'name',
    practiceType: 'speech',
    tapGameMode: 'answer',
    speechTable: 2,
    speechMode: 'sequential',
    tapTable: 2,
    tapMode: 'sequential',
    selectedTable: 2,
    mode: 'sequential',
    expectedQuestions: [],
    tapQuestions: [],
    evaluationResult: null,
    tapEvaluationResult: null,
    tapRecordStatus: 'idle',
    totalTime: 0,
  })),
}));
