# Roadmap

## Done — foundation

- [x] Monorepo, CI, lint/format, strict TypeScript
- [x] Shared questionnaire schemas, categories, palettes, site spec
- [x] API: sessions, dev sign-in, projects, step-by-step answers, generation, preview
- [x] Web: landing, login, projects dashboard, 8-step builder wizard, review, live preview
- [x] Template site generator with category-aware copy and safe HTML rendering

## Next

- [ ] **OAuth sign-in** — Google and GitHub (redirect + callback in `/api/auth/:provider/*`)
- [ ] **Database** — Supabase/Postgres implementation of the `Store` interface, migrations
- [ ] **AI generation** — a `SiteGenerator` that writes tailored copy and sections with Claude
- [ ] **Publishing** — deploy `renderSiteFiles()` output to hosting (e.g. Supabase Storage)
      with a subdomain per site; enable the Publish button
- [ ] **Logo upload** instead of logo URL
- [ ] **Customer dashboard** — the bookings/orders/messages widgets users pick in step 6
- [ ] **Visual editing** — edit sections and copy directly on the preview
- [ ] Improve the questionnaire over time (more categories, conditional questions)
- [ ] End-to-end browser tests (Playwright)
