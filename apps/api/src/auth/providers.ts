import type { AuthProviderId, AuthProviderInfo } from '@canvas/shared';
import type { AppConfig } from '../config.js';

const LABELS: Record<AuthProviderId, string> = {
  google: 'Continue with Google',
  github: 'Continue with GitHub',
  dev: 'Developer sign-in',
};

/** Providers shown on the login screen. OAuth providers are disabled until configured. */
export function listProviders(config: AppConfig): AuthProviderInfo[] {
  const providers: AuthProviderInfo[] = [
    { id: 'google', label: LABELS.google, enabled: config.oauth.google !== null },
    { id: 'github', label: LABELS.github, enabled: config.oauth.github !== null },
  ];
  if (config.devLoginEnabled) {
    providers.push({ id: 'dev', label: LABELS.dev, enabled: true });
  }
  return providers;
}
