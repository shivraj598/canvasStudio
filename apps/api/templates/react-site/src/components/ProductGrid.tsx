import { ArrowRight } from 'lucide-react';
import type { Section } from '../types';
import { Container, Photo, Reveal, SectionHeading, cx } from './ui';

export function ProductGrid({ section, action }: { section: Section; action: string }) {
  const columns =
    (section.items?.length ?? 0) >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3';
  return (
    <section id={section.kind} className="py-20 sm:py-28">
      <Container>
        <SectionHeading section={section} />
        <div className={cx('mt-16 grid gap-6', columns)}>
          {section.items?.map((item) => (
            <Reveal
              key={item.title}
              className="group overflow-hidden rounded-card border border-line bg-card shadow-sm"
            >
              <Photo src={item.image} alt={item.title} className="aspect-[4/3]" />
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.meta && <span className="font-semibold text-brand-text">{item.meta}</span>}
                </div>
                {item.description && <p className="mt-2 text-sm text-muted">{item.description}</p>}
                <a
                  href="#contact"
                  className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-brand-text"
                >
                  {action} <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
