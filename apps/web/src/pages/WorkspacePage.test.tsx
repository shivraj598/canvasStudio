import type { BuildEvent, Project } from '@canvas/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { createFakeApi, makeProject, renderWithProviders } from '../test/utils';
import { WorkspacePage } from './WorkspacePage';

const at = '2026-01-01T00:00:00.000Z';

function renderWorkspace(api: ReturnType<typeof createFakeApi>, state?: unknown) {
  const project = makeProject();
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:id" element={<WorkspacePage />} />
    </Routes>,
    { api, signedIn: true, route: { pathname: `/projects/${project.id}`, state } },
  );
}

const built: Project = makeProject({
  name: 'Bright Smile',
  status: 'generated',
  files: [{ path: 'index.html', content: '<h1>Bright Smile</h1>' }],
  versions: [
    { id: 'v1', number: 1, summary: 'A dental clinic', createdAt: at, files: [] },
    {
      id: 'v2',
      number: 2,
      summary: 'Make it dark',
      createdAt: at,
      files: [{ path: 'index.html', content: '<h1>Dark</h1>' }],
    },
  ],
  currentVersionId: 'v2',
  messages: [
    { id: 'm1', role: 'user', content: 'A dental clinic', createdAt: at },
    {
      id: 'm2',
      role: 'assistant',
      content: "I'll build **Bright Smile**.",
      changes: [{ path: 'index.html', operation: 'create' }],
      versionId: 'v1',
      status: 'complete',
      createdAt: at,
    },
  ],
});

describe('WorkspacePage', () => {
  it('shows the conversation, versions and a live preview', async () => {
    const api = createFakeApi({
      getProject: async () => built,
      builderInfo: async () => ({ engine: { id: 'local', label: 'Canvas Local' } }),
    });
    renderWorkspace(api);

    expect(await screen.findByText('A dental clinic')).toBeInTheDocument();
    expect(screen.getByText('Bright Smile', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('1 file changed')).toBeInTheDocument();
    expect(screen.getByTitle('Preview of Bright Smile')).toHaveAttribute(
      'sandbox',
      expect.not.stringContaining('allow-same-origin'),
    );
    expect(await screen.findByText('Canvas Local')).toBeInTheDocument();
  });

  it('streams a reply into the chat and swaps in the saved project', async () => {
    const after = makeProject({
      ...built,
      messages: [
        ...built.messages,
        { id: 'm3', role: 'user', content: 'Add pricing', createdAt: at },
        {
          id: 'm4',
          role: 'assistant',
          content: 'Added pricing.',
          status: 'complete',
          createdAt: at,
        },
      ],
    });
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const api = createFakeApi({
      getProject: async () => built,
      streamChat: async (
        _id: string,
        _prompt: string,
        { onEvent }: { onEvent(e: BuildEvent<Project>): void },
      ) => {
        onEvent({
          type: 'start',
          userMessage: { id: 'm3', role: 'user', content: 'Add pricing', createdAt: at },
          assistantMessageId: 'm4',
          engine: { id: 'local', label: 'Canvas Local' },
        });
        onEvent({ type: 'text', delta: 'Adding a pricing section' });
        onEvent({ type: 'file_start', path: 'index.html', operation: 'update' });
        await gate;
        onEvent({ type: 'file_end', path: 'index.html' });
        onEvent({ type: 'done', project: after });
      },
    });
    renderWorkspace(api);
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText('Message Canvas'), 'Add pricing{Enter}');
    expect(api.streamChat).toHaveBeenCalledWith(built.id, 'Add pricing', expect.anything());
    expect(await screen.findByText('Adding a pricing section')).toBeInTheDocument();
    expect(screen.getByText('Writing files…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stop generating' })).toBeInTheDocument();

    release();
    expect(await screen.findByText('Added pricing.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Stop generating' })).not.toBeInTheDocument();
  });

  it('starts building straight away from a hand-off prompt', async () => {
    const empty = makeProject({ prompt: 'A bakery' });
    const api = createFakeApi({
      getProject: async () => empty,
      streamChat: vi.fn(async () => {}),
    });
    renderWorkspace(api, { autoPrompt: 'A bakery' });
    await waitFor(() =>
      expect(api.streamChat).toHaveBeenCalledWith(empty.id, 'A bakery', expect.anything()),
    );
    expect(api.streamChat).toHaveBeenCalledTimes(1);
  });

  it('restores an earlier version from the chat', async () => {
    const api = createFakeApi({
      getProject: async () => built,
      restoreVersion: async () => ({ ...built, currentVersionId: 'v3' }),
    });
    renderWorkspace(api);
    const message = (await screen.findByText('Bright Smile', { selector: 'strong' })).closest(
      'div.flex',
    ) as HTMLElement;
    await userEvent.click(within(message).getByRole('button', { name: /restore/i }));
    expect(api.restoreVersion).toHaveBeenCalledWith(built.id, 'v1');
  });

  it('shows a friendly error when the project cannot load', async () => {
    const api = createFakeApi({ getProject: async () => Promise.reject(new Error('Gone')) });
    renderWorkspace(api);
    expect(await screen.findByRole('alert')).toHaveTextContent('Gone');
  });
});
