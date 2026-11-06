import {
  ArrowRight,
  Check,
  Code2,
  Download,
  History,
  MessageSquare,
  Monitor,
  Smartphone,
  Sparkles,
  Tablet,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useAuth } from '../auth/AuthContext';
import { Logo, LogoMark } from '../components/Logo';
import { PromptBox } from '../components/PromptBox';
import { Button } from '../components/ui/button';
import { IDEAS, type Idea } from '../features/builder/ideas';
import { pendingPrompt } from '../features/builder/pendingPrompt';
import { useApi } from '../lib/ApiContext';
import { cn } from '../lib/utils';

/** Hero entrance, in CSS so the landing bundle doesn't need an animation library. */
const fadeUp = (delayMs: number, durationMs = 600) => ({
  style: { animationDelay: `${delayMs}ms`, animationDuration: `${durationMs}ms` },
});

/** The soft, slowly drifting colour field behind the hero. */
function Aurora() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute top-[38%] left-1/2 h-[900px] w-[1400px] -translate-x-1/2">
        <div className="animate-aurora absolute inset-0 opacity-90 blur-[90px] [background:radial-gradient(38%_42%_at_30%_55%,rgba(110,86,255,.55),transparent_70%),radial-gradient(34%_40%_at_55%_45%,rgba(225,70,183,.5),transparent_70%),radial-gradient(36%_42%_at_75%_60%,rgba(255,138,61,.55),transparent_70%)]" />
      </div>
      <div className="bg-dots absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_60%)] opacity-40" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />
    </div>
  );
}

