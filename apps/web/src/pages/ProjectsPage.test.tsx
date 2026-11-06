import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createFakeApi, makeProject, renderWithProviders } from '../test/utils';
import { ProjectsPage } from './ProjectsPage';

function Where() {
  const location = useLocation();
  return (
    <p data-testid="where">
      {location.pathname} {JSON.stringify(location.state)}
    </p>
  );
}

function renderPage(api = createFakeApi()) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects" element={<ProjectsPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { api, route: '/projects', signedIn: true },
  );
}

const draft = makeProject({
  id: 'p1',
  name: 'Sunrise Dental',
  completedSteps: ['brand', 'category'],
});
const built = makeProject({
  id: 'p2',
  name: 'Café Luna',
  status: 'generated',
  files: [{ path: 'index.html', content: '<h1>Café Luna</h1>' }],
  versions: [{ id: 'v1', number: 1, summary: 'A café', createdAt: '', files: [] }],
  currentVersionId: 'v1',
});

describe('ProjectsPage', () => {
  it('greets the user and shows an empty state', async () => {
    renderPage(createFakeApi({ listProjects: async () => [] }));
    expect(await screen.findByText('No websites yet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'What should we build, Asha?',
    );
  });

  it('lists projects with live thumbnails and the right links', async () => {
    renderPage(createFakeApi({ listProjects: async () => [draft, built] }));
    const items = await screen.findAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(within(items[0]!).getByText('Guided setup · 2/8')).toBeInTheDocument();
    expect(within(items[0]!).getByRole('link', { name: 'Open Sunrise Dental' })).toHaveAttribute(
      'href',
      '/projects/p1/build',
    );

    expect(within(items[1]!).getByText('v1')).toBeInTheDocument();
    expect(within(items[1]!).getByRole('link', { name: 'Open Café Luna' })).toHaveAttribute(
      'href',
      '/projects/p2',
    );
    expect(within(items[1]!).getByTitle('Thumbnail of Café Luna')).toHaveAttribute(
      'sandbox',
      expect.not.stringContaining('allow-same-origin'),
    );
  });

  it('creates a project from a prompt and opens the workspace', async () => {
    const api = createFakeApi({
      listProjects: async () => [],
      createProject: async () => makeProject({ id: 'new' }),
    });
    renderPage(api);
    await userEvent.type(
      await screen.findByLabelText('Describe the website you want to build'),
      'A tea shop{Enter}',
    );
    expect(await screen.findByTestId('where')).toHaveTextContent(
      '/projects/new {"autoPrompt":"A tea shop"}',
    );
    expect(api.createProject).toHaveBeenCalledWith({ prompt: 'A tea shop' });
  });

  it('can start the guided setup instead', async () => {
    const api = createFakeApi({
      listProjects: async () => [],
      createProject: async () => makeProject({ id: 'new' }),
    });
    renderPage(api);
    await userEvent.click(await screen.findByRole('button', { name: /guided setup/i }));
    expect(await screen.findByTestId('where')).toHaveTextContent('/projects/new/build');
  });

  it('deletes a project after confirmation', async () => {
    const api = createFakeApi({
      listProjects: async () => [draft, built],
      deleteProject: async () => undefined,
    });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage(api);
    await userEvent.click(
      await screen.findByRole('button', { name: 'Actions for Sunrise Dental' }),
    );
    await userEvent.click(await screen.findByRole('menuitem', { name: /delete/i }));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Sunrise Dental'));
    await waitFor(() => expect(screen.queryByText('Sunrise Dental')).not.toBeInTheDocument());
    expect(api.deleteProject).toHaveBeenCalledWith('p1');
  });

  it('shows load errors with a retry', async () => {
    let calls = 0;
    const api = createFakeApi({
      listProjects: async () => {
        calls += 1;
        if (calls === 1) throw new Error('Server unavailable');
        return [draft];
      },
    });
    renderPage(api);
    expect(await screen.findByText('Server unavailable')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Sunrise Dental')).toBeInTheDocument();
  });
});
