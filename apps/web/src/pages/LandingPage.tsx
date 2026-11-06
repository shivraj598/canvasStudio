import { CATEGORY_INFO } from '@canvas/shared';
import { Link } from 'react-router';
import { Logo } from '../components/Logo';

const STEPS = [
  { title: 'Sign in', body: 'Use your Google or GitHub account — no new password to remember.' },
  {
    title: 'Answer a few questions',
    body: 'Your brand, what you do, the pages you need and the colours you love.',
  },
  { title: 'Get your website', body: 'We build it instantly. Preview it, tweak it and go live.' },
];

const AUDIENCES = ['doctor', 'teacher', 'restaurant', 'hotel', 'salon', 'consultant'] as const;

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <Link to="/login" className="text-sm font-medium text-gray-700 hover:text-brand-700">
          Sign in
        </Link>
      </header>

      <main>
        <section className="mx-auto max-w-4xl px-6 pt-16 pb-20 text-center">
          <p className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
            No code. No designers. No stress.
          </p>
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Your website,{' '}
            <span className="bg-gradient-to-r from-brand-600 to-coral-500 bg-clip-text text-transparent">
              built from a conversation
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
            Canvas Studio builds professional websites for clinics, classrooms, restaurants, hotels
            and businesses of every kind. Tell us about yourself — we handle the rest.
          </p>
          <div className="mt-10 flex justify-center gap-3">
            <Link
              to="/login"
              className="rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Start building — it’s free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-gray-300 px-6 py-3 font-medium hover:bg-gray-50"
            >
              How it works
            </a>
          </div>
        </section>

        <section aria-labelledby="audiences" className="border-y border-gray-100 bg-gray-50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 id="audiences" className="text-center text-2xl font-semibold">
              Made for people who’d rather be doing their actual job
            </h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {AUDIENCES.map((id) => (
                <li key={id} className="rounded-xl border border-gray-200 bg-white p-5">
                  <h3 className="font-semibold">{CATEGORY_INFO[id].label}</h3>
                  <p className="mt-1 text-sm text-gray-600">{CATEGORY_INFO[id].description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" aria-labelledby="how" className="mx-auto max-w-6xl px-6 py-20">
          <h2 id="how" className="text-center text-2xl font-semibold">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-gray-200 p-6">
                <span className="grid size-8 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Canvas Studio
      </footer>
    </div>
  );
}