function Nav() {
  const { state } = useAuth();
  const signedIn = state.status === 'authenticated';
  return (
    <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
      <Logo />
      <nav className="hidden items-center gap-7 text-sm text-foreground/70 md:flex">
        <a href="#templates" className="transition hover:text-foreground">
          Templates
        </a>
        <a href="#features" className="transition hover:text-foreground">
          Features
        </a>
        <a href="#how-it-works" className="transition hover:text-foreground">
          How it works
        </a>
      </nav>
      <div className="flex items-center gap-2">
        {signedIn ? (
          <Button asChild size="sm" className="rounded-full px-4">
            <Link to="/projects">Your projects</Link>
          </Button>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <Link to="/login">Get started</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

/** A miniature website mock-up, tinted per idea. */
function TemplateThumb({ idea, index }: { idea: Idea; index: number }) {
  const dark = idea.label === 'AI startup';
  return (
    <div
      className={cn(
        'relative aspect-[16/11] overflow-hidden rounded-xl border bg-gradient-to-br',
        idea.tint,
        dark && 'from-zinc-900 via-violet-950 to-zinc-900',
      )}
    >
      <div className="absolute inset-x-3 top-3 flex items-center justify-between">
        <span className={cn('h-2 w-12 rounded-full', dark ? 'bg-white/70' : 'bg-zinc-900/70')} />
        <span className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={cn('h-1.5 w-6 rounded-full', dark ? 'bg-white/25' : 'bg-zinc-900/20')}
            />
          ))}
        </span>
      </div>
      <div className="absolute top-10 left-3 w-[55%] space-y-1.5">
        <span className={cn('block h-3 w-full rounded', dark ? 'bg-white/85' : 'bg-zinc-900/80')} />
        <span className={cn('block h-3 w-3/4 rounded', dark ? 'bg-white/85' : 'bg-zinc-900/80')} />
        <span
          className={cn('block h-1.5 w-5/6 rounded-full', dark ? 'bg-white/30' : 'bg-zinc-900/25')}
        />
        <span
          className={cn('block h-1.5 w-2/3 rounded-full', dark ? 'bg-white/30' : 'bg-zinc-900/25')}
        />
        <span className="mt-3 block h-4 w-16 rounded-md bg-signature" />
      </div>
      <div
        className={cn(
          'absolute top-9 right-3 h-[58%] w-[34%] rounded-lg shadow-lg',
          dark ? 'bg-white/10 ring-1 ring-white/15' : 'bg-white/80 ring-1 ring-black/5',
        )}
        style={{ transform: `rotate(${index % 2 ? 3 : -3}deg)` }}
      >
        <span
          className={cn('m-2 block h-8 rounded-md', dark ? 'bg-violet-400/40' : 'bg-zinc-900/10')}
        />
        <span
          className={cn(
            'mx-2 block h-1.5 w-2/3 rounded-full',
            dark ? 'bg-white/30' : 'bg-zinc-900/20',
          )}
        />
        <span
          className={cn(
            'mx-2 mt-1 block h-1.5 w-1/2 rounded-full',
            dark ? 'bg-white/30' : 'bg-zinc-900/20',
          )}
        />
      </div>
      <div className="absolute inset-x-3 bottom-3 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={cn('h-6 rounded-md', dark ? 'bg-white/10' : 'bg-white/70')} />
        ))}
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: MessageSquare,
    title: 'Just describe it',
    body: 'Tell Canvas what you need in plain words. Change anything later by asking — “make it darker”, “add pricing”.',
    visual: (
      <div className="space-y-2 text-[11px]">
        <div className="ml-auto w-fit rounded-xl rounded-br-sm bg-muted px-2.5 py-1.5">
          Add a pricing section
        </div>
        <div className="flex items-start gap-1.5">
          <LogoMark className="size-4 rounded-[5px]" />
          <div className="rounded-xl rounded-tl-sm border bg-card px-2.5 py-1.5">
            Done! Added 3 plans ✓
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Code2,
    title: 'Watch it write the code',
    body: 'Every file streams in live. Peek at the code as it’s written, or just watch the preview update.',
    visual: (
      <pre className="overflow-hidden rounded-lg bg-zinc-950 p-2.5 font-mono text-[10px] leading-relaxed text-zinc-400">
        <span className="text-pink-400">&lt;section</span>{' '}
        <span className="text-orange-300">id</span>=
        <span className="text-emerald-300">"pricing"</span>
        <span className="text-pink-400">&gt;</span>
        {'\n  '}
        <span className="text-pink-400">&lt;h2&gt;</span>Simple pricing
        <span className="text-pink-400">&lt;/h2&gt;</span>
        <span className="animate-blink ml-0.5 inline-block h-2.5 w-1 bg-sig-2" />
      </pre>
    ),
  },
  {
    icon: History,
    title: 'Every version saved',
    body: 'Each change is a snapshot. Not a fan of the latest idea? Restore any earlier version in one click.',
    visual: (
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4].map((n) => (
          <span
            key={n}
            className={cn(
              'grid size-7 place-items-center rounded-lg border font-mono text-[11px]',
              n === 4 ? 'bg-signature border-transparent text-white' : 'bg-card',
            )}
          >
            v{n}
          </span>
        ))}
        <span className="h-px flex-1 bg-border" />
      </div>
    ),
  },
  {
    icon: Smartphone,
    title: 'Perfect on every screen',
    body: 'Switch between desktop, tablet and phone previews. Every site is responsive by default.',
    visual: (
      <div className="flex items-end justify-center gap-2 text-muted-foreground">
        <Monitor className="size-9" strokeWidth={1.3} />
        <Tablet className="size-7" strokeWidth={1.3} />
        <Smartphone className="size-5" strokeWidth={1.3} />
      </div>
    ),
  },
  {
    icon: Download,
    title: 'Your code, your call',
    body: 'Clean HTML, Tailwind and a sprinkle of JavaScript. Download the whole project as a ZIP anytime.',
    visual: (
      <div className="flex items-center gap-2 rounded-lg border bg-card px-2.5 py-2 font-mono text-[11px]">
        <Download className="size-3.5 text-muted-foreground" /> bright-smile.zip
        <Check className="ml-auto size-3.5 text-emerald-600" />
      </div>
    ),
  },
  {
    icon: Sparkles,
    title: 'Powered by Claude',
    body: 'Connect Claude for free-form design and copy. Works offline too, with a built-in site engine.',
    visual: (
      <div className="flex items-center gap-2">
        <span className="bg-signature size-7 rounded-full shadow-md shadow-sig-2/30" />
        <span className="text-shimmer text-xs font-medium">Thinking about your brand…</span>
      </div>
    ),
  },
];

const STEPS = [
  {
    title: 'Describe your idea',
    body: 'A sentence is enough: who you are, what you do, the vibe you want.',
  },
  {
    title: 'Watch it build',
    body: 'Canvas plans the site, writes the code and shows you a live preview.',
  },
  {
    title: 'Refine by chatting',
    body: 'Ask for changes in plain words. Every version is saved along the way.',
  },
];

