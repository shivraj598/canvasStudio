import type { AuthProviderInfo } from '@canvas/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { TextField } from '../components/Field';
import { GitHubIcon, GoogleIcon } from '../components/icons/ProviderIcons';
import { Logo, LogoMark } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useApi } from '../lib/ApiContext';

const ICONS = { google: GoogleIcon, github: GitHubIcon } as const;

/** Prefilled by the "Use demo account" button. Dev sign-in has no password. */
export const DEMO_ACCOUNT = { name: 'Demo User', email: 'demo@canvasstudio.dev' };

export function LoginPage() {
  const api = useApi();
  const { state, signInWithDev } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/projects';

  const [providers, setProviders] = useState<AuthProviderInfo[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .providers()
      .then(setProviders)
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : 'Could not load sign-in options'),
      );
  }, [api]);

  if (state.status === 'authenticated') return <Navigate to={from} replace />;

  const oauthProviders = providers?.filter((p) => p.id !== 'dev') ?? [];
  const devEnabled = providers?.some((p) => p.id === 'dev' && p.enabled) ?? false;

  async function handleDevLogin(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    try {
      await signInWithDev({ name: form.name.trim(), email: form.email.trim() });
      navigate(from, { replace: true });
    } catch (e) {
      setErrors(
        e instanceof ApiError && Object.keys(e.fieldErrors).length
          ? e.fieldErrors
          : { _: e instanceof Error ? e.message : 'Sign-in failed' },
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col px-6 py-6 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-semibold tracking-tight">Welcome to Canvas Studio</h1>
          <p className="mt-2 text-muted-foreground">
            Sign in to start building — your idea is waiting.
          </p>

          {loadError && (
            <p role="alert" className="mt-6 text-sm text-red-600">
              {loadError}
            </p>
          )}
          {!providers && !loadError && (
            <p role="status" className="mt-6 text-sm text-muted-foreground">
              Loading sign-in options…
            </p>
          )}

          <div className="mt-6 space-y-3">
            {oauthProviders.map((provider) => {
              const Icon = ICONS[provider.id as keyof typeof ICONS];
              return (
                <Button
                  key={provider.id}
                  variant="secondary"
                  className="w-full"
                  disabled={!provider.enabled}
                  onClick={() => window.location.assign(`/api/auth/${provider.id}/start`)}
                >
                  {Icon && <Icon />}
                  {provider.label}
                  {!provider.enabled && (
                    <span className="text-xs text-gray-400">(coming soon)</span>
                  )}
                </Button>
              );
            })}
          </div>

          {devEnabled && (
            <form onSubmit={handleDevLogin} className="mt-6 space-y-4 border-t pt-6" noValidate>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Developer sign-in
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForm(DEMO_ACCOUNT);
                    setErrors({});
                  }}
                  className="text-sm font-medium text-sig-1 hover:underline"
                >
                  Use demo account
                </button>
              </div>
              <TextField
                label="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={errors.name}
                autoComplete="name"
                required
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                error={errors.email}
                autoComplete="email"
                required
              />
              {errors._ && (
                <p role="alert" className="text-sm text-red-600">
                  {errors._}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Continue'}
              </Button>
            </form>
          )}
        </div>
      </div>
      <BrandPanel />
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-zinc-950 lg:block">
      <div
        aria-hidden
        className="animate-aurora absolute -inset-20 opacity-80 blur-[80px] [background:radial-gradient(35%_40%_at_30%_40%,rgba(110,86,255,.7),transparent_70%),radial-gradient(35%_40%_at_70%_55%,rgba(225,70,183,.6),transparent_70%),radial-gradient(30%_35%_at_45%_80%,rgba(255,138,61,.6),transparent_70%)]"
      />
      <div className="relative flex h-full flex-col justify-end p-12 text-white">
        <div className="max-w-md rounded-2xl border border-white/15 bg-white/10 p-5 shadow-2xl backdrop-blur-xl">
          <p className="ml-auto w-fit rounded-2xl rounded-br-md bg-white/15 px-3.5 py-2 text-sm">
            A website for my dental clinic in Austin, with online booking
          </p>
          <div className="mt-3 flex gap-2.5">
            <LogoMark className="size-6 rounded-[7px]" />
            <p className="text-sm leading-relaxed text-white/85">
              I&rsquo;ll build <strong>Bright Smile Dental</strong> — a calm, light design with teal
              accents, services, your team, reviews and a booking section.
            </p>
          </div>
        </div>
        <p className="mt-10 font-serif text-4xl leading-tight italic">
          “From idea to website before my coffee got cold.”
        </p>
        <p className="mt-3 text-sm text-white/60">Every site starts with a single sentence.</p>
      </div>
    </div>
  );
}
