import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { tokenStore } from '../lib/api';
import { createFakeApi, renderWithProviders } from '../test/utils';
import { AppLayout } from './AppLayout';

describe('AppLayout', () => {
  it('shows the user and signs out to the landing page', async () => {
    const api = createFakeApi({ logout: async () => undefined });
    renderWithProviders(
      <Routes>
        <Route path="/" element={<p>Landing</p>} />
        <Route element={<AppLayout />}>
          <Route path="/projects" element={<p>Projects</p>} />
        </Route>
      </Routes>,
      { api, route: '/projects', signedIn: true },
    );
    expect(await screen.findByText('Asha')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await screen.findByText('Landing')).toBeInTheDocument();
    expect(api.logout).toHaveBeenCalled();
    expect(tokenStore.get()).toBeNull();
  });
});
