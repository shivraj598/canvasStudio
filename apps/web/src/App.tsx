import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/AppLayout';
import { RouteFallback } from './components/RouteFallback';
import { LandingPage } from './pages/LandingPage';
import { NotFoundPage } from './pages/NotFoundPage';

// The landing page ships in the entry chunk; everything else loads when first visited. The
// workspace is the heaviest (syntax highlighting, the in-browser preview bundler, zip export).
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const NewProjectPage = lazy(() =>
  import('./pages/NewProjectPage').then((m) => ({ default: m.NewProjectPage })),
);
const WorkspacePage = lazy(() =>
  import('./pages/WorkspacePage').then((m) => ({ default: m.WorkspacePage })),
);
const ProjectsPage = lazy(() =>
  import('./pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
);
const BuilderPage = lazy(() =>
  import('./pages/BuilderPage').then((m) => ({ default: m.BuilderPage })),
);

/** Old preview links now open the workspace, which has the preview built in. */
function PreviewRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/projects/${id}`} replace />;
}

function Page({ children, variant }: { children: ReactNode; variant?: 'workspace' }) {
  return <Suspense fallback={<RouteFallback variant={variant} />}>{children}</Suspense>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route
        path="/login"
        element={
          <Page>
            <LoginPage />
          </Page>
        }
      />
      <Route element={<RequireAuth />}>
        <Route
          path="/new"
          element={
            <Page>
              <NewProjectPage />
            </Page>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <Page variant="workspace">
              <WorkspacePage />
            </Page>
          }
        />
        <Route path="/projects/:id/preview" element={<PreviewRedirect />} />
        {/* AppLayout suspends inside its own content area, so its header stays put. */}
        <Route element={<AppLayout />}>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id/build" element={<BuilderPage />} />
          <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
