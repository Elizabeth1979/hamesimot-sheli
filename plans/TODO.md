# Workspace TODO — KidTasks

> Full plan: [`../PLAN.md`](../PLAN.md)

## ⛔ RESUME HERE — one owner action unblocks everything

Run this, then tell me:

```bash
supabase login
```

Then I can finish W11–W12: `supabase db push` (two pending migrations) and
`supabase functions deploy manage-child-login`.

**Why I am not doing it:** `supabase login` is an authentication flow, and migrations
should be pushed as exact file bytes — 678 lines of RLS is not something to retype.

## Pending against production

- [ ] `20260815164345_child_email_login.sql` — **not applied**; magic link + per-child
      login cannot work without it. Verified safe: 0 FK violations, clean local rehearsal.
- [ ] `20260821193500_fix_call_edge_function.sql` — **new**, on branch
      `fix/call-edge-function-net-http-post`. Prevents chore completion breaking the
      moment push is enabled.
- [ ] `manage-child-login` Edge Function — **not deployed**.
- [ ] Push branch / open PR — needs the owner's go-ahead (public repo).

## Then

- [ ] Custom SMTP (magic link makes email load-bearing)
- [ ] Leaked-password protection toggle
- [ ] Review `accept_invite` (SECURITY DEFINER, family-joining door)
- [ ] Configure push per `docs/push-setup.md` — **only after the migrations land**
- [ ] Delete 5 merged branches; delete `~/Desktop/kids-tasks`; decide on repo visibility
- [ ] Port the prototype's mock-free domain tests + RLS suite

## Standing rules

- Vercel redeploys on merge; **Supabase does not**. After any PR touching
  `supabase/`, run `db push` and `functions deploy`.
- Production holds real family data. Never seed or reset it.
- Public repo — never commit `.env*`.
- Migrations get pushed as files, never transcribed.
