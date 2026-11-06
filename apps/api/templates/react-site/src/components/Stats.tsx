import type { Section } from '../types';
import { Container, Reveal } from './ui';

export function Stats({ section }: { section: Section }) {
  return (
    <section id="stats" aria-label={section.heading} className="border-y border-line bg-alt py-16">
      <Container className="grid grid-cols-2 gap-10 text-center lg:grid-cols-4">
        {section.items?.map((item) => (
          <Reveal key={item.title}>
            <p className="font-heading text-4xl tracking-tight text-brand-text sm:text-5xl">
              {item.title}
            </p>
            <p className="mt-2 text-sm text-muted">{item.description}</p>
          </Reveal>
        ))}
      </Container>
    </section>
  );
}
