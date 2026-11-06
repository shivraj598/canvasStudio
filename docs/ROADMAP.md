# Roadmap

## Done — foundation

- [x] Monorepo, CI, lint/format, strict TypeScript
- [x] Shared questionnaire schemas, categories, palettes, site spec
- [x] API: sessions, dev sign-in, projects, step-by-step answers, generation, preview
- [x] Web: landing, login, projects dashboard, 8-step builder wizard, review, live preview
- [x] Template site generator with category-aware copy and safe HTML rendering

## Done — chat builder

- [x] Prompt-first landing page and dashboard; prompts survive sign-in
- [x] Workspace: streaming chat, live code view, sandboxed device previews, version history
- [x] Claude build engine with streaming, abort and refusal fallback
- [x] Offline Canvas Local engine with prompt understanding and structured edits
- [x] Download as ZIP

## Done — storage

- [x] **Development database** — SQLite (`node:sqlite`) at `apps/api/.data/canvas.db` keeps
      users, sessions and projects across `pnpm dev` restarts
- [x] **Database** — Supabase/Postgres implementation of the `Store` interface plus the schema
      in `supabase/migrations`. It turns on when `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
      are set. It has not been tried against a live Supabase project yet.

## Next

- [ ] **Connect a Supabase project** — apply the migration, set the env vars and test it live
      (see [supabase/README.md](../supabase/README.md))
- [ ] **OAuth sign-in** — Google and GitHub (redirect + callback in `/api/auth/:provider/*`)
- [ ] **Visual edit mode** — click an element in the preview to target the next chat message
- [ ] **Image uploads** in chat (screenshots and brand assets as context)
- [ ] **Editable code view** with manual edits saved as versions
- [ ] **Publishing** — deploy `renderSiteFiles()` output to hosting (e.g. Supabase Storage)
      with a subdomain per site; enable the Publish button
- [ ] **Logo upload** instead of logo URL
- [ ] **Customer dashboard** — the bookings/orders/messages widgets users pick in step 6
- [ ] **Visual editing** — edit sections and copy directly on the preview
- [ ] Improve the questionnaire over time (more categories, conditional questions)
- [ ] End-to-end browser tests (Playwright)
