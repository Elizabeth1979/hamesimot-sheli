# KidTasks — Plan

> Status: 2026-08-21 · Owner: Elizabeth · Format: `session-plan-workflow`
> Live: <https://hamesimot-sheli.vercel.app> · Supabase: `kidtasks` (`xxcgibaqhedwjrslmubv`)

## TL;DR

- **This repo is now the only KidTasks.** The Next.js prototype is archived (private) at
  `Elizabeth1979/kidtasks-nextjs-prototype`; the two never shared git history.
- **The app is live and you are already using it** — 1 family, 2 children, 13 tasks,
  5 completions.
- **Production is running behind this repo.** A merged migration and an Edge Function
  were never deployed, so magic-link and per-child login cannot work yet.
- **A latent bug would have broken chore completion the moment push was switched on.**
  Fixed on branch `fix/call-edge-function-net-http-post`, verified locally.
- **Blocked on one thing only:** a `supabase login` so migrations can be pushed as exact
  file bytes rather than retyped.

---

## What it will look like

```
   REPO (main)                          PRODUCTION
   ───────────                          ──────────
   0001_init            ──────────────▶ applied ✓
   0002_rls             ──────────────▶ applied ✓
   0003_functions       ──────────────▶ applied ✓
   0004_function_grants ──────────────▶ applied ✓
   0005_push_hooks      ──────────────▶ applied ✓  ⚠️ contains the net_http_post bug
   0006_fk_indexes      ──────────────▶ applied ✓
   0007_sport_reps      ──────────────▶ applied ✓
   20260815_child_email_login   ✗ NOT APPLIED   ← magic link + child login dead
   20260821_fix_call_edge_fn    ✗ NOT APPLIED   ← new, on a branch

   Edge Functions
   delete-account   ✓   notify-events  ✓   send-reminders ✓
   manage-child-login  ✗ NOT DEPLOYED
```

### The bug, in one picture

```
  kid taps "done"
        │
        ▼
  insert into task_completions
        │
        ▼
  trigger task_completions_notify
        │
        ▼
  private.call_edge_function('notify-events', …)
        │
        ├── Vault secrets unset?  → return early     ← today: writes succeed
        │
        └── Vault secrets set?    → extensions.net_http_post(…)
                                         │
                                         ▼
                                   ERROR 42883: no such function
                                         │
                                         ▼
                                   trigger aborts the INSERT
                                         │
                                         ▼
                              ❌ the child cannot tick off the chore
```

Turning on notifications — the documented, expected next step — is what would have
triggered it. Same for reward redemption and parent task creation.

---

## Context / why

Vercel redeploys on merge; Supabase does not. Frontend and schema live in one repo but
ship through two pipelines, so a merged PR can sit half-live indefinitely with nothing
erroring. PRs #2 and #3 did exactly that on 2026-08-15.

## Constraints

- **Production holds real family data.** Children's names and daily routines.
- **Public repo.** Never commit `.env*`. Decide whether public is still right.
- **Migrations are pushed as files, never retyped** — 678 lines of RLS is not something
  to transcribe by hand.
- **Never run a seed/reset against production.**
- Magic-link login means **no email delivery = nobody can log in.** SMTP is now
  load-bearing, not a nicety.

---

## Work split

### ▶ This session

- [x] **W1.** Confirm the two codebases are unrelated; pick this one as canonical
- [x] **W2.** Archive the Next.js prototype to a private repo (12 commits, no secrets)
- [x] **W3.** Verify the live deployment (200s; CSP, HSTS, X-Frame-Options, nosniff)
- [x] **W4.** Find the Supabase project; confirm only one exists
- [x] **W5.** Identify the unapplied migration + undeployed Edge Function
- [x] **W6.** Prove the migration is safe: 0 violations on all 12 composite FKs in
      production; full local rehearsal applies cleanly; pgTAP 9/9
- [x] **W7.** Find and fix the `net_http_post` bug; prove it locally
- [x] **W8.** Port the original spec to `docs/original-spec.md`
- [x] **W9.** Document the deploy gap in `docs/deployment.md`
- [x] **W10.** `supabase login`
- [x] **W11.** `supabase db push` — both migrations applied; ledger repaired first
      (the `0001`–`0007` files had been applied via the SQL editor, so the ledger
      recorded generated timestamps that matched no filename)
- [x] **W12.** `supabase functions deploy manage-child-login` — ACTIVE
- [ ] **W13.** Push the branch / open a PR (needs the owner's go-ahead)

### ▷ Next session(s)

- [ ] **N1.** Custom SMTP — magic link makes email load-bearing
- [ ] **N2.** Enable leaked-password protection (one toggle)
- [ ] **N3.** Review `accept_invite` — `SECURITY DEFINER`, callable by `authenticated`,
      and it is the family-joining door
- [ ] **N4.** Configure push properly (`docs/push-setup.md`) — now safe, W11 is done
- [ ] **N5.** Verify push end-to-end on a real device; iOS needs Add to Home Screen first
- [ ] **N6.** Delete the 5 merged branches on GitHub
- [ ] **N7.** Delete `~/Desktop/kids-tasks` (archived and pushed; safe to remove)
- [ ] **N8.** Decide whether the repo stays public
- [ ] **N9.** Port the prototype's mock-free domain tests + RLS suite to this schema

---

## Reuse

| Need | Where |
| --- | --- |
| Deploy steps incl. the post-merge gap | `docs/deployment.md` |
| Push setup (**do W11 first**) | `docs/push-setup.md` |
| Original requirements | `docs/original-spec.md` |
| DB security tests | `supabase/tests/database/child_login_security.test.sql` |
| Archived prototype | `github.com/Elizabeth1979/kidtasks-nextjs-prototype` (private) |

## Verification

Local, 2026-08-21 — all 9 migrations:

```
supabase db reset   → all 9 applied, no errors
supabase db lint    → "No schema errors found"   (previously: net_http_post missing)
supabase test db    → Files=1, Tests=9, Result: PASS
call_edge_function with secrets set  → succeeds
extensions.net_http_post(...)        → still errors (proves the bug was real)
```

Production, read-only checks:

```
12 composite FK candidates → 0 violations
private.current_account_type / current_child_id / account_type enum → absent
policies = 18 (the pre-migration set)
vault secrets = none · cron jobs = none · push_subscriptions = 0
```

**Done when** a kid can log in with their own account and a reminder reaches their phone.
