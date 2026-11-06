import { Link } from 'react-router';
import { cn } from '../lib/utils';

/** The Canvas mark: a soft gradient brush-stroke tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative grid size-7 place-items-center overflow-hidden rounded-[9px] bg-signature shadow-sm shadow-sig-2/30',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" className="size-[62%] text-white" fill="none">
        <path
          d="M5 15.5c2.4-6.2 6.5-9.3 12.6-9.6-1.9 1.6-3.1 3.6-3.4 6 2-.4 3.6-.1 4.8.9-3.7.8-6.5 2.9-8.6 6.3-1.5-1.6-3.4-2.8-5.4-3.6Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  return (
    <Link
      to={to}
      className={cn('flex items-center gap-2 text-[15px] font-semibold tracking-tight', className)}
    >
      <LogoMark />
      <span>Canvas Studio</span>
    </Link>
  );
}
