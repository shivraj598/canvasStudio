import type { Section } from '../types';
import { ButtonLink, Container, Reveal } from './ui';

export function CallToAction({ section }: { section: Section }) {
  return (
    <section id="cta" className="py-20">
      <Container>
        <Reveal className="relative overflow-hidden rounded-card bg-gradient-to-br from-brand to-brand-strong px-8 py-16 text-center text-on-brand sm:px-16">
          <div
            aria-hidden
            className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/15 blur-3xl"
          />
          <h2 className="relative text-3xl tracking-tight sm:text-5xl">{section.heading}</h2>
          {section.body && (
            <p className="relative mx-auto mt-4 max-w-xl text-lg opacity-80">{section.body}</p>
          )}
          <ButtonLink href="#contact" variant="light" className="relative mt-10">
            {section.cta ?? 'Get started'}
          </ButtonLink>
        </Reveal>
      </Container>
    </section>
  );
}
