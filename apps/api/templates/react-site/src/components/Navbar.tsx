import { Menu as MenuIcon, X } from 'lucide-react';
import { useState } from 'react';
import { site } from '../content';
import { ButtonLink, Container } from './ui';

export function Navbar() {
  const [open, setOpen] = useState(false);
  const hero = site.sections.find((section) => section.kind === 'hero');

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-page/75 backdrop-blur-xl">
      <Container className="flex h-16 items-center justify-between gap-6">
        <a href="#" className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-button bg-brand text-sm font-bold text-on-brand">
            {site.name.charAt(0)}
          </span>
          <span className="font-heading text-lg tracking-tight">{site.name}</span>
        </a>

        <nav aria-label="Main" className="hidden items-center gap-8 text-sm md:flex">
          {site.nav.map((link) => (
            <a key={link.href} href={link.href} className="text-muted transition hover:text-ink">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="#contact" className="hidden !px-4 !py-2 sm:inline-flex">
            {hero?.cta ?? 'Get started'}
          </ButtonLink>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded-button p-2 text-muted md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        </div>
      </Container>

      {open && (
        <nav aria-label="Mobile" className="border-t border-line bg-page px-6 py-3 md:hidden">
          {site.nav.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="block rounded-button px-3 py-2.5 text-sm hover:bg-alt"
            >
              {link.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
