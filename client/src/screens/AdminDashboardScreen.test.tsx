// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AdminDashboardScreen from './AdminDashboardScreen';

describe('AdminDashboardScreen', () => {
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it('renders the 2–9 table matrix with score color and higher-score emphasis', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ students: [{
      studentId: 'student-a', studentName: 'Kim', grade: 3, classNumber: 2,
      tables: { 2: { speech: { score: 100, isPerfect: true }, tap: { score: 80, isPerfect: false } } },
    }] }) }));
    render(<AdminDashboardScreen idToken="google-id-token" onStudents={() => {}} onSignOut={() => {}} />);

    expect(await screen.findByText('Kim')).toBeInTheDocument();
    const completed = screen.getByTestId('progress-student-a-table-2');
    expect(completed).toHaveClass('bg-green-100');
    expect(completed).toHaveTextContent('말 100점 ✓');
    expect(screen.getByText('말 100점 ✓')).toHaveClass('font-black');
    expect(screen.getByTestId('progress-student-a-table-3')).toHaveClass('bg-red-50');
    expect(screen.getByTestId('progress-student-a-table-3')).toHaveTextContent('기록 없음');
  });
});
