import type { Section } from '../types';
import { Container, Reveal, SectionHeading, initials } from './ui';

const GRADIENTS = [
  'from-rose-400 to-orange-300',
  'from-sky-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-violet-400 to-fuchsia-500',
];

export function Team({ section }: { section: Section }) {
  return (
    <section id="team" className="bg-alt py-20 sm:py-28">
      <Container>
        <SectionHeading section={section} />
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {section.items?.map((person, index) => (
            <Reveal
              key={person.title}
              className="rounded-card border border-line bg-card p-8 text-center shadow-sm"
            >
              <span
                className={`mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} text-xl font-bold text-white shadow-lg`}
              >
                {initials(person.title)}
              </span>
              <h3 className="mt-5 text-lg font-semibold">{person.title}</h3>
              {person.meta && <p className="text-sm font-medium text-brand-text">{person.meta}</p>}
              {person.description && (
                <p className="mt-3 text-sm text-muted">{person.description}</p>
              )}
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
