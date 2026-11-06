import { site } from '../content';
import { Container } from './ui';

export function Footer() {
  return (
    <footer className="border-t border-line py-12">
      <Container className="flex flex-col items-center justify-between gap-6 text-sm text-muted md:flex-row">
        <p>
          <span className="font-heading text-base text-ink">{site.name}</span> · ©{' '}
          {new Date().getFullYear()}
        </p>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-6">
          {site.nav.map((link) => (
            <a key={link.href} href={link.href} className="hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>
      </Container>
    </footer>
  );
}
