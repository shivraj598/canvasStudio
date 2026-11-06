import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Button } from './Button';
import { Logo } from './Logo';

export function AppLayout() {
  const { state, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Logo to="/projects" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-600">{state.user?.name}</span>
            <Button variant="ghost" onClick={handleSignOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
