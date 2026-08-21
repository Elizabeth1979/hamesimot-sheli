# Workspace TODO — KidTasks

> Full plan: [`../PLAN.md`](../PLAN.md)

## ✅ Production is now in sync with the repo (2026-08-21)

Migration ledger is exactly the 9 repo migrations — no orphans:
`0001`–`0007`, `20260815164345_child_email_login`, `20260821193500_fix_call_edge_function`.

Verified in production after the push:

| check | before | after |
| --- | --- | --- |
| `private.current_account_type` / `current_child_id` | absent | **present** |
| `public.account_type` enum | absent | **present** |
| RLS policies | 18 | **42** |
| `children.login_email`, `profiles.account_type` | absent | **present** |
| `account_deletion_jobs` table | absent | **present** |
| `create_family_with_children` | absent | **present** |
| composite `(id, family_id)` FKs | 0 | **13** |
| `call_edge_function` target | `extensions.net_http_post` ❌ | **`net.http_post`** ✅ |
| Edge Functions | 3 deployed | **4 — `manage-child-login` added** |

Data intact throughout: 1 family, 2 children, 2 profiles, 13 tasks, 5 completions.
Both parent profiles backfilled to `account_type='parent'`, `child_id` null, each seeing
2 children — neither lost access under the new policies.

## ⛔ RESUME HERE — three owner actions left

Everything else is done. These three need an account or a credential I must not handle.

### 1. Leaked-password protection (1 click)
Dashboard → Authentication → Password settings → enable "Prevent use of leaked passwords".
https://supabase.com/dashboard/project/xxcgibaqhedwjrslmubv/auth/providers

### 2. Web Push
VAPID keys are generated at `~/vapid-keys.txt` (mode 600, subject
`mailto:el.patrick79@gmail.com`). Remaining:
- [ ] `supabase secrets set` all **three** VAPID vars (the Edge Functions read all three)
- [ ] Add `VITE_VAPID_PUBLIC_KEY` to Vercel, then redeploy
- [ ] `vault.create_secret(<SERVICE_ROLE_KEY>, 'service_role_key')` and `project_url`
- [ ] `cron.schedule('kidtasks-reminders', '*/5 * * * *', ...)`
- [ ] Verify on a real device — iOS needs Add to Home Screen first
- [ ] Delete `~/vapid-keys.txt` once the secrets are set

### 3. Custom SMTP (Resend)
**Blocker to be aware of:** Resend's free sandbox only delivers to the account owner's
own address. Sending magic links to *friends* requires a verified domain (~$10/yr) —
or Gmail SMTP, which reaches anyone but has low limits and weaker deliverability.

## Done 2026-08-21

- [x] Both pending migrations applied and verified in production (18 → 42 policies)
- [x] `manage-child-login` Edge Function deployed
- [x] `call_edge_function` fixed to `net.http_post` (PR #6)
- [x] VAPID generator script fixed — it printed a command setting only 2 of 3 secrets
- [x] `accept_invite` reviewed — **secure by design**, the advisory is a false positive
      (192-bit token, SHA-256 stored, single-use, 7-day expiry, Referrer-Policy set)
- [x] All 5 merged branches deleted — repo is just `main`
- [x] `~/Desktop/kids-tasks` deleted (archived to `kidtasks-nextjs-prototype`, private);
      237 MB of orphaned Docker volumes reclaimed

## Not an issue

- `account_deletion_jobs` has RLS on with no policy. **Intentional** — service-role only;
  the migration revokes all browser-role access deliberately.

## Standing rules

- Vercel redeploys on merge; **Supabase does not**. After any PR touching `supabase/`,
  run `db push` and `functions deploy`, then check `migration list --linked`.
- Apply schema with `db push`, **never the SQL editor** — that is what desynced the
  ledger and let two PRs ship half-live for six days.
- Production holds real family data. Never seed or reset it.
- Public repo — never commit `.env*`.
