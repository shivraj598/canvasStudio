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

## Chat builder

```
prompt ─▶ POST /projects/:id/chat ─▶ runBuild() ─▶ BuildEngine.stream()  (Claude | Canvas Local)
                │                         │
                │ SSE: start, text,       └─▶ createArtifactParser(): prose ↔ <canvasAction> files
                │ file_start/delta/end,        ─▶ apply files, record version, save messages
                ▼ done/error
       useBuild() in the workspace ─▶ chat, live code view, sandboxed preview
```

- **Projects are files.** `Project.files` holds the current site; `messages` the conversation;
  `versions` full snapshots (capped at 50). Restoring a version records it as a new version.
- **Artifact protocol.** Engines stream prose plus `<canvasArtifact>` / `<canvasAction
type="file" path="…">` blocks with whole-file contents (the approach Bolt uses). The parser in
  `@canvas/shared` handles tags split across chunks. Paths are validated (`isSafePath`), and
  files/sizes are capped.
- **Engines** (`apps/api/src/ai`). The NIM engine (`nim.ts`) streams an OpenAI-compatible model
  on integrate.api.nvidia.com, forwarding `reasoning_content` as `reasoning` events. The Claude
  engine streams `claude-opus-5-5` with the API's refusal fallback. Both build their input with
  `conversation.ts` (history, current files, matching design reference) and share the system
  prompt file loaded by `prompts.ts`. Canvas Local turns prompts into a `site.config.json` model
  (`intent.ts`) and renders a React project from it (`project.ts` + `apps/api/templates/react-site`),
  so follow-ups only regenerate `src/content.ts` / `src/index.css`.
- **Generated projects** are Vite + React + TypeScript + Tailwind v4. In the web app,
  `reactPreview.ts` compiles them with Sucrase into a module registry, maps bare imports to esm.sh
  through an import map (React marked external so there is one copy), and feeds CSS to Tailwind's
  browser build. Errors are posted to the parent window as `canvas:preview-error`.
- **Streaming.** The route hijacks the reply to write server-sent events, sends a heartbeat while
  the model thinks, allows one build per project, and aborts the engine if the client
  disconnects (completed files are kept). Leaving the page without stopping lets the build finish.
- **Preview isolation.** Generated sites may run scripts, so they are rendered from `srcdoc` in an
  iframe with `allow-scripts` but never `allow-same-origin`; “open in new tab” wraps the site in a
  sandboxed iframe for the same reason.
