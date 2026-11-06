import { Clock, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { Section, Site } from '../types';
import { Container, Reveal } from './ui';

const inputClass =
  'mt-2 w-full rounded-button border border-line bg-page px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-brand';

export function Contact({ section, contact }: { section: Section; contact: Site['contact'] }) {
  const [sent, setSent] = useState(false);
  const details: [LucideIcon, string | undefined][] = [
    [Mail, contact.email],
    [Phone, contact.phone],
    [MapPin, contact.address],
    [Clock, contact.hours],
  ];

  function submit(event: FormEvent) {
    event.preventDefault();
    setSent(true);
  }

  return (
    <section id="contact" className="bg-alt py-20 sm:py-28">
      <Container className="grid gap-14 lg:grid-cols-2">
        <Reveal>
          {section.eyebrow && (
            <p className="text-sm font-semibold tracking-widest text-brand-text uppercase">
              {section.eyebrow}
            </p>
          )}
          <h2 className="mt-3 text-3xl tracking-tight sm:text-5xl">{section.heading}</h2>
          {section.body && <p className="mt-4 text-lg text-muted">{section.body}</p>}
          <ul className="mt-10 space-y-5">
            {details
              .filter(([, value]) => value)
              .map(([Icon, value]) => (
                <li key={value} className="flex items-center gap-4">
                  <span className="grid h-11 w-11 place-items-center rounded-button bg-brand-soft text-brand-text">
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  {value}
                </li>
              ))}
          </ul>
        </Reveal>

        <Reveal className="rounded-card border border-line bg-card p-8 shadow-sm">
          {sent ? (
            <div className="grid h-full place-items-center py-16 text-center">
              <div>
                <p className="text-2xl font-semibold">Thank you!</p>
                <p className="mt-2 text-muted">We’ll get back to you within one business day.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">
                  Name
                  <input required placeholder="Jane Doe" className={inputClass} />
                </label>
                <label className="block text-sm font-medium">
                  Email
                  <input
                    type="email"
                    required
                    placeholder="jane@example.com"
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block text-sm font-medium">
                Message
                <textarea rows={5} required placeholder="How can we help?" className={inputClass} />
              </label>
              <button className="w-full rounded-button bg-brand px-6 py-3.5 text-sm font-semibold text-on-brand transition hover:bg-brand-strong">
                {section.cta ?? 'Send message'}
              </button>
            </form>
          )}
        </Reveal>
      </Container>
    </section>
  );
}
