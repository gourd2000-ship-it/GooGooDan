import { useState } from 'react';
import GoogleAdminSignIn from '../components/GoogleAdminSignIn';
import { getGoogleSubject } from '../lib/googleIdentity';
import AdminStudentsScreen from './AdminStudentsScreen';
import AdminDashboardScreen from './AdminDashboardScreen';

const ADMIN_ID_TOKEN_STORAGE_KEY = 'admin-id-token';

function readStoredIdToken() {
  try {
    return sessionStorage.getItem(ADMIN_ID_TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function AdminPortal() {
  const [idToken, setIdToken] = useState<string | null>(readStoredIdToken);
  const [page, setPage] = useState<'students' | 'dashboard'>('students');
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '';
  const signIn = (token: string) => {
    sessionStorage.setItem(ADMIN_ID_TOKEN_STORAGE_KEY, token);
    setIdToken(token);
  };
  const signOut = () => {
    sessionStorage.removeItem(ADMIN_ID_TOKEN_STORAGE_KEY);
    setIdToken(null);
  };
  if (!idToken) return <GoogleAdminSignIn clientId={clientId} onCredential={signIn} />;
  if (page === 'dashboard') return <AdminDashboardScreen idToken={idToken} onStudents={() => setPage('students')} onSignOut={signOut} />;
  return <AdminStudentsScreen idToken={idToken} googleSubject={getGoogleSubject(idToken)} onDashboard={() => setPage('dashboard')} onSignOut={signOut} />;
}
