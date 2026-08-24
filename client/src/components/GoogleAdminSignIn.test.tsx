// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { StrictMode } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GoogleAdminSignIn from './GoogleAdminSignIn';

describe('GoogleAdminSignIn', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    document.querySelectorAll('script[data-google-identity]').forEach((script) => script.remove());
  });

  it('initializes the Google button once and passes the returned ID token to the administrator portal', async () => {
    const initialize = vi.fn();
    const renderButton = vi.fn();
    const onCredential = vi.fn();
    render(<StrictMode><GoogleAdminSignIn clientId="client-id.apps.googleusercontent.com" onCredential={onCredential} /></StrictMode>);
    const script = document.querySelector('script[data-google-identity]') as HTMLScriptElement;
    Object.assign(window, { google: { accounts: { id: { initialize, renderButton } } } });
    script.dispatchEvent(new Event('load'));

    await waitFor(() => expect(initialize).toHaveBeenCalledOnce());
    expect(renderButton).toHaveBeenCalledOnce();
    const options = initialize.mock.calls[0][0] as { callback: (response: { credential: string }) => void };
    options.callback({ credential: 'google-id-token' });
    expect(onCredential).toHaveBeenCalledWith('google-id-token');
  });
});
