import type { Section } from '../types';
import { Container } from './ui';

export function Logos({ section }: { section: Section }) {
  return (
    <section id="logos" className="border-y border-line py-12">
      <Container>
        <p className="text-center text-sm text-subtle">{section.heading}</p>
        <ul className="mt-8 grid grid-cols-2 items-center gap-8 text-center sm:grid-cols-3 lg:grid-cols-6">
          {section.items?.map((item) => (
            <li
              key={item.title}
              className="font-heading text-xl tracking-tight text-muted opacity-70"
            >
              {item.title}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
