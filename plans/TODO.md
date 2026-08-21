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

## ⛔ RESUME HERE

- [ ] **Confirm in the app** that login and the parent dashboard still behave — 18 → 42
      policies is a large change and only a real session proves it. *(Owner: open the app.)*
- [ ] **Push `fix/call-edge-function-net-http-post`** — 3 commits sit locally, unpushed.
      Needs a go-ahead: the repo is public.
- [ ] **Custom SMTP.** Magic-link login is now live, so no email = nobody can log in.
- [ ] **Enable leaked-password protection** (one toggle in Auth settings).
- [ ] **Review `accept_invite`** — `SECURITY DEFINER`, callable by `authenticated`,
      and it is the family-joining door. 7 other such RPCs are the intended write path.
- [ ] **Configure push** per `docs/push-setup.md` — now safe; the bug that would have
      broken chore completion is fixed in production.
- [ ] Verify push end-to-end on a real device (iOS: Add to Home Screen first).
- [ ] Delete the 5 merged branches on GitHub.
- [ ] Delete `~/Desktop/kids-tasks` — archived to `kidtasks-nextjs-prototype` (private).
- [ ] Decide whether the repo stays public.
- [ ] Port the prototype's mock-free domain tests + RLS suite.

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
