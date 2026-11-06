import {
  getCompletedSteps,
  validateStep,
  type Project,
  type QuestionnaireDraft,
  type StepId,
} from '@canvas/shared';
import { completeAnswers } from '@canvas/shared/testing';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { ApiError } from '../lib/api';
import { createFakeApi, makeProject, renderWithProviders } from '../test/utils';
import { BuilderPage } from './BuilderPage';

/** A fake API that saves answers the way the real server does. */
function statefulApi(initial: QuestionnaireDraft = {}) {
  let project: Project = makeProject({
    id: 'p1',
    answers: initial,
    completedSteps: getCompletedSteps(initial),
  });
  const api = createFakeApi({
    getProject: async () => project,
    saveStep: async (_id: string, step: StepId, data: unknown) => {
      const result = validateStep(step, data);
      if (!result.success) {
        throw new ApiError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
          fields: result.fieldErrors,
        });
      }
      const answers = { ...project.answers, [step]: result.data };
      project = { ...project, answers, completedSteps: getCompletedSteps(answers) };
      return project;
    },
    generate: async () => {
      project = { ...project, status: 'generated' };
      return project;
    },
  });
  return { api, current: () => project };
}

function renderBuilder(api: ReturnType<typeof statefulApi>['api']) {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:id/build" element={<BuilderPage />} />
      <Route path="/projects/:id/preview" element={<p>Preview page</p>} />
    </Routes>,
    { api, route: '/projects/p1/build', signedIn: true },
  );
}

const allButContact = { ...completeAnswers, contact: undefined } as QuestionnaireDraft;
delete allButContact.contact;

describe('BuilderPage', () => {
  it('starts a new project on the first step', async () => {
    renderBuilder(statefulApi().api);
    expect(await screen.findByRole('heading', { name: 'Your brand' })).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('resumes at the first unanswered step', async () => {
    renderBuilder(
      statefulApi({ brand: completeAnswers.brand, category: completeAnswers.category }).api,
    );
    expect(await screen.findByRole('heading', { name: 'What do you do?' })).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 8')).toBeInTheDocument();
  });

  it('validates on the client before saving', async () => {
    const { api } = statefulApi();
    renderBuilder(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Brand name is required')).toBeInTheDocument();
    expect(api.saveStep).not.toHaveBeenCalled();
  });

  it('saves a step and moves to the next one', async () => {
    const { api, current } = statefulApi();
    renderBuilder(api);
    await userEvent.type(await screen.findByLabelText('Brand or business name'), 'Café Luna');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(
      await screen.findByRole('heading', { name: 'What kind of business?' }),
    ).toBeInTheDocument();
    expect(api.saveStep).toHaveBeenCalledWith(
      'p1',
      'brand',
      expect.objectContaining({ brandName: 'Café Luna' }),
    );
    expect(current().completedSteps).toEqual(['brand']);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('shows server-side field errors', async () => {
    const { api } = statefulApi();
    api.saveStep.mockRejectedValueOnce(
      new ApiError(400, 'VALIDATION_ERROR', 'Some fields are invalid', {
        fields: { brandName: 'That name is taken' },
      }),
    );
    renderBuilder(api);
    await userEvent.type(await screen.findByLabelText('Brand or business name'), 'Café Luna');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('That name is taken')).toBeInTheDocument();
  });

  it('shows other save failures', async () => {
    const { api } = statefulApi();
    api.saveStep.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'You are offline'));
    renderBuilder(api);
    await userEvent.type(await screen.findByLabelText('Brand or business name'), 'Café Luna');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('You are offline');
  });

  it('goes back with saved answers intact and only allows reachable steps', async () => {
    renderBuilder(
      statefulApi({ brand: completeAnswers.brand, category: completeAnswers.category }).api,
    );
    await screen.findByRole('heading', { name: 'What do you do?' });
    const nav = screen.getByRole('navigation', { name: 'Questionnaire steps' });
    expect(within(nav).getByRole('button', { name: /Your goals/ })).toBeDisabled();
    expect(within(nav).getByRole('button', { name: /Review & generate/ })).toBeDisabled();
    expect(within(nav).getByRole('button', { name: /What do you do/ })).toHaveAttribute(
      'aria-current',
      'step',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(await screen.findByRole('radio', { name: /Doctor \/ Clinic/ })).toBeChecked();

    await userEvent.click(within(nav).getByRole('button', { name: /Your brand/ }));
    expect(screen.getByLabelText('Brand or business name')).toHaveValue('Sunrise Dental');
  });

  it('finishes the last step, reviews and generates the site', async () => {
    const { api } = statefulApi(allButContact);
    renderBuilder(api);
    await userEvent.type(await screen.findByLabelText(/Email/), 'hi@sunrise.dental');
    await userEvent.click(screen.getByRole('button', { name: 'Save & review' }));

    expect(await screen.findByRole('heading', { name: 'Review your answers' })).toBeInTheDocument();
    const contact = screen.getByRole('region', { name: 'Contact details' });
    expect(within(contact).getByText('hi@sunrise.dental')).toBeInTheDocument();
    expect(screen.getByText('Doctor / Clinic')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Generate my website' }));
    expect(await screen.findByText('Preview page')).toBeInTheDocument();
    expect(api.generate).toHaveBeenCalledWith('p1');
  });

  it('lets users jump back from review to edit a step', async () => {
    renderBuilder(statefulApi(completeAnswers).api);
    await screen.findByRole('heading', { name: 'Review your answers' });
    await userEvent.click(screen.getByRole('button', { name: 'Edit Look & feel' }));
    expect(await screen.findByRole('heading', { name: 'Look & feel' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Calm Clinic' })).toBeChecked();
  });

  it('reports generation failures', async () => {
    const { api } = statefulApi(completeAnswers);
    api.generate.mockRejectedValueOnce(new Error('Generator is busy'));
    renderBuilder(api);
    await userEvent.click(await screen.findByRole('button', { name: 'Generate my website' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Generator is busy');
    expect(screen.getByRole('button', { name: 'Generate my website' })).toBeEnabled();
  });

  it('shows an error when the project cannot be loaded', async () => {
    const api = createFakeApi({
      getProject: async () => {
        throw new ApiError(404, 'NOT_FOUND', 'Project not found');
      },
    });
    renderBuilder(api);
    expect(await screen.findByText('Project not found')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'Back to your websites' })).toHaveAttribute(
        'href',
        '/projects',
      ),
    );
  });
});
