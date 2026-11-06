-- Canvas Studio: accounts, sessions and projects.
--
-- The API talks to these tables with the service-role key only. Row-level security is enabled
-- with no policies, so the public anon/authenticated roles (the keys a browser holds) can read
-- or write nothing here.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  name text not null,
  avatar_url text,
  -- 'google' | 'github' | 'dev'
  provider text not null,
  created_at timestamptz not null default now()
);

-- API sessions. Only the sha256 hash of the bearer token is stored.
create table public.sessions (
  token_hash text primary key,
  user_id uuid not null references public.users (id) on delete cascade,
  expires_at timestamptz not null
);

create index sessions_expires_at_idx on public.sessions (expires_at);
create index sessions_user_id_idx on public.sessions (user_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft', 'generated')),
  prompt text,
  answers jsonb not null default '{}'::jsonb,
  completed_steps jsonb not null default '[]'::jsonb,
  site jsonb,
  files jsonb not null default '[]'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  versions jsonb not null default '[]'::jsonb,
  current_version_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_updated_idx on public.projects (owner_id, updated_at desc);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.projects enable row level security;

-- Belt and braces: the browser-facing roles get no table privileges at all.
revoke all on table public.users, public.sessions, public.projects from anon, authenticated;
