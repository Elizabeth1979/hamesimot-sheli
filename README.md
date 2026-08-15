# KidTasks — המשימות שלי

A Hebrew-first, RTL daily task tracker for families. Parents define each child's
routines, tasks, timers and rewards; children work through their own day in a
simple, emoji-driven interface and earn stars they can spend on prizes the parent
sets up.

It is an installable **Progressive Web App** — it runs in any modern browser and
can be added to the home screen on Android, iOS, Windows and macOS. There is no
app-store account required and no native project to build.

## Features

**For children**
- **My Day** — today's tasks grouped into morning / afternoon / evening, with a
  progress ring and a celebration when a task is finished.
- **Task types** — a simple check-off, a checklist with sub-steps, a countdown
  timer (teeth brushing), or a sport task with sets and rest intervals.
- **Routine play mode** — steps through an ordered routine (e.g. שגרת ערב) one
  task at a time.
- **Stars and rewards** — stars earned from tasks, spendable on prizes; requests
  go to a parent for approval.
- **Journal** — a daily mood picker and a free-text note.
- **Optional personal login** — a parent can give a child an email/password login
  that opens only that child's profile.

**For parents**
- Dashboard with each child's progress for today and a queue of pending approvals.
- Full CRUD for children, tasks, routines and rewards.
- Weekly progress and streaks per child.
- A PIN gate in front of all parent screens.
- Invite a second parent by a single-use, expiring link.
- Data export, child deletion, and real account deletion.

**Platform**
- Works offline: previously loaded data stays visible, completions and journal
  entries queue locally and sync when the connection returns.
- Web Push reminders and family events (task awaiting approval, task approved).
- Hebrew and English, light and dark themes.

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript, Vite 7 |
| Routing | react-router 7 |
| Server state | TanStack Query 5 (persisted to localStorage for offline reads) |
| Offline writes | Small native IndexedDB outbox queue |
| PWA | vite-plugin-pwa with a custom Workbox service worker (`src/sw.ts`) |
| Backend | Supabase — Postgres, Auth, Row Level Security, Edge Functions |
| Hosting | Vercel (static) |

**Vercel and Supabase are both required and do different jobs.** Vercel serves the
built static app over HTTPS (needed for installability, service workers and push).
Supabase holds the data and the accounts. Without Supabase each device would have
its own private copy of the data, so a parent could never see or approve what a
child did.

## Getting started

Requires Node 22+.

```bash
npm install
cp .env.example .env      # then fill in the values below
npm run dev
```

### Environment variables

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `VITE_SUPABASE_ANON_KEY` | same page (the publishable / anon key) |
| `VITE_VAPID_PUBLIC_KEY` | generate with `node scripts/generate-vapid-keys.mjs` |

`.env` is gitignored and must stay that way. The VAPID **private** key never goes
in this file — it belongs in Supabase Edge Function secrets. Leaving
`VITE_VAPID_PUBLIC_KEY` empty is safe: push simply reports itself as not
configured and the rest of the app works normally.

### Database setup

The SQL in `supabase/migrations/` is the source of truth and is already applied to
the project this repo was developed against. To set up a fresh project, apply the
migrations in numeric order and deploy the four functions in
`supabase/functions/`. See [`docs/deployment.md`](docs/deployment.md).

## Commands

```bash
npm run dev        # dev server
npm run build      # typecheck + production build into dist/
npm run preview    # serve the production build locally
npm run lint       # eslint
npm run typecheck  # tsc
npm test           # vitest
npm run test:db    # local Supabase pgTAP security tests
npm run lint:db    # local Postgres schema/function lint
```

## Documentation

- [`docs/deployment.md`](docs/deployment.md) — deploying to Vercel and setting up Supabase
- [`docs/push-setup.md`](docs/push-setup.md) — VAPID keys, Edge Function secrets, the reminder cron
- [`docs/testing-guide.md`](docs/testing-guide.md) — manual test flows, installing on each platform

## Privacy

The app is built for children's data and is deliberately narrow: no ads, no
analytics, no third-party trackers, no advertising IDs, no public profiles, no
chat, and no way for a child to contact anyone outside their family. Only a parent
can create a family or invite another parent. Data collected is limited to what
the app needs to work — account emails, first names, and the tasks and
completions themselves. Deletion is real deletion, not deactivation.

The parent PIN is a convenience gate on a shared parent device. Independently
signed-in child accounts are also restricted by Row Level Security to their own
child profile; parent accounts remain scoped to their family.
