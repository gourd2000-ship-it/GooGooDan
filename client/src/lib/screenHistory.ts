export type StudentScreenHistory = 'name' | 'home' | 'practice' | 'tapPractice' | 'loading' | 'result' | 'ranking' | 'profile' | 'challengeSetup' | 'challengeTap' | 'challengeSpeech' | 'challengeResult';

const screens = new Set<StudentScreenHistory>(['name', 'home', 'practice', 'tapPractice', 'loading', 'result', 'ranking', 'profile', 'challengeSetup', 'challengeTap', 'challengeSpeech', 'challengeResult']);
const stateFor = (screen: StudentScreenHistory) => ({ studentScreen: screen });

export function readScreenHistory(value: unknown): StudentScreenHistory | null {
  if (!value || typeof value !== 'object' || !('studentScreen' in value)) return null;
  const screen = (value as { studentScreen?: unknown }).studentScreen;
  return typeof screen === 'string' && screens.has(screen as StudentScreenHistory) ? screen as StudentScreenHistory : null;
}

// History API entries use serializable state and a same-origin URL.
// Source: https://developer.mozilla.org/en-US/docs/Web/API/History_API/Working_with_the_History_API
export function replaceScreenHistory(screen: StudentScreenHistory) {
  window.history.replaceState(stateFor(screen), '', window.location.href);
}

export function pushScreenHistory(screen: StudentScreenHistory) {
  window.history.pushState(stateFor(screen), '', window.location.href);
}
