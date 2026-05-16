import { create } from 'zustand';

export type ScreenType = 'name' | 'home' | 'practice' | 'loading' | 'result' | 'ranking';

interface AppState {
  currentScreen: ScreenType;
  userName: string;
  selectedTable: number;
  mode: 'sequential' | 'random' | 'reverse';
  expectedQuestions: string[];
  evaluationResult: any | null;
  totalTime: number;
  
  // Actions
  setScreen: (screen: ScreenType) => void;
  setUserName: (name: string) => void;
  setSelectedTable: (table: number) => void;
  setMode: (mode: 'sequential' | 'random' | 'reverse') => void;
  setExpectedQuestions: (questions: string[]) => void;
  setEvaluationResult: (result: any) => void;
  setTotalTime: (time: number) => void;
  resetApp: () => void;
}

export const useStore = create<AppState>((set) => ({
  currentScreen: 'name',
  userName: '',
  selectedTable: 2,
  mode: 'sequential',
  expectedQuestions: [],
  evaluationResult: null,
  totalTime: 0,

  setScreen: (screen) => set({ currentScreen: screen }),
  setUserName: (name) => set({ userName: name }),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setMode: (mode) => set({ mode }),
  setExpectedQuestions: (questions) => set({ expectedQuestions: questions }),
  setEvaluationResult: (result) => set({ evaluationResult: result }),
  setTotalTime: (time) => set({ totalTime: time }),
  resetApp: () => set((state) => ({ 
    currentScreen: state.userName ? 'home' : 'name', 
    selectedTable: 2, 
    mode: 'sequential', 
    expectedQuestions: [], 
    evaluationResult: null,
    totalTime: 0
  })),
}));
