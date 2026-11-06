import type { AuthUser, DevLoginInput } from '@canvas/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokenStore } from '../lib/api';
import { useApi } from '../lib/ApiContext';

export type AuthState =
  | { status: 'loading'; user: null }
  | { status: 'authenticated'; user: AuthUser }
  | { status: 'anonymous'; user: null };

export interface AuthContextValue {
  state: AuthState;
  signInWithDev(input: DevLoginInput): Promise<AuthUser>;
  signOut(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [state, setState] = useState<AuthState>(() =>
    tokenStore.get() ? { status: 'loading', user: null } : { status: 'anonymous', user: null },
  );

  // Restore the session from a stored token on first load.
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api
      .me()
      .then((user) => {
        if (!cancelled) setState({ status: 'authenticated', user });
      })
      .catch(() => {
        tokenStore.clear();
        if (!cancelled) setState({ status: 'anonymous', user: null });
      });
    return () => {
      cancelled = true;
    };
  }, [api]);

  const signInWithDev = useCallback(
    async (input: DevLoginInput) => {
      const session = await api.devLogin(input);
      tokenStore.set(session.token);
      setState({ status: 'authenticated', user: session.user });
      return session.user;
    },
    [api],
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // The session is dropped locally regardless of whether the server call succeeds.
    }
    tokenStore.clear();
    setState({ status: 'anonymous', user: null });
  }, [api]);

  const value = useMemo(() => ({ state, signInWithDev, signOut }), [state, signInWithDev, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}
