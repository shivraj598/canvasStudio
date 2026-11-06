import { Skeleton } from './ui/skeleton';

/**
 * Shown while a lazily loaded page downloads. It fades in after a short delay, so quick loads
 * never flash a placeholder.
 */
export function RouteFallback({
  variant = 'page',
}: {
  variant?: 'page' | 'content' | 'workspace';
}) {
  if (variant === 'workspace') {
    return (
      <div role="status" aria-label="Loading" className="animate-fade-in-late flex h-dvh flex-col">
        <div className="flex h-12 items-center gap-3 border-b px-4">
          <Skeleton className="size-6 rounded-md" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="ml-auto h-7 w-24" />
        </div>
        <div className="grid flex-1 grid-cols-1 md:grid-cols-[380px_1fr]">
          <div className="hidden flex-col gap-3 border-r p-4 md:flex">
            <Skeleton className="h-16 w-4/5" />
            <Skeleton className="ml-auto h-10 w-3/5" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="mt-auto h-24 w-full rounded-2xl" />
          </div>
          <div className="bg-dots p-4 sm:p-6">
            <Skeleton className="h-full w-full rounded-xl bg-muted/70" />
          </div>
        </div>
      </div>
    );
  }
  if (variant === 'content') {
    return (
      <div role="status" aria-label="Loading" className="animate-fade-in-late space-y-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-label="Loading"
      className="animate-fade-in-late grid min-h-dvh place-items-center"
    >
      <span className="bg-signature size-9 animate-pulse rounded-xl shadow-lg shadow-sig-2/25" />
    </div>
  );
}
