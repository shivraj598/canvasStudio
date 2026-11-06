import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { LogoMark } from '../components/Logo';
import { pendingPrompt } from '../features/builder/pendingPrompt';
import { useApi } from '../lib/ApiContext';

/**
 * Landing spot after sign-in when someone typed a prompt before having an account: creates the
 * project and opens the workspace, which starts building straight away.
 */
export function NewProjectPage() {
  const api = useApi();
  const navigate = useNavigate();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const prompt = pendingPrompt.take();
    if (!prompt) {
      navigate('/projects', { replace: true });
      return;
    }
    api
      .createProject({ prompt })
      .then((project) =>
        navigate(`/projects/${project.id}`, { replace: true, state: { autoPrompt: prompt } }),
      )
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : 'Could not start your project');
        navigate('/projects', { replace: true });
      });
  }, [api, navigate]);

  return (
    <div className="grid h-dvh place-items-center" role="status">
      <div className="flex flex-col items-center gap-4">
        <LogoMark className="size-10 animate-pulse rounded-xl" />
        <p className="text-shimmer text-sm font-medium">Setting up your project…</p>
      </div>
    </div>
  );
}
