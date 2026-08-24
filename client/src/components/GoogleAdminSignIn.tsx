import { useEffect, useRef, useState } from 'react';

interface GoogleIdentityApi {
  accounts: { id: { initialize: (configuration: { client_id: string; callback: (response: { credential: string }) => void }) => void; renderButton: (parent: HTMLElement, configuration: Record<string, unknown>) => void } };
}

declare global { interface Window { google?: GoogleIdentityApi; } }

function loadGoogleIdentity(): Promise<GoogleIdentityApi> {
  if (window.google) return Promise.resolve(window.google);
  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-identity]') as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');
    const complete = () => window.google ? resolve(window.google) : reject(new Error('Google 로그인 라이브러리를 불러오지 못했어요.'));
    script.addEventListener('load', complete, { once: true });
    script.addEventListener('error', () => reject(new Error('Google 로그인 라이브러리를 불러오지 못했어요.')), { once: true });
    if (!existing) {
      script.src = 'https://accounts.google.com/gsi/client?hl=ko';
      script.async = true;
      script.dataset.googleIdentity = 'true';
      document.head.append(script);
    }
  });
}

interface Props { clientId: string; onCredential: (idToken: string) => void; }

export default function GoogleAdminSignIn({ clientId, onCredential }: Props) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState('');
  useEffect(() => { callbackRef.current = onCredential; }, [onCredential]);

  useEffect(() => {
    let active = true;
    if (!clientId) return;
    // Google GIS documents initialize() as a once-per-page setup followed by renderButton().
    // Source: https://developers.google.com/identity/gsi/web/reference/js-reference#method-google.accounts.id.initialize
    void loadGoogleIdentity().then((google) => {
      if (!active || !buttonRef.current) return;
      google.accounts.id.initialize({ client_id: clientId, callback: ({ credential }) => callbackRef.current(credential) });
      google.accounts.id.renderButton(buttonRef.current, { type: 'standard', theme: 'outline', size: 'large', text: 'signin_with', locale: 'ko', width: 320 });
    }).catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Google 로그인 라이브러리를 불러오지 못했어요.'); });
    return () => { active = false; };
  }, [clientId]);

  const configurationError = !clientId ? 'Google 관리자 로그인 설정이 필요합니다.' : error;
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><main className="w-full max-w-md rounded-3xl border-4 border-indigo-100 bg-white p-8 text-center shadow-xl"><h1 className="text-3xl font-black text-slate-800">관리자 로그인</h1><p className="mt-3 text-slate-500">학교 Google Workspace 계정으로 로그인해 주세요.</p><div ref={buttonRef} className="mt-6 flex justify-center" />{configurationError && <p role="alert" className="mt-4 font-bold text-red-600">{configurationError}</p>}</main></div>;
}
