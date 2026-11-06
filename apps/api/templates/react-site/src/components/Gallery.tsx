import type { Section } from '../types';
import { Container, Photo, Reveal, SectionHeading, cx } from './ui';

export function Gallery({ section }: { section: Section }) {
  return (
    <section id="gallery" className="py-20 sm:py-28">
      <Container>
        <SectionHeading section={section} />
        <div className="mt-16 grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-3">
          {section.items?.map((item, index) => (
            <Reveal
              key={item.title}
              className={cx(
                'group relative overflow-hidden rounded-card',
                index === 0 && 'row-span-2',
                index === 3 && 'md:col-span-2',
              )}
            >
              <Photo src={item.image} alt={item.title} className="absolute inset-0" />
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-sm font-medium text-white opacity-0 transition group-hover:opacity-100">
                {item.title}
              </p>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
