import { useState } from 'react';
import GoogleAdminSignIn from '../components/GoogleAdminSignIn';
import { getGoogleSubject } from '../lib/googleIdentity';
import AdminStudentsScreen from './AdminStudentsScreen';
import AdminDashboardScreen from './AdminDashboardScreen';

export default function AdminPortal() {
  const [idToken, setIdToken] = useState<string | null>(null);
  const [page, setPage] = useState<'students' | 'dashboard'>('students');
  const clientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID ?? '';
  if (!idToken) return <GoogleAdminSignIn clientId={clientId} onCredential={(token) => setIdToken(token)} />;
  if (page === 'dashboard') return <AdminDashboardScreen idToken={idToken} onStudents={() => setPage('students')} onSignOut={() => setIdToken(null)} />;
  return <AdminStudentsScreen idToken={idToken} googleSubject={getGoogleSubject(idToken)} onDashboard={() => setPage('dashboard')} onSignOut={() => setIdToken(null)} />;
}
