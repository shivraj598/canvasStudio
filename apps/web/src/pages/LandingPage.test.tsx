import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it } from 'vitest';
import { createFakeApi, makeProject, renderWithProviders } from '../test/utils';
import { LandingPage } from './LandingPage';

function Where() {
  const location = useLocation();
  return (
    <p data-testid="where">
      {location.pathname} {JSON.stringify(location.state)}
    </p>
  );
}

function renderLanding(options: Parameters<typeof renderWithProviders>[1] = {}) {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    options,
  );
}

describe('LandingPage', () => {
  it('pitches the product with a prompt box and sign-in links', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /build something wonderful/i,
    );
    expect(screen.getByLabelText('Describe the website you want to build')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('heading', { name: 'Refine by chatting' })).toBeInTheDocument();
  });

  it('fills the prompt from an idea', async () => {
    renderLanding();
    await userEvent.click(screen.getAllByRole('button', { name: /dental clinic/i })[0]!);
    const box = screen.getByLabelText('Describe the website you want to build');
    expect((box as HTMLTextAreaElement).value).toContain('Bright Smile');
  });

  it('sends anonymous visitors to sign in, keeping their prompt', async () => {
    renderLanding();
    await userEvent.type(
      screen.getByLabelText('Describe the website you want to build'),
      'A bakery in Lyon{Enter}',
    );
    expect(screen.getByTestId('where')).toHaveTextContent('/login {"from":"/new"}');
    expect(sessionStorage.getItem('canvas-studio.pending-prompt')).toBe('A bakery in Lyon');
  });

  it('creates a project and opens the workspace for signed-in users', async () => {
    const api = createFakeApi({ createProject: async () => makeProject({ id: 'p9' }) });
    renderLanding({ api, signedIn: true });
    await screen.findByRole('link', { name: 'Your projects' });
    await userEvent.type(
      screen.getByLabelText('Describe the website you want to build'),
      'A bakery in Lyon{Enter}',
    );
    await waitFor(() =>
      expect(screen.getByTestId('where')).toHaveTextContent(
        '/projects/p9 {"autoPrompt":"A bakery in Lyon"}',
      ),
    );
    expect(api.createProject).toHaveBeenCalledWith({ prompt: 'A bakery in Lyon' });
  });
});