export function LandingPage() {
  const { state } = useAuth();
  const api = useApi();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [starting, setStarting] = useState(false);

  async function start(text: string) {
    if (state.status !== 'authenticated') {
      pendingPrompt.set(text);
      navigate('/login', { state: { from: '/new' } });
      return;
    }
    setStarting(true);
    try {
      const project = await api.createProject({ prompt: text });
      navigate(`/projects/${project.id}`, { state: { autoPrompt: text } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start your project');
      setStarting(false);
    }
  }

  function pickIdea(idea: Idea) {
    setPrompt(idea.prompt);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="min-h-screen overflow-x-clip">
      <div className="relative">
        <Aurora />
        <Nav />
        <section className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-5 pt-16 pb-28 text-center sm:pt-24">
          <a
            {...fadeUp(0, 500)}
            href="#features"
            className="animate-fade-up group inline-flex items-center gap-2 rounded-full border border-foreground/10 bg-card/70 py-1 pr-3 pl-1 text-[13px] text-foreground/80 shadow-sm backdrop-blur transition hover:bg-card"
          >
            <span className="bg-signature rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">
              New
            </span>
            Chat-to-build, with live code streaming
            <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" />
          </a>

          <h1
            {...fadeUp(50)}
            className="animate-fade-up mt-7 text-[2.8rem] leading-[1.02] font-semibold tracking-[-0.035em] text-balance sm:text-7xl"
          >
            Build something{' '}
            <span className="text-signature pr-1 font-serif font-normal tracking-normal italic">
              wonderful
            </span>
            <span className="sr-only"> — your website, built from a conversation</span>
          </h1>
          <p
            {...fadeUp(120)}
            className="animate-fade-up mt-5 max-w-xl text-lg text-pretty text-foreground/65"
          >
            Your website, built from a conversation. Describe it, watch Canvas write it, and refine
            it in plain English — no code required.
          </p>

          <div {...fadeUp(200)} className="animate-fade-up mt-10 w-full">
            <PromptBox value={prompt} onValueChange={setPrompt} onSubmit={start} busy={starting} />
          </div>
        </section>
      </div>

      <section id="templates" className="mx-auto max-w-6xl px-5 py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-sig-1">Start from an idea</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              What people build with Canvas
            </h2>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Clinics, cafés, studios and startups. Pick one to start from — make it yours in a few
            messages.
          </p>
        </div>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {IDEAS.map((idea, i) => (
            <li key={idea.label} className="reveal-on-scroll">
              <button
                type="button"
                onClick={() => pickIdea(idea)}
                className="group w-full rounded-2xl border bg-card p-2.5 text-left transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-zinc-900/5"
              >
                <TemplateThumb idea={idea} index={i} />
                <div className="flex items-center gap-2 px-1.5 pt-3 pb-1">
                  <idea.icon className="size-4 text-muted-foreground" />
                  <span className="font-medium">{idea.label}</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                    Use this <ArrowRight className="size-3" />
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section id="features" className="border-y bg-muted/40 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-medium text-sig-2">Why Canvas</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              A design studio and a developer, in one chat window
            </h2>
          </div>
          <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex flex-col rounded-2xl border bg-card p-6 shadow-xs">
                <div className="flex h-24 flex-col justify-center rounded-xl bg-muted/60 p-4">
                  {f.visual}
                </div>
                <h3 className="mt-5 flex items-center gap-2 font-semibold">
                  <f.icon className="size-4 text-muted-foreground" />
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
          How it works
        </h2>
        <ol className="mt-14 grid gap-8 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="relative">
              <span className="font-serif text-6xl text-foreground/15 italic">0{i + 1}</span>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-16 text-center text-white sm:px-16">
          <div
            aria-hidden
            className="bg-signature absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full opacity-50 blur-[80px]"
          />
          <h2 className="relative text-3xl font-semibold tracking-tight sm:text-5xl">
            Your website is one <span className="font-serif font-normal italic">conversation</span>{' '}
            away
          </h2>
          <p className="relative mx-auto mt-4 max-w-md text-white/60">
            Free to try. No credit card, no templates to wrestle with.
          </p>
          <Button
            size="lg"
            className="relative mt-9 rounded-full bg-white px-7 text-zinc-950 hover:bg-white/90"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            Start building <ArrowRight />
          </Button>
        </div>
      </section>

      <footer className="border-t py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>
            © {new Date().getFullYear()} Canvas Studio. Made for people with better things to do
            than code.
          </p>
        </div>
      </footer>
    </div>
  );
}
