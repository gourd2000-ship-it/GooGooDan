// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../components/GoogleAdminSignIn', () => ({ default: () => <div>관리자 로그인</div> }));
vi.mock('./AdminStudentsScreen', () => ({ default: ({ idToken }: { idToken: string }) => <div>학생 목록: {idToken}</div> }));
vi.mock('./AdminDashboardScreen', () => ({ default: () => <div>관리자 대시보드</div> }));

import AdminPortal from './AdminPortal';

describe('AdminPortal', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('restores the administrator session after a browser refresh', () => {
    sessionStorage.setItem('admin-id-token', 'saved-google-id-token');

    render(<AdminPortal />);

    expect(screen.getByText('학생 목록: saved-google-id-token')).toBeInTheDocument();
  });
});
