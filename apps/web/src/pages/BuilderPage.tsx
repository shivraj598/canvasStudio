import {
  QUESTIONNAIRE_STEPS,
  STEP_IDS,
  getNextIncompleteStep,
  getStep,
  isQuestionnaireComplete,
  validateStep,
  type Project,
  type StepId,
} from '@canvas/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Button } from '../components/Button';
import { initialStepValue } from '../features/questionnaire/defaults';
import { StepFields } from '../features/questionnaire/steps';
import { summarizeStep } from '../features/questionnaire/summary';
import type { StepFormValues } from '../features/questionnaire/types';
import { ApiError } from '../lib/api';
import { useApi } from '../lib/ApiContext';

type Screen = StepId | 'review';

function StepNav({
  project,
  screen,
  onSelect,
}: {
  project: Project;
  screen: Screen;
  onSelect: (screen: Screen) => void;
}) {
  const done = new Set(project.completedSteps);
  const next = getNextIncompleteStep(project.answers);
  const complete = isQuestionnaireComplete(project.answers);

  return (
    <nav aria-label="Questionnaire steps">
      <ol className="space-y-1">
        {QUESTIONNAIRE_STEPS.map((step, i) => {
          const reachable = done.has(step.id) || step.id === next || step.id === screen;
          const current = step.id === screen;
          return (
            <li key={step.id}>
              <button
                type="button"
                disabled={!reachable}
                aria-current={current ? 'step' : undefined}
                onClick={() => onSelect(step.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  current ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-gray-100'
                }`}
              >
                <span
                  aria-hidden
                  className={`grid size-6 shrink-0 place-items-center rounded-full text-xs ${
                    done.has(step.id) ? 'bg-brand-600 text-white' : 'border border-gray-300'
                  }`}
                >
                  {done.has(step.id) ? '✓' : i + 1}
                </span>
                {step.title}
                {done.has(step.id) && <span className="sr-only">(completed)</span>}
              </button>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            disabled={!complete}
            aria-current={screen === 'review' ? 'step' : undefined}
            onClick={() => onSelect('review')}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50 ${
              screen === 'review' ? 'bg-brand-50 font-medium text-brand-700' : 'hover:bg-gray-100'
            }`}
          >
            <span aria-hidden className="grid size-6 place-items-center rounded-full border border-gray-300 text-xs">
              ★
            </span>
            Review & generate
          </button>
        </li>
      </ol>
    </nav>
  );
}

function Review({
  project,
  onEdit,
  onGenerate,
  generating,
  error,
}: {
  project: Project;
  onEdit: (step: StepId) => void;
  onGenerate: () => void;
  generating: boolean;
  error: string | null;
}) {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Review your answers</h1>
      <p className="mt-1 text-gray-600">
        Everything look right? We will build your website from these answers.
      </p>
      <div className="mt-8 space-y-4">
        {QUESTIONNAIRE_STEPS.map((step) => (
          <section
            key={step.id}
            aria-labelledby={`review-${step.id}`}
            className="rounded-xl border border-gray-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <h2 id={`review-${step.id}`} className="font-semibold">
                {step.title}
              </h2>
              <Button variant="ghost" onClick={() => onEdit(step.id)} aria-label={`Edit ${step.title}`}>
                Edit
              </Button>
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[12rem_1fr]">
              {summarizeStep(step.id, project.answers).map((row) => (
                <div key={row.label} className="contents">
                  <dt className="text-gray-500">{row.label}</dt>
                  <dd className="break-words">{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-6 text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="mt-8 flex justify-end">
        <Button onClick={onGenerate} disabled={generating} className="px-6 py-3 text-base">
          {generating
            ? 'Building your website…'
            : project.status === 'generated'
              ? 'Regenerate my website'
              : 'Generate my website'}
        </Button>
      </div>
    </div>
  );
}

export function BuilderPage() {
  const { id = '' } = useParams();
  const api = useApi();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>('brand');
  const [values, setValues] = useState<Partial<StepFormValues>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getProject(id)
      .then((p) => {
        if (cancelled) return;
        setProject(p);
        setScreen(getNextIncompleteStep(p.answers) ?? 'review');
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not load this website');
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);

  if (loadError) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{loadError}</p>
        <Link to="/projects" className="mt-4 inline-block font-medium text-brand-700">
          Back to your websites
        </Link>
      </div>
    );
  }
  if (!project) {
    return (
      <p role="status" className="text-gray-500">
        Loading your website…
      </p>
    );
  }

  function go(next: Screen) {
    setErrors({});
    setActionError(null);
    setScreen(next);
    window.scrollTo?.({ top: 0 });
  }

  async function handleGenerate() {
    setGenerating(true);
    setActionError(null);
    try {
      await api.generate(project!.id);
      navigate(`/projects/${project!.id}/preview`);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Could not generate your website');
      setGenerating(false);
    }
  }

  if (screen === 'review') {
    return (
      <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
        <aside>
          <StepNav project={project} screen={screen} onSelect={go} />
        </aside>
        <Review
          project={project}
          onEdit={go}
          onGenerate={handleGenerate}
          generating={generating}
          error={actionError}
        />
      </div>
    );
  }

  const step = screen;
  const stepIndex = STEP_IDS.indexOf(step);
  const meta = getStep(step);
  const value = values[step] ?? initialStepValue(step, project.answers);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = validateStep(step, value);
    if (!result.success) {
      setErrors(result.fieldErrors);
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      const updated = await api.saveStep(project!.id, step, value);
      setProject(updated);
      // Drop local edits so the form re-initialises from what the server normalised and saved.
      setValues((v) => ({ ...v, [step]: undefined }));
      go(STEP_IDS[stepIndex + 1] ?? 'review');
    } catch (e) {
      if (e instanceof ApiError && Object.keys(e.fieldErrors).length) {
        setErrors(e.fieldErrors);
      } else {
        setActionError(e instanceof Error ? e.message : 'Could not save your answers');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[16rem_1fr]">
      <aside>
        <p className="mb-3 text-sm font-medium text-gray-500">{project.name}</p>
        <StepNav project={project} screen={screen} onSelect={go} />
      </aside>

      <form onSubmit={handleSubmit} noValidate className="min-w-0">
        <p className="text-sm font-medium text-brand-700">
          Step {stepIndex + 1} of {STEP_IDS.length}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-200"
          role="progressbar"
          aria-label="Questionnaire progress"
          aria-valuemin={0}
          aria-valuemax={STEP_IDS.length}
          aria-valuenow={project.completedSteps.length}
        >
          <div
            className="h-full bg-brand-600 transition-all"
            style={{ width: `${(project.completedSteps.length / STEP_IDS.length) * 100}%` }}
          />
        </div>
        <h1 className="mt-6 text-2xl font-semibold">{meta.title}</h1>
        <p className="mt-1 text-gray-600">{meta.description}</p>

        <div className="mt-8">
          <StepFields
            key={step}
            step={step}
            value={value}
            onChange={(next) => setValues((v) => ({ ...v, [step]: next }))}
            errors={errors}
            draft={project.answers}
          />
        </div>

        {actionError && (
          <p role="alert" className="mt-6 text-sm text-red-600">
            {actionError}
          </p>
        )}

        <div className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6">
          <Button
            variant="secondary"
            disabled={stepIndex === 0}
            onClick={() => go(STEP_IDS[stepIndex - 1]!)}
          >
            Back
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : stepIndex === STEP_IDS.length - 1 ? 'Save & review' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  );
}
