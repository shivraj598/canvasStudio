# Supabase (optional)

Canvas Studio can keep its users, sessions and projects in a [Supabase](https://supabase.com)
Postgres database instead of the local SQLite file (`apps/api/.data/canvas.db`). This is
optional and off by default. Nothing here is needed for local development.

## 1. Apply the schema

Pick one:

- **Dashboard**: open your project, go to **SQL Editor**, paste the contents of
  `migrations/20261106000000_init.sql` and run it.
- **CLI**: from the repository root, run `supabase link --project-ref <ref>` once and then
  `supabase db push`.

Row-level security is on for every table and there are no policies. Only the server's
service-role key can read or write them. Never send that key to the browser.

## 2. Point the API at it

In `apps/api/.env` (see `apps/api/.env.example`), add the values from
**Project Settings → API**:

```sh
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role / secret key>
```

When both are set, the API logs `Storing data: Supabase Postgres at …` on startup. Remove them
to go back to SQLite. Data is not copied between the two.
