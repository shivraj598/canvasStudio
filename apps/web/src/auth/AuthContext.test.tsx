import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ApiError, tokenStore } from '../lib/api';
import { createFakeApi, renderWithProviders, testUser } from '../test/utils';
import { useAuth } from './AuthContext';

function Probe() {
  const { state, signInWithDev, signOut } = useAuth();
  return (
    <>
      <p>
        status:{state.status} user:{state.user?.name ?? '-'}
      </p>
      <button onClick={() => signInWithDev({ email: testUser.email, name: 'Asha' })}>
        sign in
      </button>
      <button onClick={() => signOut()}>sign out</button>
    </>
  );
}

describe('AuthProvider', () => {
  it('starts anonymous without a stored token', () => {
    const api = createFakeApi();
    renderWithProviders(<Probe />, { api });
    expect(screen.getByText('status:anonymous user:-')).toBeInTheDocument();
    expect(api.me).not.toHaveBeenCalled();
  });

  it('restores the session from a stored token', async () => {
    renderWithProviders(<Probe />, { signedIn: true });
    expect(screen.getByText(/status:loading/)).toBeInTheDocument();
    expect(await screen.findByText('status:authenticated user:Asha')).toBeInTheDocument();
  });

  it('drops an invalid stored token', async () => {
    const api = createFakeApi({
      me: async () => {
        throw new ApiError(401, 'UNAUTHORIZED', 'nope');
      },
    });
    renderWithProviders(<Probe />, { api, signedIn: true });
    expect(await screen.findByText('status:anonymous user:-')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });

  it('signs in with dev login and stores the token', async () => {
    const api = createFakeApi({ devLogin: async () => ({ token: 'new-token', user: testUser }) });
    renderWithProviders(<Probe />, { api });
    await userEvent.click(screen.getByRole('button', { name: 'sign in' }));
    expect(await screen.findByText('status:authenticated user:Asha')).toBeInTheDocument();
    expect(tokenStore.get()).toBe('new-token');
  });

  it('signs out locally even if the server call fails', async () => {
    const api = createFakeApi({
      logout: async () => {
        throw new Error('offline');
      },
    });
    renderWithProviders(<Probe />, { api, signedIn: true });
    await screen.findByText(/authenticated/);
    await userEvent.click(screen.getByRole('button', { name: 'sign out' }));
    expect(await screen.findByText('status:anonymous user:-')).toBeInTheDocument();
    expect(tokenStore.get()).toBeNull();
  });
});
