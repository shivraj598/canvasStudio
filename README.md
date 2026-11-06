# Canvas Studio

Build a website for your clinic, classroom, restaurant, hotel or business by answering a few
questions — no code required.

> 🚧 Early development. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) once available.

## Monorepo layout

| Path              | Package          | What it is                                   |
| ----------------- | ---------------- | -------------------------------------------- |
| `apps/web`        | `@canvas/web`    | React + Vite front end (the builder UI)      |
| `apps/api`        | `@canvas/api`    | Fastify REST API (auth, projects, generator) |
| `packages/shared` | `@canvas/shared` | Zod schemas & types shared by web and api    |

## Getting started

```bash
pnpm install
pnpm dev        # runs api (http://localhost:4000) and web (http://localhost:5173)
pnpm test       # runs every test suite
```
