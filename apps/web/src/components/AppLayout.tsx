import { LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import { Logo } from './Logo';
import { Button } from './ui/button';

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

export function AppLayout() {
  const { state, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Logo to="/projects" />
          <div className="flex items-center gap-2 text-sm">
            {state.user && (
              <span className="flex items-center gap-2 rounded-full border bg-card py-0.5 pr-3 pl-0.5">
                <span className="bg-signature grid size-7 place-items-center rounded-full text-[11px] font-semibold text-white">
                  {initials(state.user.name)}
                </span>
                <span className="max-w-40 truncate font-medium">{state.user.name}</span>
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut />
              Sign out
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <Outlet />
      </main>
    </div>
  );
}
