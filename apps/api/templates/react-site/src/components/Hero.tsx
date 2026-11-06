import { Check } from 'lucide-react';
import { site } from '../content';
import type { Section, Site } from '../types';
import { ButtonLink, Container, Reveal } from './ui';

const AVATARS = [
  'from-rose-400 to-orange-300',
  'from-sky-400 to-indigo-400',
  'from-emerald-400 to-teal-400',
  'from-violet-400 to-fuchsia-400',
];
const BARS = [38, 62, 48, 80, 56, 92, 70];

export function Hero({ section, card }: { section: Section; card: Site['heroCard'] }) {
  return (
    <section id="hero" className="relative overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -right-40 h-[34rem] w-[34rem] rounded-full bg-brand/25 blur-3xl" />
        <div className="absolute -bottom-48 -left-48 h-[30rem] w-[30rem] rounded-full bg-sky-300/20 blur-3xl" />
        <div className="hero-grid absolute inset-0" />
      </div>

      <Container className="relative grid items-center gap-16 py-20 sm:py-28 lg:grid-cols-[1.1fr_0.9fr]">
        <Reveal>
          {section.eyebrow && (
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card/80 px-3 py-1 text-xs font-medium text-muted backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-brand" />
              {section.eyebrow}
            </span>
          )}
          <h1 className="mt-6 text-5xl leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
            {section.heading}
          </h1>
          {section.body && (
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">{section.body}</p>
          )}
          <div className="mt-10 flex flex-wrap gap-3">
            {section.cta && <ButtonLink href="#contact">{section.cta}</ButtonLink>}
            {section.secondaryCta && (
              <ButtonLink href={`#${site.sections[1]?.kind ?? 'contact'}`} variant="ghost">
                {section.secondaryCta}
              </ButtonLink>
            )}
          </div>
          <div className="mt-10 flex items-center gap-4 text-sm text-muted">
            <div className="flex -space-x-2">
              {['AL', 'MK', 'JR', 'SP'].map((name, index) => (
                <span
                  key={name}
                  className={`grid h-9 w-9 place-items-center rounded-full border-2 border-page bg-gradient-to-br ${AVATARS[index]} text-[11px] font-bold text-white`}
                >
                  {name}
                </span>
              ))}
            </div>
            <p>
              <span className="text-amber-400">★★★★★</span>
              <br />
              Loved by 500+ customers
            </p>
          </div>
        </Reveal>

        <Reveal className="relative">
          <div className="rounded-card border border-line bg-card/80 p-6 shadow-2xl shadow-black/10 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm text-subtle">{card.label}</p>
              <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-text">
                Live
              </span>
            </div>
            <p className="mt-3 font-heading text-3xl tracking-tight">{card.title}</p>
            <div className="mt-6 flex h-36 items-end gap-2 rounded-card bg-gradient-to-br from-brand-soft to-transparent p-5">
              {BARS.map((height, index) => (
                <span
                  key={index}
                  className={`flex-1 rounded-t-md ${index === 5 ? 'bg-brand' : 'bg-brand/30'}`}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <dl className="mt-6 space-y-3">
              {card.rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-line pb-3 text-sm last:border-0"
                >
                  <dt className="text-muted">{label}</dt>
                  <dd className="font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink href="#contact" className="mt-6 w-full">
              {section.cta ?? 'Get started'}
            </ButtonLink>
          </div>
          <div className="absolute -bottom-6 -left-6 hidden items-center gap-3 rounded-card border border-line bg-card px-4 py-3 shadow-xl sm:flex">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="h-4 w-4" />
            </span>
            <div className="text-sm">
              <p className="font-semibold">{card.badge}</p>
              <p className="text-xs text-subtle">Just now</p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
