import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('pitches the product and links to sign in', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /built from a conversation/i,
    );
    expect(screen.getByRole('link', { name: /start building/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /^sign in$/i })).toHaveAttribute('href', '/login');
  });

  it('shows who it is for and how it works', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Doctor / Clinic')).toBeInTheDocument();
    expect(screen.getByText('Restaurant / Café')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(9);
    expect(screen.getByRole('heading', { name: 'Answer a few questions' })).toBeInTheDocument();
  });
});
