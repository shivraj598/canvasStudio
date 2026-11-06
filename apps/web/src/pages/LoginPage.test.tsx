import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/api';
import { createFakeApi, renderWithProviders, testUser } from '../test/utils';
import { LoginPage } from './LoginPage';

const PROVIDERS = [
  { id: 'google', label: 'Continue with Google', enabled: false },
  { id: 'github', label: 'Continue with GitHub', enabled: false },
  { id: 'dev', label: 'Developer sign-in', enabled: true },
] as const;

function renderLogin(
  api = createFakeApi({ providers: async () => [...PROVIDERS] }),
  state?: unknown,
) {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/projects" element={<p>Projects page</p>} />
      <Route path="/projects/abc/build" element={<p>Builder page</p>} />
    </Routes>,
    { api, route: state ? { pathname: '/login', state } : '/login' },
  );
}

describe('LoginPage', () => {
  it('shows Google and GitHub as coming soon until configured', async () => {
    renderLogin();
    const google = await screen.findByRole('button', { name: /continue with google/i });
    const github = screen.getByRole('button', { name: /continue with github/i });
    expect(google).toBeDisabled();
    expect(github).toBeDisabled();
    expect(google).toHaveTextContent(/coming soon/i);
  });

  it('enables configured providers', async () => {
    renderLogin(
      createFakeApi({
        providers: async () => [{ id: 'google', label: 'Continue with Google', enabled: true }],
      }),
    );
    expect(await screen.findByRole('button', { name: /continue with google/i })).toBeEnabled();
    expect(screen.queryByText(/developer sign-in/i)).not.toBeInTheDocument();
  });

  it('signs in with dev login and goes to projects', async () => {
    const api = createFakeApi({
      providers: async () => [...PROVIDERS],
      devLogin: async () => ({ token: 't', user: testUser }),
    });
    renderLogin(api);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Your name'), '  Asha ');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Projects page')).toBeInTheDocument();
    expect(api.devLogin).toHaveBeenCalledWith({ name: 'Asha', email: 'asha@example.com' });
  });

  it('returns to the page the user originally wanted', async () => {
    const api = createFakeApi({
      providers: async () => [...PROVIDERS],
      devLogin: async () => ({ token: 't', user: testUser }),
    });
    renderLogin(api, { from: '/projects/abc/build' });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Your name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Builder page')).toBeInTheDocument();
  });

  it('shows field errors from the server', async () => {
    const api = createFakeApi({
      providers: async () => [...PROVIDERS],
      devLogin: async () => {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
          fields: { email: 'Invalid email address' },
        });
      },
    });
    renderLogin(api);
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText('Your name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'nope');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('reports when sign-in options cannot load', async () => {
    renderLogin(
      createFakeApi({
        providers: async () => {
          throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach Canvas Studio.');
        },
      }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not reach Canvas Studio.');
  });

  it('redirects signed-in users straight to their projects', async () => {
    const api = createFakeApi({ providers: async () => [...PROVIDERS] });
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/projects" element={<p>Projects page</p>} />
      </Routes>,
      { api, route: '/login', signedIn: true },
    );
    await waitFor(() => expect(screen.getByText('Projects page')).toBeInTheDocument());
  });
});
