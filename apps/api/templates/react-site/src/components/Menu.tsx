import type { Section } from '../types';
import { Container, Reveal, SectionHeading } from './ui';

export function Menu({ section }: { section: Section }) {
  return (
    <section id="menu" className="bg-alt py-20 sm:py-28">
      <Container>
        <SectionHeading section={section} />
        <div className="mx-auto mt-16 grid max-w-4xl gap-x-14 gap-y-8 md:grid-cols-2">
          {section.items?.map((item) => (
            <Reveal key={item.title}>
              <div className="flex items-baseline gap-3">
                <h3 className="font-heading text-lg">{item.title}</h3>
                <span className="flex-1 border-b border-dotted border-line" />
                <span className="font-semibold text-brand-text">{item.meta}</span>
              </div>
              {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
