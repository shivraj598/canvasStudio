/**
 * Carries a prompt typed on the landing page through sign-in. Session storage can be
 * unavailable (private mode), so failures are ignored.
 */
const KEY = 'canvas-studio.pending-prompt';

export const pendingPrompt = {
  set(prompt: string) {
    try {
      sessionStorage.setItem(KEY, prompt);
    } catch {
      /* ignore */
    }
  },
  take(): string | null {
    try {
      const value = sessionStorage.getItem(KEY);
      sessionStorage.removeItem(KEY);
      return value;
    } catch {
      return null;
    }
  },
};
