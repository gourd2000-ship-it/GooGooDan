
import { useEffect } from 'react';
import { useStore } from './store/useStore';
import LoginScreen from './screens/LoginScreen';
import HomeScreen from './screens/HomeScreen';
import PracticeScreen from './screens/PracticeScreen';
import TapPracticeScreen from './screens/TapPracticeScreen';
import ResultScreen from './screens/ResultScreen';
import RankingScreen from './screens/RankingScreen';
import ProfileScreen from './screens/ProfileScreen';
import ChallengeSetupScreen from './screens/ChallengeSetupScreen';
import ChallengeTapScreen from './screens/ChallengeTapScreen';
import ChallengeResultScreen from './screens/ChallengeResultScreen';
import ChallengeSpeechScreen from './screens/ChallengeSpeechScreen';
import AdminPortal from './screens/AdminPortal';
import { readScreenHistory } from './lib/screenHistory';

function LoadingScreen({ timeLimitReached = false }: { timeLimitReached?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="animate-spin text-5xl mb-6">🤔</div>
      <h2 className="text-2xl font-bold text-slate-700 animate-pulse">선생님이 채점하고 있어요...</h2>
      {timeLimitReached && <p className="mt-3 text-lg font-bold text-amber-700">1분이 넘었어요. 아쉬워요!</p>}
    </div>
  );
}

function StudentApp() {
  const currentScreen = useStore((state) => state.currentScreen);
  const sessionStatus = useStore((state) => state.sessionStatus);
  const timeLimitReached = useStore((state) => state.timeLimitReached);
  const restoreSession = useStore((state) => state.restoreSession);

  useEffect(() => { void restoreSession(); }, [restoreSession]);
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const target = readScreenHistory(event.state);
      const state = useStore.getState();
      if (state.sessionStatus === 'authenticated' && target && target !== 'name') {
        useStore.setState({ currentScreen: target });
        return;
      }
      if (state.sessionStatus !== 'restoring') {
        useStore.getState().restoreSession().catch(() => undefined);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  if (sessionStatus === 'restoring') return <LoadingScreen />;

  return (
    <div className="w-full h-full font-sans">
      {currentScreen === 'name' && <LoginScreen />}
      {currentScreen === 'home' && <HomeScreen />}
      {currentScreen === 'practice' && <PracticeScreen />}
      {currentScreen === 'tapPractice' && <TapPracticeScreen />}
      {currentScreen === 'loading' && <LoadingScreen timeLimitReached={timeLimitReached} />}
      {currentScreen === 'result' && <ResultScreen />}
      {currentScreen === 'ranking' && <RankingScreen />}
      {currentScreen === 'profile' && <ProfileScreen />}
      {currentScreen === 'challengeSetup' && <ChallengeSetupScreen />}
      {currentScreen === 'challengeTap' && <ChallengeTapScreen />}
      {currentScreen === 'challengeResult' && <ChallengeResultScreen />}
      {currentScreen === 'challengeSpeech' && <ChallengeSpeechScreen />}
    </div>
  );
}

export default function App() {
  return window.location.pathname.startsWith('/admin') ? <AdminPortal /> : <StudentApp />;
}
