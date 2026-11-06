import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Coffee,
  Globe,
  Heart,
  Layers,
  Mail,
  MapPin,
  Package,
  Shield,
  Smile,
  Star,
  Sun,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { IconName, Section } from '../types';

export const ICONS: Record<IconName, LucideIcon> = {
  check: Check,
  arrow: ArrowRight,
  star: Star,
  heart: Heart,
  shield: Shield,
  zap: Zap,
  clock: Clock,
  calendar: Calendar,
  users: Users,
  smile: Smile,
  pin: MapPin,
  mail: Mail,
  globe: Globe,
  award: Award,
  trend: TrendingUp,
  layers: Layers,
  sun: Sun,
  coffee: Coffee,
  book: BookOpen,
  box: Package,
};

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function initials(name: string) {
  return name
    .replace(/^(dr|mr|mrs|ms)\.?\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

export function ButtonLink({
  href,
  children,
  variant = 'primary',
  className,
}: {
  href: string;
  children: ReactNode;
  variant?: 'primary' | 'ghost' | 'light';
  className?: string;
}) {
  const styles = {
    primary: 'bg-brand text-on-brand shadow-lg shadow-brand/25 hover:bg-brand-strong',
    ghost: 'border border-line text-ink hover:bg-alt',
    light: 'bg-white text-zinc-900 shadow-lg hover:bg-zinc-100',
  } as const;
  return (
    <a
      href={href}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-button px-6 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        styles[variant],
        className,
      )}
    >
      {children}
      {variant !== 'ghost' && <ArrowRight className="h-4 w-4" aria-hidden />}
    </a>
  );
}

/** Fades content up as it scrolls into view. */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cx('reveal', visible && 'is-visible', className)}>
      {children}
    </div>
  );
}

export function SectionHeading({ section, center = true }: { section: Section; center?: boolean }) {
  return (
    <Reveal className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {section.eyebrow && (
        <p className="text-sm font-semibold tracking-widest text-brand-text uppercase">
          {section.eyebrow}
        </p>
      )}
      <h2 className="mt-3 text-3xl tracking-tight sm:text-5xl">{section.heading}</h2>
      {section.body && <p className="mt-4 text-lg text-muted">{section.body}</p>}
    </Reveal>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('mx-auto max-w-6xl px-6', className)}>{children}</div>;
}

/** A photo on a brand-tinted backdrop, so a failed image still looks intentional. */
export function Photo({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx('overflow-hidden bg-gradient-to-br from-brand-soft to-brand/40', className)}>
      {src && !failed && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
      )}
    </div>
  );
}
