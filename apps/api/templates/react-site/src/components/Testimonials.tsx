import type { Section } from '../types';
import { Container, Reveal, SectionHeading, initials } from './ui';

export function Testimonials({ section }: { section: Section }) {
  return (
    <section id="testimonials" className="py-20 sm:py-28">
      <Container>
        <SectionHeading section={section} />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {section.items?.map((quote) => (
            <Reveal
              key={quote.title}
              className="flex flex-col rounded-card border border-line bg-card p-8 shadow-sm"
            >
              <p className="text-amber-400" aria-label="5 out of 5 stars">
                ★★★★★
              </p>
              <blockquote className="mt-4 flex-1 text-lg leading-relaxed">
                “{quote.title}”
              </blockquote>
              <p className="mt-6 flex items-center gap-3 text-sm font-medium">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-soft text-xs font-bold text-brand-text">
                  {initials(quote.meta ?? 'A')}
                </span>
                {quote.meta}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
