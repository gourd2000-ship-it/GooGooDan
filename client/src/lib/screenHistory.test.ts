// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { readScreenHistory, replaceScreenHistory, pushScreenHistory } from './screenHistory';

describe('student screen history', () => {
  it('stores a serializable screen state and restores it after browser navigation', () => {
    replaceScreenHistory('home');
    expect(readScreenHistory(window.history.state)).toBe('home');
    pushScreenHistory('ranking');
    expect(readScreenHistory(window.history.state)).toBe('ranking');
    pushScreenHistory('challengeSetup');
    expect(readScreenHistory(window.history.state)).toBe('challengeSetup');
  });

  it('rejects unrecognized browser history state', () => {
    expect(readScreenHistory({ studentScreen: 'admin' })).toBeNull();
    expect(readScreenHistory(null)).toBeNull();
  });
});
