import { screen } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../test/utils';
import { RequireAuth } from './RequireAuth';

function LoginProbe() {
  const location = useLocation();
  return <p>Login (from {(location.state as { from: string }).from})</p>;
}

const routes = (
  <Routes>
    <Route path="/login" element={<LoginProbe />} />
    <Route element={<RequireAuth />}>
      <Route path="/projects" element={<p>Secret projects</p>} />
    </Route>
  </Routes>
);

describe('RequireAuth', () => {
  it('redirects anonymous users to login, remembering where they were going', () => {
    renderWithProviders(routes, { route: '/projects' });
    expect(screen.getByText('Login (from /projects)')).toBeInTheDocument();
    expect(screen.queryByText('Secret projects')).not.toBeInTheDocument();
  });

  it('shows a loading state, then the page, for signed-in users', async () => {
    renderWithProviders(routes, { route: '/projects', signedIn: true });
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    expect(await screen.findByText('Secret projects')).toBeInTheDocument();
  });
});
