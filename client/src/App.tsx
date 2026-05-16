import React from 'react';
import { useStore } from './store/useStore';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PracticeScreen from './screens/PracticeScreen';
import ResultScreen from './screens/ResultScreen';
import RankingScreen from './screens/RankingScreen';

function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="animate-spin text-5xl mb-6">🤔</div>
      <h2 className="text-2xl font-bold text-slate-700 animate-pulse">선생님이 채점하고 있어요...</h2>
    </div>
  );
}

function App() {
  const currentScreen = useStore((state) => state.currentScreen);

  return (
    <div className="w-full h-full font-sans">
      {currentScreen === 'name' && <LoginScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'practice' && <PracticeScreen />}
      {currentScreen === 'loading' && <LoadingScreen />}
      {currentScreen === 'result' && <ResultScreen />}
      {currentScreen === 'ranking' && <RankingScreen />}
    </div>
  );
}

export default App;
