import { Link } from 'react-router';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-semibold tracking-tight">
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-brand-600 to-coral-500 text-sm font-bold text-white"
      >
        C
      </span>
      <span>Canvas Studio</span>
    </Link>
  );
}
