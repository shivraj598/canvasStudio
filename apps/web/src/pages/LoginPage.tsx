import type { AuthProviderInfo } from '@canvas/shared';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { TextField } from '../components/Field';
import { GitHubIcon, GoogleIcon } from '../components/icons/ProviderIcons';
import { Logo } from '../components/Logo';
import { ApiError } from '../lib/api';
import { useApi } from '../lib/ApiContext';

const ICONS = { google: GoogleIcon, github: GitHubIcon } as const;

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
    <div className="grid min-h-screen place-items-center bg-gray-50 px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">Welcome to Canvas Studio</h1>
          <p className="mt-1 text-sm text-gray-600">Sign in to start building your website.</p>

          {loadError && (
            <p role="alert" className="mt-6 text-sm text-red-600">
              {loadError}
            </p>
          )}
          {!providers && !loadError && (
            <p role="status" className="mt-6 text-sm text-gray-500">
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
            <form
              onSubmit={handleDevLogin}
              className="mt-6 space-y-4 border-t border-gray-100 pt-6"
              noValidate
            >
              <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                Developer sign-in
              </p>
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
    </div>
  );
}
