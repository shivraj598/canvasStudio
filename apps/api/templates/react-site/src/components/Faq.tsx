import { Plus } from 'lucide-react';
import type { Section } from '../types';
import { Container, SectionHeading } from './ui';

export function Faq({ section }: { section: Section }) {
  return (
    <section id="faq" className="py-20 sm:py-28">
      <Container className="max-w-3xl">
        <SectionHeading section={section} />
        <div className="mt-14 divide-y divide-line border-y border-line">
          {section.items?.map((item) => (
            <details key={item.title} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-semibold [&::-webkit-details-marker]:hidden">
                {item.title}
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-soft text-brand-text transition group-open:rotate-45">
                  <Plus className="h-4 w-4" aria-hidden />
                </span>
              </summary>
              {item.description && (
                <p className="mt-4 leading-relaxed text-muted">{item.description}</p>
              )}
            </details>
          ))}
        </div>
      </Container>
    </section>
  );
}
