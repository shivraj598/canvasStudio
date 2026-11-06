# Canvas Studio

Build a website for your clinic, classroom, restaurant, hotel or business by answering a few
questions — no code required.

Canvas Studio is for people who want a professional website without touching code: doctors,
teachers, restaurant and hotel owners, consultants, shops, freelancers and community groups.

## How it works (new user flow)

1. **Land** on the home page and click _Start building_.
2. **Sign in** with Google or GitHub _(buttons are in place; OAuth is configured later — a
   developer sign-in is available locally)_.
3. **Answer the questionnaire**, one step at a time. Answers are saved after every step, so
   users can leave and resume later:

   | #   | Step             | What we ask                                                    |
   | --- | ---------------- | -------------------------------------------------------------- |
   | 1   | Your brand       | Brand name, tagline, logo                                      |
   | 2   | Business type    | Doctor, teacher, restaurant, hotel, salon, consultant, …       |
   | 3   | What you do      | Description, customers, what makes you different, location     |
   | 4   | Goals            | Bookings, new customers, sell online, … plus expectations      |
   | 5   | Pages & features | Pages (pre-selected per business type), booking, ordering, map |
   | 6   | Dashboard        | Whether they want one, and which widgets                       |
   | 7   | Look & feel      | Colour palette (or custom colours), style, fonts               |
   | 8   | Contact          | Email, phone, address, social links                            |

4. **Review & generate** — we build the site from the answers.
5. **Preview** it on desktop, tablet and mobile. _(Publishing to hosting comes next.)_

## Tech stack

| Area     | Choice                                                     |
| -------- | ---------------------------------------------------------- |
| Language | TypeScript everywhere                                      |
| Monorepo | pnpm workspaces                                            |
| Frontend | React 19, Vite, Tailwind CSS 4, React Router               |
| Backend  | Fastify 5, Zod                                             |
| Shared   | `@canvas/shared` — questionnaire schemas, types, palettes  |
| Storage  | In-memory repositories behind an interface (Supabase next) |
| Testing  | Vitest, Testing Library, Fastify `inject`                  |
| CI       | GitHub Actions: format, lint, typecheck, test, build       |

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

Open http://localhost:5173, click **Sign in** and use the developer sign-in form with any
name and email.

Optional API settings live in `apps/api/.env` — copy `apps/api/.env.example` to get started.

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

| Method | Route                    | Description                                  |
| ------ | ------------------------ | -------------------------------------------- |
| GET    | `/health`                | Health check                                 |
| GET    | `/auth/providers`        | Sign-in options and whether they are enabled |
| POST   | `/auth/dev-login`        | Developer sign-in (disabled in production)   |
| GET    | `/auth/me`               | Current user                                 |
| POST   | `/auth/logout`           | End the session                              |
| GET    | `/projects`              | My websites                                  |
| POST   | `/projects`              | Start a new website                          |
| GET    | `/projects/:id`          | Get one                                      |
| PATCH  | `/projects/:id`          | Rename                                       |
| DELETE | `/projects/:id`          | Delete                                       |
| PUT    | `/projects/:id/answers`  | Save one questionnaire step `{ step, data }` |
| POST   | `/projects/:id/generate` | Generate the site from complete answers      |
| GET    | `/projects/:id/preview`  | Generated site as sandboxed HTML             |

## Troubleshooting

- **Tests fail with `React.act is not a function`** or **developer sign-in is missing** — your
  shell probably exports `NODE_ENV=production`. The project's scripts override it, but check
  with `echo $NODE_ENV` if you run tools directly.
