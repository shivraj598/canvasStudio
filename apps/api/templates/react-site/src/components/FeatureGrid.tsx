import type { Section } from '../types';
import { Container, ICONS, Reveal, SectionHeading, cx } from './ui';

export function FeatureGrid({ section }: { section: Section }) {
  const count = section.items?.length ?? 0;
  const columns = count === 4 || count === 8 ? 'lg:grid-cols-4' : 'lg:grid-cols-3';
  return (
    <section
      id={section.kind}
      className={cx('py-20 sm:py-28', section.kind === 'services' && 'bg-alt')}
    >
      <Container>
        <SectionHeading section={section} />
        <div className={cx('mt-16 grid gap-6 sm:grid-cols-2', columns)}>
          {section.items?.map((item) => {
            const Icon = ICONS[item.icon ?? 'check'];
            return (
              <Reveal
                key={item.title}
                className="rounded-card border border-line bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="grid h-11 w-11 place-items-center rounded-button bg-brand-soft text-brand-text">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                {item.description && (
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.description}</p>
                )}
                {item.meta && (
                  <p className="mt-4 text-sm font-semibold text-brand-text">{item.meta}</p>
                )}
              </Reveal>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
