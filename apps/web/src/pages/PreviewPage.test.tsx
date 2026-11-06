import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/api';
import { createFakeApi, makeProject, renderWithProviders } from '../test/utils';
import { PreviewPage } from './PreviewPage';

const HTML = '<!doctype html><h1>Sunrise Dental</h1>';

function renderPreview(
  api = createFakeApi({
    getProject: async () => makeProject({ id: 'p1', status: 'generated' }),
    previewHtml: async () => HTML,
  }),
) {
  renderWithProviders(
    <Routes>
      <Route path="/projects/:id/preview" element={<PreviewPage />} />
    </Routes>,
    { api, route: '/projects/p1/preview', signedIn: true },
  );
  return api;
}

describe('PreviewPage', () => {
  it('renders the generated site in a sandboxed iframe', async () => {
    const api = renderPreview();
    const frame = await screen.findByTitle('Preview of Sunrise Dental');
    expect(frame).toHaveAttribute('srcdoc', HTML);
    const sandbox = frame.getAttribute('sandbox')!;
    expect(sandbox).not.toContain('allow-scripts');
    expect(sandbox).not.toContain('allow-same-origin');
    expect(api.previewHtml).toHaveBeenCalledWith('p1');
  });

  it('switches between device sizes', async () => {
    renderPreview();
    const frame = await screen.findByTitle('Preview of Sunrise Dental');
    expect(screen.getByRole('button', { name: 'Desktop' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Mobile' }));
    expect(frame).toHaveStyle({ width: '390px' });
    expect(screen.getByRole('button', { name: 'Mobile' })).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('button', { name: 'Tablet' }));
    expect(frame).toHaveStyle({ width: '768px' });
  });

  it('links back to the builder and keeps publishing disabled for now', async () => {
    renderPreview();
    expect(await screen.findByRole('link', { name: 'Edit answers' })).toHaveAttribute(
      'href',
      '/projects/p1/build',
    );
    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
  });

  it('explains when the site has not been generated yet', async () => {
    renderPreview(
      createFakeApi({
        getProject: async () => makeProject({ id: 'p1' }),
        previewHtml: async () => {
          throw new ApiError(404, 'NOT_FOUND', 'This site has not been generated yet');
        },
      }),
    );
    expect(await screen.findByText('This site has not been generated yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to the builder' })).toHaveAttribute(
      'href',
      '/projects/p1/build',
    );
  });
});
