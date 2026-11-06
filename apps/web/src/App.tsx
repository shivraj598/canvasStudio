import { Navigate, Route, Routes, useParams } from 'react-router';
import { RequireAuth } from './auth/RequireAuth';
import { AppLayout } from './components/AppLayout';
import { BuilderPage } from './pages/BuilderPage';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { NewProjectPage } from './pages/NewProjectPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { WorkspacePage } from './pages/WorkspacePage';

/** Old preview links now open the workspace, which has the preview built in. */
function PreviewRedirect() {
  const { id = '' } = useParams();
  return <Navigate to={`/projects/${id}`} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route path="/new" element={<NewProjectPage />} />
        <Route path="/projects/:id" element={<WorkspacePage />} />
        <Route path="/projects/:id/preview" element={<PreviewRedirect />} />
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
