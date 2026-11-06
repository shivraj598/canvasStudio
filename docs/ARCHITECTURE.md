# Architecture

```
 ┌───────────────┐   HTTP /api (JSON, Bearer token)   ┌─────────────────────────────┐
 │  apps/web     │ ─────────────────────────────────▶ │  apps/api (Fastify)         │
 │  React + Vite │                                    │                             │
 │               │ ◀── preview HTML (sandboxed) ───── │  routes ─▶ Store interface  │
 └──────┬────────┘                                    │        └─▶ SiteGenerator    │
        │                                             └──────────┬──────────────────┘
        │          both import @canvas/shared                    │
        └──────────────────────┬─────────────────────────────────┘
                               ▼
                 packages/shared: questionnaire schemas, categories,
                 palettes, SiteSpec and API contracts
```

## One source of truth: `@canvas/shared`

The questionnaire is defined once, as Zod schemas per step (`packages/shared/src/questionnaire.ts`).

- The **web app** validates each step before saving, renders options from the same lists
  (categories, pages, features, widgets, palettes) and shows the same error messages.
- The **API** validates again on save and normalises the data (e.g. Home is always included,
  widgets are cleared when no dashboard is wanted).
- `getCompletedSteps` / `getNextIncompleteStep` / `isQuestionnaireComplete` drive progress on
  both sides.

To add a question: add the field to the step schema, render it in the step component in
`apps/web/src/features/questionnaire/steps/`, use it in the generator, and add tests at each
layer.

## API (`apps/api`)

- `buildApp({ config, store, generator })` builds a Fastify instance. Every dependency is
  injectable, which is how tests run against isolated in-memory instances via `app.inject`.
- **Auth**: opaque random bearer tokens; only their SHA-256 hash is stored. `request.user` is
  resolved by a plugin on every request and `requireUser()` guards routes. Google/GitHub are
  listed but disabled until `*_CLIENT_ID`/`*_CLIENT_SECRET` are set; `/auth/:provider/start` is
  the hook point for the OAuth flow.
- **Store**: `Store` (users, sessions, projects) is an async repository interface. The
  in-memory implementation is used now; a Supabase/Postgres implementation can replace it
  without touching routes.
- **Ownership**: other users' projects are reported as 404, never 403.
- **Errors**: always `{ error: { code, message, details? } }`; validation errors include
  `details.fields` keyed by field path.

## Site generation

```
answers ──buildSiteSpec()──▶ SiteSpec ──renderSinglePage()──▶ preview HTML
                                    └──renderSiteFiles()───▶ index.html, about.html, …
```

- `SiteSpec` is a structured, renderer-agnostic description: brand, theme (palette, style,
  fonts), navigation, pages made of typed sections, features and dashboard widgets. It is
  stored on the project.
- The **template generator** fills sections from category-specific starter copy. It sits
  behind the `SiteGenerator` interface so an AI copywriter (e.g. Claude) can be plugged in
  without changing routes or renderers.
- The **renderer** escapes every interpolated value through an `html` tagged template.
  User-provided URLs are restricted to http(s) at validation time.
- The **preview** is served with a strict CSP (no scripts) and shown in an iframe with no
  `allow-scripts`/`allow-same-origin`.

## Web (`apps/web`)

- `ApiProvider` supplies a typed `ApiClient`; tests inject a fake (`src/test/utils.tsx`).
- `AuthProvider` restores the session from the stored token; `RequireAuth` guards the app.
- Routes: `/` landing, `/login`, `/projects`, `/projects/:id/build` (wizard),
  `/projects/:id/preview`.
- The wizard (`BuilderPage`) keeps local form state per step, validates with the shared
  schema, saves each step and re-initialises from what the server stored.
