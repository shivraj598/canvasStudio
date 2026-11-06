# Canvas Studio

Describe the website you want and watch AI build it — then refine it by chatting. Canvas Studio
is a Lovable/Bolt-style builder for clinics, cafés, studios, startups and anyone who would rather
not write code.

## How it works

1. **Describe it.** Type a prompt on the landing page or dashboard — _“A cozy café called Little
   Fig in Brooklyn with a seasonal menu and reservations”_. Signed-out visitors keep their prompt
   through sign-in.
2. **Watch it build.** The workspace opens and the build starts immediately. The assistant
   explains its plan while every file streams in live — follow along in the **Code** tab or wait
   for the **Preview**.
3. **Refine by chatting.** _“Make it dark”, “add a pricing section”, “change the headline to
   …”_. Each change that touches files creates a **version** you can restore at any time.
4. **Preview & export.** Switch between desktop, tablet and mobile, open the site in a new tab,
   or download the code as a ZIP. _(One-click publishing comes next.)_

The original step-by-step questionnaire is still available as **Guided setup** and produces a
site in the same workspace.

### What gets built

Every website is a **real npm project**: Vite + React 19 + TypeScript (strict) + Tailwind CSS v4,
with lucide-react icons. Download it as a ZIP and run `npm install && npm run dev` — the same
code that runs in the preview passes `tsc` and `vite build`. (Node.js + Express and Supabase come
next; today the generated sites are frontend-only.)

The workspace preview compiles the project in the browser (Sucrase), loads packages from esm.sh
at the versions in its `package.json`, and runs Tailwind's browser build — all inside a sandboxed
iframe. Runtime errors surface with a **Fix it** button that sends them back to the AI.

### Build engines

| Engine           | When                                       | What it does                                                                                              |
| ---------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| **Gemini**       | `GEMINI_API_KEY` is set                    | `gemini-3.8-flash` (falls back to `gemini-3.6-flash` when busy) writes the project; thoughts stream live. |
| **NVIDIA NIM**   | `NVIDIA_API_KEY` is set (and no Gemini)    | Any NIM chat model (default `minimaxai/minimax-m3.1-flash`) writes the whole project.                     |
| **Claude**       | `ANTHROPIC_API_KEY` is set (and no others) | `claude-opus-5-5` writes the project and makes free-form edits.                                           |
| **Canvas Local** | No key                                     | Offline and deterministic: typed section components plus generated content/theme.                         |

`AI_ENGINE=gemini|nim|claude|local` forces one. The AI engines share one system prompt,
[`apps/api/prompts/website-builder.md`](apps/api/prompts/website-builder.md), and **design
references** in `apps/api/prompts/design/<name>/` (notes + screenshots, matched by keywords and
sent to vision models on a fresh build). Add a folder there to teach the builder a new look.

## Tech stack

| Area     | Choice                                                       |
| -------- | ------------------------------------------------------------ |
| Language | TypeScript everywhere                                        |
| Monorepo | pnpm workspaces                                              |
| Frontend | React 19, Vite, Tailwind CSS 4, Radix (shadcn-style), Motion |
| Backend  | Fastify 5, Zod, Anthropic SDK (Claude), server-sent events   |
| Shared   | `@canvas/shared` — questionnaire schemas, types, palettes    |
| Storage  | Repositories behind an interface: SQLite (dev), Supabase     |
| Testing  | Vitest, Testing Library, Fastify `inject`                    |
| CI       | GitHub Actions: format, lint, typecheck, test, build         |

## Monorepo layout

```
apps/
  api/        @canvas/api     Fastify REST API: auth, projects, site generator
  web/        @canvas/web     React builder UI
packages/
  shared/     @canvas/shared  Zod schemas & types used by both apps
docs/         Architecture notes and roadmap
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together and
[docs/ROADMAP.md](docs/ROADMAP.md) for what is next.

## Getting started

Requirements: Node 22+ and pnpm 11 (`corepack enable` picks up the pinned version).

```bash
pnpm install
pnpm dev          # API on http://localhost:4000, web on http://localhost:5173
```

Open http://localhost:5173, type what you want to build and sign in with the developer form
(**Use demo account** fills it in).

To build with an AI model, put `GEMINI_API_KEY=...` (or `NVIDIA_API_KEY=...` / `ANTHROPIC_API_KEY=...`) in
`apps/api/.env` — it is gitignored. Without a key the offline Canvas Local engine is used.

Optional API settings live in `apps/api/.env` — copy `apps/api/.env.example` to get started.

Accounts, sessions and projects are saved in a SQLite database at `apps/api/.data/canvas.db`
(Node's built-in `node:sqlite`, so there is nothing to install). They survive restarts. The
folder is gitignored. Set `DATA_DIR` to keep the database somewhere else, or delete the folder
to start fresh. Tests use an in-memory store.

**Optional: Supabase.** The API also has a Postgres store for Supabase. It stays off unless
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set. See
[supabase/README.md](supabase/README.md).

## Scripts

| Command            | What it does                              |
| ------------------ | ----------------------------------------- |
| `pnpm dev`         | Run API and web in watch mode             |
| `pnpm test`        | Run every test suite                      |
| `pnpm typecheck`   | Type-check all packages                   |
| `pnpm lint`        | ESLint                                    |
| `pnpm format`      | Prettier (write); `format:check` to check |
| `pnpm build`       | Production builds of api and web          |
| `pnpm dev:api/web` | Run just one app                          |

## API overview

All routes are under `/api`. Protected routes need `Authorization: Bearer <token>`.

| Method | Route                                       | Description                                  |
| ------ | ------------------------------------------- | -------------------------------------------- |
| GET    | `/health`                                   | Health check                                 |
| GET    | `/auth/providers`                           | Sign-in options and whether they are enabled |
| POST   | `/auth/dev-login`                           | Developer sign-in (disabled in production)   |
| GET    | `/auth/me`                                  | Current user                                 |
| POST   | `/auth/logout`                              | End the session                              |
| GET    | `/projects`                                 | My websites                                  |
| POST   | `/projects`                                 | Start a new website (optional `prompt`)      |
| GET    | `/projects/:id`                             | Get one                                      |
| PATCH  | `/projects/:id`                             | Rename                                       |
| DELETE | `/projects/:id`                             | Delete                                       |
| PUT    | `/projects/:id/answers`                     | Save one questionnaire step `{ step, data }` |
| POST   | `/projects/:id/generate`                    | Generate the site from complete answers      |
| GET    | `/projects/:id/preview`                     | Guided-setup site as sandboxed HTML          |
| GET    | `/builder`                                  | Which build engine is active                 |
| POST   | `/projects/:id/chat`                        | Send `{ prompt }`; streams the build (SSE)   |
| POST   | `/projects/:id/versions/:versionId/restore` | Restore a version as a new version           |

## Troubleshooting

- **Tests fail with `React.act is not a function`** or **developer sign-in is missing** — your
  shell probably exports `NODE_ENV=production`. The project's scripts override it, but check
  with `echo $NODE_ENV` if you run tools directly.
