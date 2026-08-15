# Deployment

Two services, two jobs:

- **Supabase** stores the data and handles logins.
- **Vercel** serves the app itself.

You need both. Both are free at family scale.

---

## 1. Supabase

### Create the project

1. Sign in at [supabase.com](https://supabase.com) and create a new project.
2. Pick a region close to you (`eu-central-1` for Israel/Europe).
3. Save the database password somewhere safe — you will rarely need it, but it
   cannot be recovered.

### Apply the schema

Open the SQL editor and run the files in `supabase/migrations/` **in numeric
order**, one at a time:

| File | What it creates |
|---|---|
| `0001_init.sql` | Enums, all tables, indexes, the `child_star_balances` view |
| `0002_rls.sql` | Row Level Security policies for every table |
| `0003_functions.sql` | Triggers and the `SECURITY DEFINER` RPCs |
| `0004_function_grants.sql` | Execute grants for the RPCs |
| `0005_push_hooks.sql` | pg_net / pg_cron plumbing and notification triggers |
| `0006_fk_indexes.sql` | Covering indexes used by cascade deletes |
| `0007_sport_reps.sql` | Repetition-based sport tasks and constraints |
| `20260815164345_child_email_login.sql` | Optional child identities and child-scoped RLS policies |

If you have the Supabase CLI linked to the project, `supabase db push` does the
same thing in one step.

### Deploy the Edge Functions

```bash
supabase functions deploy delete-account
supabase functions deploy manage-child-login
supabase functions deploy notify-events
supabase functions deploy send-reminders
```

All four should keep `verify_jwt` enabled (the default).

- `delete-account` — performs the real cascade deletion of a family and all
  linked parent and child accounts.
- `manage-child-login` — lets a signed-in parent create, update or revoke an
  optional email/password account linked to one child.
- `notify-events` — called by database triggers to fan out family push events.
- `send-reminders` — called on a schedule to send the daily slot reminders.

### Auth settings

In **Authentication → Providers → Email**, decide whether to require email
confirmation. The app handles both: with confirmation on, new parents land on a
"check your inbox" screen; with it off, they go straight to onboarding. For a
small family app, turning it off is the friendlier option.

Add your production URL under **Authentication → URL Configuration → Site URL**
once you have deployed, otherwise password-reset and confirmation links point at
`localhost`.

### Collect the keys

**Project Settings → API** gives you the two values the frontend needs:
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The anon key is designed to be
public — Row Level Security is what protects the data, not key secrecy.

### The free-tier pause

A free Supabase project pauses after about a week with no traffic. It comes back
with one click in the dashboard, and daily family use means it never happens. If
the app suddenly cannot log in after a quiet holiday, check this first.

---

## 2. Vercel

1. Push this repository to GitHub.
2. At [vercel.com](https://vercel.com), **Add New → Project**, and import the repo.
3. Vercel reads `vercel.json` and detects Vite; the build command
   (`npm run build`) and output directory (`dist`) need no changes.
4. Under **Environment Variables**, add all three, for Production, Preview and
   Development:

   ```
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY
   VITE_VAPID_PUBLIC_KEY
   ```

   These are compiled into the client bundle at build time, so **after changing
   any of them you must redeploy** — restarting is not enough.
5. Deploy.

### After the first deploy

- Copy the deployment URL into Supabase's **Site URL** setting (above).
- Open the URL on a phone and install it — see
  [`testing-guide.md`](testing-guide.md) for the per-platform steps.
- Set up push properly by following [`push-setup.md`](push-setup.md).

### A custom domain

Under **Settings → Domains**, add a domain you own and follow the DNS
instructions. Vercel issues the HTTPS certificate automatically. Remember to
update Supabase's Site URL again afterwards.

---

## What `vercel.json` sets up

- **SPA rewrites** so deep links like `/parent/settings` work on a hard refresh.
  Vercel checks the filesystem first, so `sw.js`, `manifest.webmanifest`, the
  icons and the hashed assets are still served as real files.
- **Immutable caching** for `/assets/*` (their filenames contain a content hash).
- **No caching** for `sw.js` and `manifest.webmanifest`, so app updates are picked
  up promptly rather than being pinned by a stale cache.
- **Security headers**, including a `Permissions-Policy` that switches off
  geolocation, microphone and camera. The app never asks for them, and this makes
  that explicit to the browser.
