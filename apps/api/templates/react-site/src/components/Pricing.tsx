import { Check } from 'lucide-react';
import type { Section } from '../types';
import { ButtonLink, Container, Reveal, SectionHeading, cx } from './ui';

export function Pricing({ section }: { section: Section }) {
  return (
    <section id="pricing" className="bg-alt py-20 sm:py-28">
      <Container>
        <SectionHeading section={section} />
        <div className="mt-16 grid items-start gap-6 lg:grid-cols-3">
          {section.items?.map((plan) => {
            const monthly = /^\$\d/.test(plan.meta ?? '') && plan.meta !== '$0';
            return (
              <Reveal
                key={plan.title}
                className={cx(
                  'relative rounded-card border border-line bg-card p-8 shadow-sm',
                  plan.highlight && 'ring-2 ring-brand lg:-translate-y-3',
                )}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-8 rounded-full bg-brand px-3 py-1 text-xs font-semibold text-on-brand">
                    Most popular
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.title}</h3>
                <p className="mt-4 font-heading text-5xl tracking-tight">
                  {plan.meta}
                  {monthly && (
                    <span className="font-body text-base font-normal text-muted">/mo</span>
                  )}
                </p>
                <ul className="mt-8 space-y-3 text-sm">
                  {plan.bullets?.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-text" aria-hidden />
                      <span className="text-muted">{bullet}</span>
                    </li>
                  ))}
                </ul>
                <ButtonLink
                  href="#contact"
                  variant={plan.highlight ? 'primary' : 'ghost'}
                  className="mt-8 w-full"
                >
                  Get started
                </ButtonLink>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
