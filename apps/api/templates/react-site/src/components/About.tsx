import { Check } from 'lucide-react';
import type { Section } from '../types';
import { Container, Photo, Reveal } from './ui';

const POINTS = ['Independent & locally owned', 'Obsessed with quality', 'Here for the long run'];

export function About({ section }: { section: Section }) {
  return (
    <section id="about" className="py-20 sm:py-28">
      <Container className="grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          {section.eyebrow && (
            <p className="text-sm font-semibold tracking-widest text-brand-text uppercase">
              {section.eyebrow}
            </p>
          )}
          <h2 className="mt-3 text-3xl tracking-tight sm:text-5xl">{section.heading}</h2>
          {section.body && (
            <p className="mt-6 text-lg leading-relaxed text-muted">{section.body}</p>
          )}
          <ul className="mt-8 space-y-3 text-sm">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3">
                <Check className="h-4 w-4 text-brand-text" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </Reveal>
        <Reveal>
          <Photo src={section.image} alt="" className="aspect-[4/3] rounded-card" />
        </Reveal>
      </Container>
    </section>
  );
}
