import { ArrowUp, LoaderCircle, Sparkles } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { IDEAS, PLACEHOLDERS } from '../features/builder/ideas';
import { cn } from '../lib/utils';

/** Cycles through example prompts, typing each one out. */
function useTypewriter(lines: string[], enabled: boolean): string {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!enabled) return;
    let line = 0;
    let char = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const full = lines[line % lines.length]!;
      if (!deleting) {
        char++;
        setText(full.slice(0, char));
        if (char >= full.length) {
          deleting = true;
          timer = setTimeout(tick, 2200);
          return;
        }
      } else {
        char -= 2;
        setText(full.slice(0, Math.max(0, char)));
        if (char <= 0) {
          deleting = false;
          line++;
        }
      }
      timer = setTimeout(tick, deleting ? 18 : 38);
    };
    timer = setTimeout(tick, 600);
    return () => clearTimeout(timer);
  }, [lines, enabled]);
  return text;
}

export interface PromptBoxProps {
  onSubmit(prompt: string): void;
  busy?: boolean;
  value?: string;
  onValueChange?(value: string): void;
  autoFocus?: boolean;
  showIdeas?: boolean;
  className?: string;
}

export function PromptBox({
  onSubmit,
  busy = false,
  value: controlled,
  onValueChange,
  autoFocus,
  showIdeas = true,
  className,
}: PromptBoxProps) {
  const [uncontrolled, setUncontrolled] = useState('');
  const value = controlled ?? uncontrolled;
  const setValue = onValueChange ?? setUncontrolled;
  const ref = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const placeholder = useTypewriter(PLACEHOLDERS, !value && !focused);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 88), 260)}px`;
  }, [value]);

  function submit() {
    const prompt = value.trim();
    if (!prompt || busy) return;
    onSubmit(prompt);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="group relative rounded-[1.6rem] bg-card/90 p-1 shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_24px_60px_-20px_rgba(60,30,120,.35),0_0_0_1px_rgba(20,20,40,.08)] backdrop-blur-xl transition focus-within:shadow-[0_1px_0_rgba(255,255,255,.6)_inset,0_30px_70px_-20px_rgba(60,30,120,.45),0_0_0_1px_rgba(110,86,255,.35)]"
      >
        <label htmlFor="prompt" className="sr-only">
          Describe the website you want to build
        </label>
        <textarea
          id="prompt"
          ref={ref}
          autoFocus={autoFocus}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={focused ? 'Describe the website you want to build…' : placeholder || ' '}
          className="scrollbar-thin block w-full resize-none bg-transparent px-5 pt-4 pb-2 text-[16px] leading-relaxed outline-none placeholder:text-muted-foreground/80"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <span className="flex items-center gap-1.5 pl-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5 text-sig-2" />
            <span className="max-sm:hidden">
              Press <kbd className="font-sans font-medium text-foreground">Enter</kbd> to build
            </span>
          </span>
          <button
            type="submit"
            disabled={!value.trim() || busy}
            aria-label="Build it"
            className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:scale-105 active:scale-95 disabled:scale-100 disabled:bg-muted-foreground/30 disabled:shadow-none"
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <ArrowUp className="size-4" />
            )}
          </button>
        </div>
      </form>

      {showIdeas && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {IDEAS.map((idea) => (
            <button
              key={idea.label}
              type="button"
              onClick={() => {
                setValue(idea.prompt);
                ref.current?.focus();
              }}
              className="flex items-center gap-1.5 rounded-full border border-foreground/10 bg-card/70 px-3 py-1.5 text-[13px] text-foreground/75 backdrop-blur transition hover:border-foreground/25 hover:bg-card hover:text-foreground"
            >
              <idea.icon className="size-3.5" />
              {idea.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
