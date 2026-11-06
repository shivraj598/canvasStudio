import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from './AuthContext';

/** Renders child routes only for signed-in users; otherwise redirects to /login. */
export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === 'loading') {
    return (
      <div role="status" className="grid min-h-screen place-items-center text-gray-500">
        Loading your studio…
      </div>
    );
  }
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
