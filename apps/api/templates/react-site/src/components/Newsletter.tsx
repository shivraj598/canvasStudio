import { useState, type FormEvent } from 'react';
import type { Section } from '../types';
import { Container, Reveal } from './ui';

export function Newsletter({ section }: { section: Section }) {
  const [joined, setJoined] = useState(false);

  function subscribe(event: FormEvent) {
    event.preventDefault();
    setJoined(true);
  }

  return (
    <section id="newsletter" className="py-20">
      <Container>
        <Reveal className="rounded-card border border-line bg-card px-8 py-12 text-center shadow-sm sm:px-16">
          <h2 className="text-3xl tracking-tight">{section.heading}</h2>
          {section.body && <p className="mx-auto mt-3 max-w-lg text-muted">{section.body}</p>}
          {joined ? (
            <p className="mt-8 font-medium text-emerald-600">You’re on the list — thanks!</p>
          ) : (
            <form
              onSubmit={subscribe}
              className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Email address
              </label>
              <input
                id="newsletter-email"
                type="email"
                required
                placeholder="you@example.com"
                className="flex-1 rounded-button border border-line bg-page px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand"
              />
              <button className="rounded-button bg-brand px-6 py-3 text-sm font-semibold text-on-brand transition hover:bg-brand-strong">
                {section.cta ?? 'Subscribe'}
              </button>
            </form>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
