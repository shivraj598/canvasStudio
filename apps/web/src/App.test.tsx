import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { createFakeApi, renderWithProviders } from './test/utils';

describe('App routing', () => {
  it('renders the landing page at /', () => {
    renderWithProviders(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /build something wonderful/i,
    );
  });

  it('sends anonymous users from /projects to login', async () => {
    renderWithProviders(<App />, {
      api: createFakeApi({ providers: async () => [] }),
      route: '/projects',
    });
    expect(await screen.findByText('Welcome to Canvas Studio')).toBeInTheDocument();
  });

  it('shows projects for signed-in users', async () => {
    renderWithProviders(<App />, {
      api: createFakeApi({ listProjects: async () => [] }),
      route: '/projects',
      signedIn: true,
    });
    expect(await screen.findByRole('heading', { name: 'Your websites' })).toBeInTheDocument();
  });

  it('shows a 404 for unknown pages', () => {
    renderWithProviders(<App />, { route: '/nope' });
    expect(screen.getByText('Page not found')).toBeInTheDocument();
  });
});
